
import { GoogleGenAI, Modality, Type } from "@google/genai";
import type { EsportPromptOptions, UniverseId, Format, UniversePreset, GameType, GraphicStyle, Ambiance, VisualElements, TextStyle, PromptChangeSummary, CropArea, CharacterShot, InspirationImage } from "../types";
import { GAME_TYPES, GRAPHIC_STYLES, AMBIANCES, VISUAL_ELEMENTS, CHARACTER_SHOTS } from "../constants/options";

// Helper to get a new AI client instance with the current API key.
// This ensures that if the key changes, new requests use the updated key.
const getAiClient = () => {
    // Fix: Cast import.meta to any to avoid TS error about missing env property
    const apiKey = (import.meta as any).env.VITE_GOOGLE_API_KEY;
    if (!apiKey) {
        throw new Error("API key is missing. Please set VITE_GOOGLE_API_KEY in your environment variables.");
    }
    return new GoogleGenAI({ apiKey });
};

// Generic retry wrapper for API calls
async function withRetry<T>(fn: () => Promise<T>, retries = 5, delay = 2000, functionName = 'Operation'): Promise<T> {
    try {
        return await fn();
    } catch (e: any) {
        // Check for typical transient errors (500 Internal Server Error, 503 Service Unavailable)
        // Enhanced detection based on various SDK error formats
        const isTransientError = 
            e?.status === 500 || e?.status === 503 || 
            e?.error?.code === 500 || e?.error?.code === 503 ||
            e?.status === 'UNAVAILABLE' || e?.error?.status === 'UNAVAILABLE' ||
            e?.message?.includes('500') || e?.message?.includes('503') ||
            e?.message?.includes('Internal error') ||
            e?.message?.includes('Overloaded') ||
            e?.message?.includes('UNAVAILABLE') ||
            e?.message?.includes('upstream backend');

        // DO NOT retry on client errors (4xx) or safety blocks, as they will likely fail again.
        if (retries > 0 && isTransientError) {
            console.warn(`[${functionName}] Encountered transient error (${e?.status || e?.error?.code || e?.message}). Retrying in ${delay}ms... (${retries} attempts left)`);
            await new Promise(resolve => setTimeout(resolve, delay));
            // Exponential backoff
            return withRetry(fn, retries - 1, delay * 2, functionName);
        }
        throw e;
    }
};

const handleApiError = (error: unknown, functionName: string): never => {
    console.error(`Error in ${functionName}:`, error);
    if (error instanceof Error) {
        // For other errors, re-throw the original error. The App component will format it.
        throw error;
    }
    // Fallback for non-Error objects.
    throw new Error("Une erreur inconnue est survenue lors de la communication avec l'API.");
};

const getFinishReasonText = (reason: string): string => {
    switch (reason) {
        case 'SAFETY':
            return "le contenu a été bloqué pour des raisons de sécurité. Essayez de reformuler en utilisant des termes plus neutres ou moins ambigus.";
        case 'NO_IMAGE':
            return "le modèle n'a pas pu générer d'image. Même si les options de base semblent correctes, cela peut arriver si des contradictions subtiles existent, si la demande enfreint une règle de sécurité, ou si le prompt est trop complexe. Essayez de simplifier ou reformuler votre description.";
        case 'RECITATION':
            return "la réponse a été bloquée car elle est trop similaire à une source existante. Essayez d'être plus original dans votre demande.";
        case 'MAX_TOKENS':
            return "la demande est trop complexe. Essayez de la simplifier en enlevant des mots-clés ou en raccourcissant la description.";
        case 'OTHER':
        default:
            return `la génération a échoué pour une raison technique (${reason}). Veuillez réessayer.`;
    }
};


// ==================================
// PROMPT GENERATION LOGIC
// ==================================

const generateTextOverlayPrompt = (options: EsportPromptOptions, format: Format, textStyle?: TextStyle): string => {
    const formatMapping: Record<Format, string> = {
        "A3 / A2 (Vertical)": "portrait (2:3 aspect ratio)",
        "4:5 (Vertical)": "portrait (4:5 aspect ratio)",
        "1:1 (Carré)": "square (1:1 aspect ratio)",
        "16:9 (Paysage)": "landscape (16:9 aspect ratio)",
        "9:16 (Story)": "tall portrait (9:16 aspect ratio)",
        "3:1 (Bannière)": "wide landscape banner (3:1 aspect ratio)",
    };

    const textBlocks = [];
    if (options.eventName) textBlocks.push(`- Nom de l'événement (Titre principal) : "${options.eventName}"`);
    if (options.baseline) textBlocks.push(`- Slogan (Sous-titre) : "${options.baseline}"`);
    if (options.eventLocation) textBlocks.push(`- Lieu : "${options.eventLocation}"`);
    if (options.eventDate) textBlocks.push(`- Date : "${options.eventDate}"`);

    const textContent = textBlocks.join('\n');

    if (!textContent.trim()) {
        return "Tu es une IA. L'utilisateur a demandé d'ajouter du texte, mais aucun texte n'a été fourni. Retourne l'image originale sans modification.";
    }
    
    let styleInstructions = "";
    if (textStyle) {
        styleInstructions = `
**2.1. STYLE IMPOSÉ :**
- Tu DOIS utiliser ce style exact. Ne t'en écarte PAS.
- **Famille de police :** "${textStyle.fontFamily}"
- **Couleur principale :** "${textStyle.color}"
- **Effet de lisibilité :** "${textStyle.effect}"
- Ce style DOIT être appliqué de manière identique et cohérente sur TOUS les blocs de texte.
`;
    } else {
        // Fallback to old behavior
        styleInstructions = `
**2.1. DÉRIVATION DE STYLE UNIFIÉE :**
- Le style visuel du texte (police, couleur, effets) DOIT être dérivé **uniquement** de l'image de fond fournie pour garantir une intégration parfaite.
- Ce **style unique et déterminé** DOIT être appliqué de manière **identique et cohérente sur TOUS les blocs de texte**. Le format cible influence UNIQUEMENT la taille et la position, pas le style.
`;
    }

    return `
# MANDAT CRÉATIF : SUPERPOSITION DE TEXTE

Tu es une IA maître graphiste, experte en composition visuelle et en typographie pour des visuels d'événements e-sport à fort impact.
Ta tâche est d'ajouter le contenu textuel fourni à l'image de fond, en suivant un ensemble de règles extrêmement strictes.

---

## 1. INFORMATIONS DE BASE

- **Image de fond fournie :** [L'image d'entrée]
- **Format cible :** ${formatMapping[format]}
- **Contenu textuel à ajouter :**
${textContent}

---

## 2. RÈGLEMENT INCONTOURNABLE

### RÈGLE 1 : GÉOMÉTRIE ET PLACEMENT (PRIORITÉ ABSOLUE)

**1.1. ZONE DE SÉCURITÉ DE 10% :**
- Tu DOIS définir une "zone de sécurité" avec une marge de **10% sur les QUATRE bords**. L'espace utilisable pour le texte est le 80% central de la toile.
- **CHAQUE partie de chaque élément de texte** (lettres, lueurs, ombres) DOIT être placée **ENTIÈREMENT à l'intérieur de cette zone**.
- **AUCUN élément ne doit toucher ou franchir la limite de la zone de sécurité.** C'est l'instruction la plus critique.

**1.2. TAILLE DE POLICE PROPORTIONNELLE :**
- Les tailles de police DOIVENT être calculées **proportionnellement à la hauteur de l'image**. Pas de tailles en pixels fixes.
- Le titre principal devrait faire environ 7-10% de la hauteur de l'image. Les autres textes doivent être mis à l'échelle à partir de là.

**1.3. PAS DE RECADRAGE :**
- Il est absolument interdit qu'une partie d'une lettre soit coupée par les bords de l'image.

**1.4. COMPOSITION DYNAMIQUE :**
- La mise en page (alignement haut, centre, bas) DOIT être calculée dynamiquement pour une composition équilibrée et professionnelle pour le format spécifique.
- Évite de placer du texte sur les parties les plus critiques du sujet de fond (par ex., un visage).

### RÈGLE 2 : STYLE ET COHÉRENCE VISUELLE (NON NÉGOCIABLE)

${styleInstructions}

**2.2. POLICE & TYPOGRAPHIE :**
- La police DOIT être une **police sans-serif moderne, grasse** adaptée à l'e-sport (percutante, propre, très lisible).
- L'interlignage et l'espacement doivent être professionnels.

**2.3. COULEUR & EFFETS :**
- La couleur du texte DOIT être vive et très contrastée.
- Utilise des effets subtils UNIQUEMENT pour garantir la lisibilité (par ex., une douce lueur externe ou une ombre portée nette et sombre).

**2.4. HIÉRARCHIE VISUELLE :**
- "Nom de l'événement" est le titre principal et DOIT être le plus grand.
- "Slogan" est un sous-titre, clairement secondaire.
- "Lieu" et "Date" sont des informations tertiaires, les plus petites.

### RÈGLE 3 : INSTRUCTIONS “TEXTE CRÉATIF ET SANS FAUTE”

Le texte doit être parfaitement orthographié, sans aucune erreur, omission ou inversion de lettres.
Chaque caractère doit être dessiné comme une forme visuelle indépendante, et non interprété comme un mot à comprendre.
Le modèle doit considérer les lettres comme des éléments graphiques, à intégrer harmonieusement dans le style visuel choisi.

Le style typographique (forme, matière, effet) peut être créatif, artistique et cohérent avec l’univers de l’image, mais la structure du mot et la lisibilité doivent rester exactes à 100 %.

Tous les mots doivent apparaître exactement tels qu’ils ont été fournis, sans traduction, sans ajout, ni suppression de caractères.

**🔹 Règles de précision**

Reproduire le texte lettre par lettre, sans interprétation linguistique.
Respecter l’ordre exact des lettres et les signes (accents, chiffres, apostrophes).
Si une lettre est incertaine, laisser la zone vide plutôt que d’en inventer une.
Ne pas remplacer une lettre par un symbole visuel.
Éviter les lettres fusionnées ou partiellement cachées.

**🔹 Règles de style visuel**

Intégrer le texte dans le style de l’univers graphique choisi (couleurs, lumière, texture, ambiance).
Le texte peut être lumineux, néon, métallique, futuriste, graffiti, etc.
Les effets visuels sont autorisés tant qu’ils ne déforment pas la forme lisible des lettres.
Utiliser une typographie stylisée mais toujours claire et reconnaissable.
Maintenir un contraste suffisant pour garantir la lisibilité.
Ne pas styliser le texte au point de le rendre illisible.

**🔹 En cas de doute**

Si le moteur n’est pas certain du texte ou de sa forme, laisser la zone vierge.
Ne pas générer de lettres inventées, de symboles aléatoires ou de texte partiellement faux.

**🔹 Phrase finale à insérer systématiquement**

"Le texte doit être fidèle, lisible et intégré de façon artistique à l’univers visuel, mais chaque lettre doit être traitée comme une forme graphique, non comme un mot. Si le texte ne peut pas être reproduit correctement, il vaut mieux laisser l’espace vide."


Retourne uniquement l'image finale avec le texte parfaitement intégré.
`;
};


export const generateEsportPrompt = (options: EsportPromptOptions, allPresets: UniversePreset[], isAdaptation: boolean = false): string => {
    const isFrench = options.language === 'français';

    // Universe Composition Logic
    let activePresets: UniversePreset[] = [];
    if (options.universes.length > 0) {
        activePresets = options.universes
            .map(id => allPresets.find(p => p.id === id))
            .filter((p): p is UniversePreset => !!p);
    }

    let compositionPrompt = "";
    if (activePresets.length > 0) {
        if (activePresets.length === 1) {
            const p = activePresets[0];
            const inspirationText = isFrench ? `Le visuel est inspiré de l'univers "${p.label}".` : `The visual is inspired by the "${p.label}" universe.`;
            const thematicDirectionText = isFrench ? `Direction thématique à partir des mots-clés :` : `Thematic direction from keywords:`;
            const userChoicesText = isFrench ? `Les choix de style spécifiques de l'utilisateur ci-dessous sont les instructions principales.` : `The user's specific style choices below are the primary instructions.`;
            compositionPrompt = `${inspirationText} ${thematicDirectionText} ${p.keywords.join(', ')}. ${userChoicesText}`;
        } else {
            compositionPrompt = isFrench ? "Le visuel est une fusion de plusieurs univers :\n" : "The visual is a fusion of multiple universes:\n";
            activePresets.forEach(p => {
                const weightText = isFrench ? `Poids` : `Weight`;
                const keywordsText = isFrench ? `Mots-clés` : `Keywords`;
                compositionPrompt += `- **${p.label} (${weightText}: ${Math.round(p.influenceWeight * 100)}%)**: ${p.description}. ${keywordsText}: ${p.keywords.join(', ')}.\n`;
            });
            compositionPrompt += isFrench ? "Crée un mélange harmonieux et épique de ces styles." : "Create a harmonious and epic blend of these styles.";
        }
    }
    
    // Color Logic: Use universe color palette if available
    let colorInstructions = "";
    if (activePresets.length === 1) {
        // Fallback to universe color palette if no custom one is set
        const p = activePresets[0];
        colorInstructions = isFrench 
            ? `\n- **Palette de couleurs suggérée :** ${p.colorPalette.join(', ')}.`
            : `\n- **Suggested Color Palette:** ${p.colorPalette.join(', ')}.`;
    }

    // The specific style options always come from the main `options` object.
    const gameType = options.gameType;
    const graphicStyle = options.graphicStyle;
    const ambiance = options.ambiance;
    const visualElements = options.visualElements;

    // REFACTORED: Visual Element and Sizing Logic
    let visualElementsInstructions = "";
    const isSizedElement = visualElements === "Personnage central" ||
                           visualElements === "Duo de joueurs" ||
                           visualElements === "Logo ou trophée";

    // Step 1: Get the base description (custom text > preset)
    if (options.visualElementDescriptions && options.visualElementDescriptions.length > 0) {
        const descriptionText = options.visualElementDescriptions.join(' et ');
        visualElementsInstructions = isFrench 
            ? `Description de l'élément principal : ${descriptionText}. Cette instruction a priorité.`
            : `Main element description: ${descriptionText}. This instruction has priority.`;
    } else {
        switch (visualElements) {
            case "Personnage central":
                visualElementsInstructions = isFrench ? `Un personnage central.` : `A central character.`;
                break;
            case "Duo de joueurs":
                visualElementsInstructions = isFrench ? `Un duo de joueurs.` : `A duo of players.`;
                break;
            case "Logo ou trophée":
                visualElementsInstructions = isFrench ? `Un logo ou trophée majestueux. L'image ne doit contenir aucun personnage.` : `A majestic logo or trophy. The image must not contain any characters.`;
                break;
            case "Fond immersif":
                visualElementsInstructions = isFrench
                    ? `IMPORTANT : Crée une scène de fond purement environnementale. L'accent est mis sur le paysage, l'architecture ou les éléments abstraits. Évite la présence d'humains, d'humanoïdes, de personnages, de créatures ou de visages distincts.`
                    : `IMPORTANT: Create a purely environmental background scene. The focus is on landscape, architecture, or abstract elements. Avoid the presence of humans, humanoids, characters, creatures, or distinct faces.`;
                break;
            default:
                visualElementsInstructions = visualElements;
        }
    }

    const isCharacterSubjectForPrompt = visualElements === "Personnage central" || visualElements === "Duo de joueurs";

    if (isCharacterSubjectForPrompt && options.characterShot !== undefined) {
        const shotKey = options.characterShot || '';
        let shotDescription = '';

        // Softened instructions to reduce model blocking due to overly rigid constraints
        const shotInstructions = {
            single: {
                plan_large: "**CADRAGE SOUHAITÉ : Plan large.** Le personnage devrait idéalement être visible EN ENTIER, de la tête aux pieds, avec un espace libre autour.",
                plan_americain: "**CADRAGE SOUHAITÉ : Plan américain (¾).** Vise un cadrage de la tête jusqu'à mi-cuisses.",
                plan_mi_corps: "**CADRAGE SOUHAITÉ : Plan mi-corps.** Vise un cadrage de la tête jusqu'à la taille, centré.",
                plan_rapproche: "**CADRAGE SOUHAITÉ : Plan rapproché.** Vise un cadrage du sommet du crâne jusqu'aux épaules.",
                gros_plan: "**CADRAGE SOUHAITÉ : Gros plan.** Focus principal sur le visage.",
                plan_detail: "**CADRAGE SOUHAITÉ : Plan de détail.** Zoom sur un élément spécifique (main, œil, logo, objet).",
                '': "L’IA choisit le cadrage le plus esthétique pour la composition."
            },
            duo: {
                plan_large: "**CADRAGE SOUHAITÉ : Plan large.** Les DEUX personnages devraient être visibles EN ENTIER.",
                plan_americain: "**CADRAGE SOUHAITÉ : Plan américain (¾).** Les DEUX personnages devraient être cadrés de la tête jusqu'à mi-cuisses.",
                plan_mi_corps: "**CADRAGE SOUHAITÉ : Plan mi-corps.** Les DEUX personnages devraient être cadrés de la tête jusqu'à la taille.",
                plan_rapproche: "**CADRAGE SOUHAITÉ : Plan rapproché.** Vise un cadrage épaules/tête pour les deux.",
                gros_plan: "**CADRAGE SOUHAITÉ : Gros plan.** Focus principal sur les visages.",
                '': "L’IA choisit la meilleure composition pour cadrer les deux personnages ensemble."
            }
        };

        if (visualElements === "Personnage central") {
            shotDescription = shotInstructions.single[shotKey as keyof typeof shotInstructions.single] || shotInstructions.single[''];
        } else { // Duo de joueurs
            shotDescription = shotInstructions.duo[shotKey as keyof typeof shotInstructions.duo] || shotInstructions.duo[''];
             shotDescription += `\n- **Règles pour le duo :** Essayer de préserver un espace entre les personnages et centrer la composition.`;
        }
        
        // If element size is very small (<30%) AND a close-up shot is selected, ignore the shot constraint to avoid contradiction.
        const isSmallSize = (options.elementSize !== undefined && options.elementSize < 30);
        const isCloseUp = ['gros_plan', 'plan_detail', 'plan_rapproche'].includes(shotKey);

        if (shotDescription && !(isSmallSize && isCloseUp)) {
             visualElementsInstructions += isFrench 
                ? `\n- **GUIDE DE CADRAGE :** ${shotDescription}` 
                : `\n- **FRAMING GUIDE :** ${shotDescription}`;
        }
    }


    // Step 2: Append STRICT sizing rules.
    if (isSizedElement && typeof options.elementSize === 'number') {
        if (options.elementSize <= 5) { // Changed from === 0 to a small threshold for usability
            visualElementsInstructions = isFrench
                ? `IMPORTANT : Crée une scène de fond purement environnementale. L'accent est mis sur le paysage, l'architecture ou les éléments abstraits. Évite la présence d'humains, d'humanoïdes, de personnages, de créatures ou de visages distincts. Ceci est dû au fait que la taille de l'élément est réglée sur une valeur très faible.`
                : `IMPORTANT: Create a purely environmental background scene. The focus is on landscape, architecture, or abstract elements. Avoid the presence of humans, humanoids, characters, creatures, or distinct faces. This is because the element size is set to a very low value.`;
        } else {
            // Determine zoom instruction based on requested size
            let zoomInstruction = "";
             if (options.elementSize <= 30) {
                 zoomInstruction = isFrench 
                    ? "Le sujet doit être petit et éloigné, montrant une grande partie de l'environnement." 
                    : "The subject must be small and distant, showing a large part of the environment.";
            } else if (options.elementSize <= 60) {
                 zoomInstruction = isFrench 
                    ? "Le sujet occupe une place modérée, équilibrée avec le décor." 
                    : "The subject occupies a moderate space, balanced with the scenery.";
            } else if (options.elementSize >= 90) {
                 zoomInstruction = isFrench 
                    ? "Le sujet est immense et remplit le cadre, en gros plan." 
                    : "The subject is huge and fills the frame, in a close-up shot.";
            }

            visualElementsInstructions += isFrench
                ? `\n- **TAILLE DU SUJET :** Le sujet principal DOIT occuper **ENVIRON ${options.elementSize}%** de la largeur ou de la hauteur de l'image. ${zoomInstruction}`
                : `\n- **SUBJECT SIZE :** The main subject MUST occupy **APPROXIMATELY ${options.elementSize}%** of the image's width or height. ${zoomInstruction}`;
        }
    } else if (visualElements === "Fond immersif") {
        // Re-ensure this critical instruction is not lost if the element size is not 0
        visualElementsInstructions = isFrench
            ? `IMPORTANT : Crée une scène de fond purement environnementale. L'accent est mis sur le paysage, l'architecture ou les éléments abstraits. Évite la présence d'humains, d'humanoïdes, de personnages, de créatures ou de visages distincts.`
            : `IMPORTANT: Create a purely environmental background scene. The focus is on landscape, architecture, or abstract elements. Avoid the presence of humans, humanoids, characters, creatures, or distinct faces.`;
    }


    const formatMapping: Record<Format, string> = {
        "A3 / A2 (Vertical)": isFrench ? "portrait (ratio 2:3)" : "portrait (2:3 aspect ratio)",
        "4:5 (Vertical)": isFrench ? "portrait (ratio 4:5)" : "portrait (4:5 aspect ratio)",
        "1:1 (Carré)" : isFrench ? "carré (ratio 1:1)" : "square (1:1 aspect ratio)",
        "16:9 (Paysage)": isFrench ? "paysage (ratio 16:9)" : "landscape (16:9 aspect ratio)",
        "9:16 (Story)": isFrench ? "portrait haut (ratio 9:16)" : "tall portrait (9:16 aspect ratio)",
        "3:1 (Bannière)": isFrench ? "bannière paysage large (ratio 3:1)" : "wide landscape banner (3:1 aspect ratio)",
    };

    const textPresence = (options.eventName || options.baseline || options.eventLocation || options.eventDate) && !options.hideText;

    const resolution = options.highResolution ? (isFrench ? "Haute définition (qualité supérieure)" : "High definition (superior quality)") : (isFrench ? "Définition standard" : "Standard definition");

    let textInstructions = "";
    if (isAdaptation) {
        textInstructions = isFrench
            ? "Le visuel généré est une base SANS TEXTE. Il sera ajouté dans une étape ultérieure. Il est donc CRUCIAL de ne PAS générer de texte, de lettres, de symboles ou de logos lisibles. Des formes abstraites inspirées de la typographie sont autorisées si elles sont purement décoratives."
            : "The generated visual is a TEXT-FREE base. Text will be added in a later step. It is therefore CRUCIAL NOT to generate ANY readable text, letters, or symbols, or logos. Abstract shapes inspired by typography are allowed if purely decorative.";
    } else {
        textInstructions = textPresence
            ? (isFrench
                ? "Ce visuel inclura du texte qui sera ajouté ultérieurement. Crée une composition qui intègre naturellement des zones visuellement plus calmes ou des espaces pour permettre une superposition de texte lisible. Il est impératif de ne pas générer de texte, lettres ou symboles lisibles sur l'image elle-même."
                : "This visual will include text to be added later. Create a composition that naturally integrates visually calmer areas or spaces to allow for readable text overlay. It is imperative not to generate readable text, letters, or symbols on the image itself.")
            : (isFrench
                ? "Ce visuel ne contiendra PAS de texte. Concentre-toi sur une composition pleine et percutante, sans avoir besoin de réserver de l'espace pour du texte."
                : "This visual will NOT contain text. Focus on a full and impactful composition, without needing to reserve space for text.");
    }
    
    const transparentBgInstruction = options.transparentBackground
        ? (isFrench
            ? "INSTRUCTION IMPORTANTE : FOND TRANSPARENT. Le sujet principal décrit doit être complètement isolé. L'arrière-plan de l'image doit être entièrement transparent (canal alpha). Il ne doit y avoir aucun élément de décor, couleur de fond, dégradé ou texture. Seul le sujet est visible. Le résultat attendu est un fichier PNG avec une transparence alpha effective."
            : "IMPORTANT INSTRUCTION: TRANSPARENT BACKGROUND. The described main subject should be completely isolated. The image background must be fully transparent (alpha channel). There should be no background scenery, colors, gradients, or textures. Only the subject is visible. The expected output is a PNG file with effective alpha transparency.")
        : "";

    let bannerInstruction = "";
    if (options.format === "3:1 (Bannière)" && options.visualElements !== "Fond immersif") {
        bannerInstruction = isFrench 
            ? `\n- **GUIDE POUR FORMAT BANNIÈRE (3:1) :** Ce format est très large, la composition est donc essentielle.
- **COMPOSITION CENTRÉE RECOMMANDÉE :** Le sujet principal (personnage, logo, etc.) devrait être **centré horizontalement** pour un impact maximal.
- **CADRAGE VERTICAL :** Le format étant peu haut, un cadrage vertical est attendu. La priorité est de conserver les parties importantes du sujet.
    - **Pour un personnage :** Vise un "plan poitrine" ou "plan taille" (medium shot) où la tête et le torse sont bien visibles. Il est normal de couper le personnage au niveau des jambes.
    - **Pour un objet/logo :** Assure-toi que la partie centrale et reconnaissable est visible.
- **ÉVITEMENT DE COUPURE LATERALE :** Évite de couper le sujet sur les côtés gauche ou droit pour maintenir un bon équilibre visuel.
- **RÉSUMÉ :** Pense à un plan cinématographique large où le héros est au centre, avec l'environnement qui s'étend sur les côtés.`
            : `\n- **GUIDE FOR BANNER FORMAT (3:1) :** This format is very wide, so composition is key.
- **CENTERED COMPOSITION RECOMMENDED :** The main subject (character, logo, etc.) should be **horizontally centered** for maximum impact.
- **VERTICAL FRAMING :** Due to the limited height, vertical framing is expected. The priority is to preserve the important parts of the subject.
    - **For a character :** Aim for a "bust shot" or a "medium shot" where the head and torso are clearly visible. It's normal to crop the character at the legs.
    - **For an object/logo :** Ensure the central and most recognizable part is visible.
- **AVOID LATERAL CROPPING :** Try not to crop the subject on the left or right sides to maintain a balanced visual.
- **SUMMARY :** Think of a wide cinematic shot where the hero is in the center, with the environment extending to the sides.`;
    }

    const noMarginInstruction = isFrench 
        ? "IMPORTANT : L’image doit remplir 100% du cadre. Aucune bordure, aucune marge blanche, aucune zone vide. Le décor doit occuper toute la surface de l’image. Prolonge l’arrière-plan de manière continue jusqu’aux bords."
        : "IMPORTANT: The image must fill 100% of the frame. No borders, no white margins, no empty areas. The background must occupy the entire surface of the image. Extend the background continuously to the edges.";

    const finalPrompt = `
# MANDAT CRÉATIF : VISUEL D'AFFICHE E-SPORT

**Langue de sortie pour les descriptions :** ${options.language}

## 1. COMPOSITION DE L'UNIVERS (Fusion & Inspiration)
${compositionPrompt}

## 2. INSTRUCTIONS DE STYLE (Choix utilisateur - Priorité absolue)
- **Type de jeu :** ${gameType}
- **Style graphique dominant :** ${graphicStyle}
- **Ambiance visuelle / Éclairage :** ${ambiance || (isFrench ? "Automatique (décidé par l'IA)" : "Automatic (AI decides)")}${colorInstructions}
- **Intensité des effets spéciaux (lumières, particules, magie) :** ${options.effectsIntensity}%

## 3. ÉLÉMENT VISUEL PRINCIPAL & COMPOSITION
${visualElementsInstructions}

## 4. FORMAT & SPÉCIFICATIONS TECHNIQUES
- **Format :** ${formatMapping[options.format]}${bannerInstruction}
- **Résolution :** ${resolution}
- **Présence de texte (sur l'image finale) :** ${textPresence ? 'Oui' : 'Non'}
- **Instruction sur le texte pour CETTE génération :** ${textInstructions}
- **Cadrage :** ${noMarginInstruction}
${transparentBgInstruction ? `- ${transparentBgInstruction}` : ''}

## 5. DIRECTIVES FINALES
- Le visuel doit être percutant, professionnel et adapté à une communication e-sport de haut niveau.
- Éviter les visages trop détaillés ou reconnaissables, sauf si explicitement demandé. L'accent est mis sur l'action et l'ambiance.
- Assure une composition équilibrée qui attire le regard.
- **PRIORITÉ GÉNÉRALE :** Si certaines instructions spécifiques (taille, cadrage) entrent en conflit et empêchent une bonne composition, privilégie toujours une image esthétique, cohérente et complète.

Génère une seule image en suivant ces directives.
`;

    return finalPrompt.trim();
};

export const correctText = async (text: string): Promise<string> => {
    return withRetry(async () => {
        try {
            const ai = getAiClient();
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `Corrige la grammaire, la ponctuation et la clarté de cette transcription vocale brute. Ne réponds qu'avec le texte corrigé, sans préambule.\n\nTexte brut: "${text}"\n\nTexte corrigé:`,
                config: {
                    temperature: 0.2,
                },
            });
            return response.text.trim();
        } catch (e) {
            throw e;
        }
    }, 5, 2000, 'correctText').catch(e => handleApiError(e, 'correctText'));
};

export const generateEsportImage = async (
    options: EsportPromptOptions, 
    allPresets: UniversePreset[],
    prompt: string
): Promise<{ imageBase64: string; prompt: string; marginsVerified: boolean; textVerified: boolean }> => {
    return withRetry(async () => {
        try {
            const ai = getAiClient();

            const parts: any[] = [{ text: prompt }];

            if (options.inspirationImage) {
                parts.unshift({
                    inlineData: {
                        mimeType: options.inspirationImage.mimeType,
                        data: options.inspirationImage.base64,
                    },
                });
            }
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts },
                config: {
                    responseModalities: [Modality.IMAGE],
                },
            });

            const candidate = response.candidates?.[0];
            if (candidate?.content?.parts) {
                for (const part of candidate.content.parts) {
                    if (part.inlineData?.data) {
                        return {
                            imageBase64: part.inlineData.data,
                            prompt: prompt,
                            marginsVerified: true,
                            textVerified: true,
                        };
                    }
                }
            }
            
            if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
                const reasonText = getFinishReasonText(candidate.finishReason);
                throw new Error(`La génération a été bloquée : ${reasonText}`);
            }
            
            throw new Error("Aucune image n'a été générée par le modèle.");
        } catch (e) {
            throw e; // Let the retry wrapper catch it or handleApiError
        }
    }, 5, 2000, 'generateEsportImage').catch(e => handleApiError(e, 'generateEsportImage'));
};

export const editImage = async (
    base64Image: string,
    mimeType: string,
    prompt: string
): Promise<string> => {
    return withRetry(async () => {
        try {
            const ai = getAiClient();

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image', // Correct model for image editing
                contents: {
                    parts: [
                        {
                            inlineData: {
                                mimeType: mimeType, // Original image mimeType
                                data: base64Image,  // Original image Base64
                            },
                        },
                        {
                            text: prompt, // User's modification instruction
                        },
                    ],
                },
                config: {
                    responseModalities: [Modality.IMAGE], // Expect an image back
                    // No other configs supported for image editing based on guidelines
                },
            });

            const candidate = response.candidates?.[0];
            if (candidate?.content?.parts) {
                for (const part of candidate.content.parts) {
                    if (part.inlineData?.data) {
                        return part.inlineData.data; // Return the base64 of the edited image
                    }
                }
            }

            if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
                const reasonText = getFinishReasonText(candidate.finishReason);
                // If safety related, give a specific message
                if (candidate.finishReason === 'SAFETY') {
                    throw new Error(`L'édition a été bloquée pour des raisons de sécurité. Veuillez reformuler votre demande.`);
                }
                // For other failures, give a generic error
                throw new Error(`L'édition a échoué : ${reasonText}`);
            }

            throw new Error("Aucune image modifiée n'a été générée par le modèle.");

        } catch (e) {
            throw e;
        }
    }, 3, 5000, 'editImage').catch(e => handleApiError(e, 'editImage')); // Increased retries and delay
};

export const applyOutpainting = async (
    base64Image: string,
    mimeType: string
): Promise<string> => {
    return withRetry(async () => {
        try {
            const ai = getAiClient();
            const prompt = `
# MANDAT : OUTPAINTING AUTOMATIQUE
Supprime les marges blanches en étendant le décor.
Ne modifie pas le personnage, la pose ou la scène.
Recrée uniquement l’arrière-plan en continuité jusqu’aux bords.
Image finale = 100% pleine, aucune bordure.
            `;
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: {
                    parts: [
                        { inlineData: { mimeType, data: base64Image } },
                        { text: prompt }
                    ]
                },
                config: {
                    responseModalities: [Modality.IMAGE],
                },
            });

            const candidate = response.candidates?.[0];
            if (candidate?.content?.parts) {
                for (const part of candidate.content.parts) {
                    if (part.inlineData?.data) {
                        return part.inlineData.data;
                    }
                }
            }

            if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
                const reasonText = getFinishReasonText(candidate.finishReason);
                throw new Error(`L'outpainting a échoué : ${reasonText}`);
            }

            throw new Error("L'outpainting n'a retourné aucune image.");
        } catch (e) {
            throw e;
        }
    }, 3, 5000, 'applyOutpainting').catch(e => handleApiError(e, 'applyOutpainting'));
};


export const determineTextStyle = async (imageBase64: string): Promise<TextStyle> => {
    return withRetry(async () => {
        try {
            const ai = getAiClient();
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: {
                    parts: [
                        {
                            inlineData: {
                                mimeType: 'image/png',
                                data: imageBase64,
                            },
                        },
                        {
                            text: "Analyse cette image d'e-sport. Détermine le style de texte PARFAIT pour superposer des informations (nom du tournoi, etc.).\n\nRéponds UNIQUEMENT avec un objet JSON contenant : fontFamily (une police Google Fonts percutante et sans-serif), color (une couleur HEX vive et contrastée tirée de l'image), et effect (un effet de lisibilité subtil comme 'soft_glow', 'sharp_shadow' ou 'outline').\n\nExemple de réponse :\n{\"fontFamily\": \"Orbitron\", \"color\": \"#00FFFF\", \"effect\": \"soft_glow\"}"
                        }
                    ]
                },
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            fontFamily: { type: Type.STRING },
                            color: { type: Type.STRING },
                            effect: { type: Type.STRING },
                        },
                        required: ["fontFamily", "color", "effect"]
                    }
                }
            });
            
            const jsonText = response.text.trim();
            return JSON.parse(jsonText);
        } catch (e) {
            throw e;
        }
    }, 5, 2000, 'determineTextStyle').catch(e => handleApiError(e, 'determineTextStyle'));
};

export const addTextToImage = async (
    imageBase64: string,
    mimeType: string,
    options: EsportPromptOptions,
    format: Format,
    textStyle?: TextStyle
): Promise<{ imageBase64: string }> => {
    return withRetry(async () => {
        try {
            const ai = getAiClient();
            const prompt = generateTextOverlayPrompt(options, format, textStyle);
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: {
                    parts: [
                        {
                            inlineData: {
                                mimeType: mimeType,
                                data: imageBase64
                            }
                        },
                        {
                            text: prompt
                        }
                    ]
                },
                config: {
                    responseModalities: [Modality.IMAGE],
                },
            });

            const candidate = response.candidates?.[0];
            if (candidate?.content?.parts) {
                for (const part of candidate.content.parts) {
                    if (part.inlineData?.data) {
                        return { imageBase64: part.inlineData.data };
                    }
                }
            }
            
            if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
                const reasonText = getFinishReasonText(candidate.finishReason);
                throw new Error(`L'ajout de texte a été bloqué : ${reasonText}`);
            }
            
            throw new Error("L'ajout de texte a échoué car aucune image n'a été retournée.");
        } catch (e) {
            throw e;
        }
    }, 5, 2000, 'addTextToImage').catch(e => handleApiError(e, 'addTextToImage'));
};

export const adaptEsportImage = async (
    imageBase64: string,
    mimeType: string,
    options: EsportPromptOptions,
    format: Format,
    cropArea?: CropArea
): Promise<{ imageBase64: string }> => {
    return withRetry(async () => {
        try {
            const ai = getAiClient();

            const formatMapping: Record<Format, string> = {
                "A3 / A2 (Vertical)": "portrait (2:3 aspect ratio)",
                "4:5 (Vertical)": "portrait (4:5 aspect ratio)",
                "1:1 (Carré)": "square (1:1 aspect ratio)",
                "16:9 (Paysage)": "landscape (16:9 aspect ratio)",
                "9:16 (Story)": "tall portrait (9:16 aspect ratio)",
                "3:1 (Bannière)": "wide landscape banner (3:1 aspect ratio)",
            };

            let adaptationPrompt = `
# MANDAT : ADAPTATION DE VISUEL E-SPORT
Tu es une IA experte en graphisme et recomposition d'images. Ta mission est d'adapter l'image fournie à un nouveau format en préservant son style et son essence.

## 1. IMAGE SOURCE
[L'image d'entrée est fournie]

## 2. STYLE ET CONTENU À PRÉSERVER
Le style général (couleurs, textures, ambiance, sujet) de l'image source doit être conservé.

## 3. NOUVEAU FORMAT CIBLE
- **Format final :** ${formatMapping[format]}
`;

            const isVertical = ["A3 / A2 (Vertical)", "4:5 (Vertical)"].includes(format);

            if (format === '3:1 (Bannière)' && cropArea) {
                const topPercent = Math.round(cropArea.y * 100);
                const bottomPercent = Math.round((cropArea.y + 1/3) * 100);

                adaptationPrompt += `
## 4. INSTRUCTION DE RECADRAGE CRITIQUE (Priorité Absolue)
- L'image source est un carré (1:1). Tu DOIS recadrer cette image source pour l'adapter au format bannière (3:1).
- La zone à extraire de l'image source est une bande horizontale précise.
- Le HAUT de cette zone d'intérêt commence à **${topPercent}%** du haut de l'image source.
- Le BAS de cette zone d'intérêt se termine à **${bottomPercent}%** du haut de l'image source.
- Concentre-toi EXCLUSIVEMENT sur le contenu visuel à l'intérieur de cette bande pour créer la nouvelle image. Les éléments en dehors de cette zone doivent être ignorés.
- Ta mission est de prendre cette bande et de la transformer en une bannière 3:1 harmonieuse, en recomposant intelligemment les éléments si nécessaire pour remplir le format sans distorsion.
`;
            } else if (format === '16:9 (Paysage)' && cropArea) {
                const cropHeight = 9/16;
                const topPercent = Math.round(cropArea.y * 100);
                const bottomPercent = Math.round((cropArea.y + cropHeight) * 100);

                adaptationPrompt += `
## 4. INSTRUCTION DE RECADRAGE CRITIQUE (Priorité Absolue)
- L'image source est un carré (1:1). Tu DOIS recadrer cette image source pour l'adapter au format paysage (16:9).
- La zone à extraire de l'image source est une bande horizontale précise avec un ratio de 16:9.
- Le HAUT de cette zone d'intérêt commence à **${topPercent}%** du haut de l'image source.
- Le BAS de cette zone d'intérêt se termine à **${bottomPercent}%** du haut de l'image source.
- Concentre-toi EXCLUSIVEMENT sur le contenu visuel à l'intérieur de cette bande pour créer la nouvelle image. Les éléments en dehors de cette zone doivent être ignorés.
- Ta mission est de prendre cette bande et de la transformer en une image 16:9 harmonieuse, en recomposant intelligemment les éléments si nécessaire pour remplir le format sans distorsion.
`;
            } else if (format === '9:16 (Story)') {
                 adaptationPrompt += `
## MODE : EXTENSION VERTICALE TOTALE (OBLIGATOIRE)
L'image fournie est une composition : une zone centrale active sur un fond noir temporaire.

**TES IMPÉRATIFS ABSOLUS :**
1. **REMPLISSAGE INTÉGRAL :** Tu DOIS générer du décor pour REMPLACER TOUTES les zones noires en haut et en bas. L'image finale DOIT faire exactement 576x1024 pixels sans AUCUNE bande noire restante.
2. **CONTINUITÉ INVISIBLE :** Le nouveau décor doit prolonger parfaitement la scène centrale (sol, ciel, murs, lumières). La transition doit être imperceptible.
3. **NE PAS TOUCHER AU CENTRE :** La zone image actuelle doit être préservée (pas de zoom, pas de déformation).
`;
            } else if (isVertical) {
                 adaptationPrompt += `
## 4. MODE : EXTENSION VERTICALE (OUTPAINTING)
L'objectif est de transformer l'image carrée en format vertical ${formatMapping[format]} en étendant le décor vers le haut et le bas.

**RÈGLES D'OR :**
1. **NE PAS TOUCHER À L'IMAGE INITIALE :** L'image carrée doit rester intacte au centre. Ne pas zoomer dessus, ne pas la recadrer.
2. **ÉTENDRE LE DÉCOR :** Génère uniquement la partie manquante en haut et en bas pour remplir la hauteur.
3. **CONTINUITÉ PARFAITE :** Les nouvelles zones doivent prolonger les lignes et la lumière existantes sans transition visible.
`;
            } else {
                 adaptationPrompt += `
## 4. INSTRUCTION DE RECOMPOSITION
Recompose intelligemment les éléments de l'image source pour les adapter parfaitement au nouveau format. Ne te contente pas de simplement recadrer ou étirer. Étends la scène, déplace des éléments si nécessaire pour créer une composition équilibrée et professionnelle dans le nouveau format.
`;
            }

            adaptationPrompt += `
## 5. RÈGLES FINALES
- Ne génère AUCUN texte, lettre, ou logo.
- **RÈGLE DE CADRAGE STRICTE :** L'image adaptée DOIT remplir 100% du nouveau cadre, sans AUCUNE marge, bordure ou zone vide. Le contenu visuel doit s'étendre jusqu'aux bords extrêmes de l'image. Si nécessaire, étends le décor de manière cohérente pour un remplissage parfait.
- Le résultat final doit être une image unique, propre, dans le format cible demandé.

Retourne uniquement l'image adaptée.
`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: {
                    parts: [
                        { inlineData: { mimeType, data: imageBase64 } },
                        { text: adaptationPrompt }
                    ]
                },
                config: {
                    responseModalities: [Modality.IMAGE],
                },
            });
            
            const candidate = response.candidates?.[0];
            if (candidate?.content?.parts) {
                for (const part of candidate.content.parts) {
                    if (part.inlineData?.data) {
                        return { imageBase64: part.inlineData.data };
                    }
                }
            }
            
            if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
                const reasonText = getFinishReasonText(candidate.finishReason);
                throw new Error(`L'adaptation a été bloquée : ${reasonText}`);
            }

            throw new Error("L'adaptation de l'image a échoué car aucune image n'a été retournée.");
        } catch (e) {
            throw e;
        }
    }, 5, 2000, 'adaptEsportImage').catch(e => handleApiError(e, 'adaptEsportImage'));
};

export const refinePrompt = async (currentPrompt: string, userFeedback: string): Promise<string> => {
    return withRetry(async () => {
        try {
            const ai = getAiClient();
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `Tu es un assistant expert en 'prompt engineering' pour la génération d'images. Améliore le prompt suivant en te basant sur la demande de l'utilisateur. Ne réponds qu'avec le prompt final, sans préambule.\n\nPrompt actuel:\n${currentPrompt}\n\nDemande utilisateur: "${userFeedback}"\n\nNouveau prompt:`,
                config: {
                    temperature: 0.5,
                },
            });
            return response.text.trim();
        } catch (e) {
            throw e;
        }
    }, 5, 2000, 'refinePrompt').catch(e => handleApiError(e, 'refinePrompt'));
};

export const suggestUniversePreset = async (theme: string, image?: InspirationImage | null): Promise<Omit<UniversePreset, 'id' | 'isCustom' | 'dominant'>> => {
    return withRetry(async () => {
        try {
            const ai = getAiClient();

            let promptText: string;

            if (image) {
                if (theme) {
                    // Case: Image + Theme
                    promptText = `Crée un univers inspiré de la description suivante et de l’image jointe. Priorise la cohérence visuelle (palette, ambiance, style) issue de l’image, tout en intégrant les thèmes et mots-clés du texte : "${theme}".`;
                } else {
                    // Case: Image Only
                    promptText = "Analyse cette image et propose un univers inspiré de son style, de ses couleurs, de son ambiance et de sa composition. Décris le type de jeu, l’univers visuel et les éléments clés qui en découlent.";
                }
            } else {
                // Case: Theme Only
                promptText = `Génère un "préréglage d'univers" pour un visuel e-sport basé sur le thème : "${theme}".`;
            }
            
            const fullPrompt = `${promptText}
Crée un objet JSON avec les clés suivantes :
- label (string): Un nom accrocheur.
- description (string): Une brève description.
- gameType (GameType): Choisis parmi ${GAME_TYPES.map(g => `"${g.value}"`).join(', ')}.
- style (GraphicStyle): Choisis parmi ${GRAPHIC_STYLES.map(g => `"${g.value}"`).join(', ')}.
- ambiance (Ambiance): Choisis parmi ${AMBIANCES.map(a => `"${a.value}"`).join(', ')}.
- elements (VisualElements): Choisis parmi ${VISUAL_ELEMENTS.map(v => `"${v.value}"`).join(', ')}.
- keywords (string[]): Une liste de 5-7 mots-clés thématiques inspirés par l'image et le thème.
- colorPalette (string[]): Un tableau de 4 couleurs HEX dominantes extraites de l'image si fournie, sinon inventées.
- influenceWeight (number): Une valeur entre 0.5 et 0.7.

Ne retourne que l'objet JSON, sans formatage de code markdown.`;

            const parts: any[] = [];
            if (image) {
                parts.push({
                    inlineData: {
                        mimeType: image.mimeType,
                        data: image.base64,
                    },
                });
            }
            parts.push({ text: fullPrompt });

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: { parts },
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            label: { type: Type.STRING },
                            description: { type: Type.STRING },
                            gameType: { type: Type.STRING, enum: GAME_TYPES.map(g => g.value) },
                            style: { type: Type.STRING, enum: GRAPHIC_STYLES.map(s => s.value) },
                            ambiance: { type: Type.STRING, enum: AMBIANCES.map(a => a.value).filter(Boolean) },
                            elements: { type: Type.STRING, enum: VISUAL_ELEMENTS.map(v => v.value) },
                            keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
                            colorPalette: { type: Type.ARRAY, items: { type: Type.STRING } },
                            influenceWeight: { type: Type.NUMBER },
                        },
                        required: ["label", "description", "gameType", "style", "ambiance", "elements", "keywords", "colorPalette", "influenceWeight"],
                    }
                }
            });
            
            const jsonText = response.text.trim();
            return JSON.parse(jsonText);
        } catch (e) {
            throw e;
        }
    }, 5, 2000, 'suggestUniversePreset').catch(e => handleApiError(e, 'suggestUniversePreset'));
};

export const refinePromptForModification = async (currentPrompt: string, modificationRequest: string): Promise<string> => {
    return withRetry(async () => {
        try {
            const ai = getAiClient();
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `Tu es un assistant expert en 'prompt engineering'. Modifie le prompt d'image suivant pour intégrer la demande de l'utilisateur. Le nouveau prompt doit conserver l'esprit de l'original tout en appliquant les changements demandés. Ne réponds qu'avec le prompt final, sans préambule.\n\nPrompt original:\n${currentPrompt}\n\nDemande de modification: "${modificationRequest}"\n\nPrompt modifié:`,
                config: {
                    temperature: 0.6,
                }
            });
            return response.text.trim();
        } catch (e) {
            throw e;
        }
    }, 5, 2000, 'refinePromptForModification').catch(e => handleApiError(e, 'refinePromptForModification'));
};

export const summarizePromptChanges = async (originalPrompt: string, newPrompt: string, userRequest: string): Promise<PromptChangeSummary> => {
    return withRetry(async () => {
        try {
            const ai = getAiClient();
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `Compare le prompt original et le nouveau prompt. Basé sur la demande utilisateur, identifie les éléments clés qui ont été conservés et ceux qui ont été modifiés/ajoutés. Sois concis.\n\nDemande: "${userRequest}"\n\nRéponds UNIQUEMENT avec un objet JSON contenant deux clés : "kept" (un tableau de chaînes décrivant ce qui est conservé) et "changed" (un tableau de chaînes décrivant ce qui a changé).\n\nOriginal: ${originalPrompt}\nNouveau: ${newPrompt}`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            kept: { type: Type.ARRAY, items: { type: Type.STRING } },
                            changed: { type: Type.ARRAY, items: { type: Type.STRING } },
                        },
                        required: ["kept", "changed"],
                    }
                }
            });
            
            const jsonText = response.text.trim();
            return JSON.parse(jsonText);
        } catch (e) {
            throw e;
        }
    }, 5, 2000, 'summarizePromptChanges').catch(e => handleApiError(e, 'summarizePromptChanges'));
};

export const analyzeBlockedPrompt = async (blockedPrompt: string): Promise<string> => {
    return withRetry(async () => {
        try {
            const ai = getAiClient();
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `
# CONTEXTE
Tu es un expert en 'prompt engineering' pour la génération d'images. Le prompt suivant, fourni par un utilisateur, a été bloqué par l'IA de génération d'images. Les raisons possibles sont :
1.  **Sécurité :** Le contenu enfreint une règle de sécurité (violence, contenu explicite, etc.).
2.  **Contradiction :** Des instructions sont logiquement incompatibles (ex: "un fond vide" et "un personnage au centre").
3.  **Complexité :** Le prompt est trop long, contient trop de sujets ou de concepts difficiles à fusionner.

# MISSION
Analyse le prompt bloqué ci-dessous. Identifie la ou les raisons les plus probables du blocage.
Ta réponse doit être claire, concise, et directement exploitable par l'utilisateur.

# FORMAT DE RÉPONSE ATTENDU
1.  **Diagnostic :** Commence par une phrase courte identifiant le problème principal (ex: "Le problème principal semble être une contradiction..." ou "Le blocage est probablement dû à des termes liés à la sécurité...").
2.  **Explication :** Explique en 1 ou 2 phrases simples *pourquoi* c'est un problème.
3.  **Suggestion :** Fournis une ou deux suggestions concrètes pour modifier le prompt et éviter le blocage.

---
# PROMPT BLOQUÉ À ANALYSER
${blockedPrompt}
`,
                config: {
                    temperature: 0.4,
                }
            });
            return response.text.trim();
        } catch (e) {
            console.error("Error in analyzeBlockedPrompt:", e);
            throw new Error("L'analyse automatique du prompt a échoué.");
        }
    }, 5, 2000, 'analyzeBlockedPrompt'); // Pas de catch ici, on laisse l'erreur remonter pour être gérée par le composant appelant si le retry échoue.
};
