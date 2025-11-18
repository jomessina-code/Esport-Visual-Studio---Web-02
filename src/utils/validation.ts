
import type { EsportPromptOptions, UniversePreset, GraphicStyle } from '../types';

/**
 * Définit les conflits thématiques forts entre les styles graphiques.
 * La clé est le style d'un univers, la valeur est une liste de styles manuels qui entrent en conflit.
 */
const styleConflicts: { [key in GraphicStyle]?: GraphicStyle[] } = {
    'Minimal Sportif': ['Fantasy Magique', 'Style manga explosif', 'Cyberpunk / Néon'],
    'Fantasy Magique': ['Minimal Sportif', 'Cyberpunk / Néon', '3D Réaliste'],
    'Cyberpunk / Néon': ['Fantasy Magique', 'Minimal Sportif'],
    'Style manga explosif': ['Minimal Sportif', '3D Réaliste'],
    '3D Réaliste': ['Fantasy Magique', 'Style manga explosif'],
};


/**
 * Validates the prompt options to find logical contradictions.
 * @param options The current prompt options selected by the user.
 * @param allPresets All available universe presets to check for conflicts.
 * @returns An array of string error messages. Returns an empty array if no contradictions are found.
 */
export const validatePromptOptions = (options: EsportPromptOptions, allPresets: UniversePreset[]): string[] => {
  const errors: string[] = [];
  const descriptionText = options.visualElementDescriptions.join(' ').toLowerCase();

  // Contradiction 1: Immersive background with a subject description.
  if (options.visualElements === 'Fond immersif' && options.visualElementDescriptions.length > 0) {
    errors.push("Le sujet principal est 'Fond Immersif', mais une description de sujet a été fournie. Veuillez retirer la description ou changer le type de sujet.");
  }

  // Contradiction 2: Transparent background with immersive background.
  if (options.visualElements === 'Fond immersif' && options.transparentBackground) {
    errors.push("Le fond transparent n'est pas compatible avec le sujet 'Fond Immersif'. Un fond transparent sert à isoler un sujet.");
  }

  // Contradiction 3: Character shot selected for a non-character subject.
  const isCharacterSubject = options.visualElements === "Personnage central" || options.visualElements === "Duo de joueurs";
  if (options.characterShot && !isCharacterSubject) {
      errors.push("Un 'Plan du personnage' est sélectionné, mais le sujet n'est pas un personnage. Cette option sera ignorée, mais il est recommandé de la désactiver.");
  }
  
  // Contradiction 4: Subject size set to 0% but the subject type is not immersive background.
  const isSizedElement = options.visualElements === "Personnage central" ||
                         options.visualElements === "Duo de joueurs" ||
                         options.visualElements === "Logo ou trophée";
  if (isSizedElement && options.elementSize === 0) {
      errors.push("La taille du sujet est réglée sur 0%, ce qui équivaut à un 'Fond seul'. Veuillez utiliser le type de sujet 'Fond Immersif' pour plus de clarté.");
  }

  // Contradiction 5: Sujet 'Logo ou Trophée' avec une description de personnage.
  if (options.visualElements === 'Logo ou trophée' && options.visualElementDescriptions.length > 0) {
    const characterKeywords = ['personnage', 'joueur', 'homme', 'femme', 'guerrier', 'mage', 'soldat', 'duo', 'joueuse', 'héros', 'héroïne'];
    if (characterKeywords.some(keyword => descriptionText.includes(keyword))) {
      errors.push("Le sujet est 'Logo ou Trophée', mais sa description semble contenir un personnage. Pour de meilleurs résultats, décrivez uniquement l'objet.");
    }
  }
  
  // Contradiction 6: Conflit thématique entre l'univers et le style graphique manuel.
  if (options.universes.length === 1) {
      const selectedPreset = allPresets.find(p => p.id === options.universes[0]);
      if (selectedPreset) {
          const presetStyle = selectedPreset.style;
          const userStyle = options.graphicStyle;
          const conflictingStyles = styleConflicts[presetStyle];
          if (userStyle !== presetStyle && conflictingStyles && conflictingStyles.includes(userStyle)) {
              errors.push(`Le style '${userStyle}' est en fort conflit thématique avec l'univers '${selectedPreset.label}' (style: '${presetStyle}'). Envisagez d'aligner le style ou de ne pas sélectionner d'univers pour un mélange créatif.`);
          }
      }
  }

  // Contradiction 8: High complexity
  const subjectCount = (descriptionText.match(/ et /g) || []).length + (descriptionText ? 1 : 0);
  if (subjectCount > 2) {
      errors.push(`Votre description contient ${subjectCount} sujets. Une telle complexité peut entraîner un échec de la génération. Essayez de vous concentrer sur 1 ou 2 éléments principaux.`);
  }

  return errors;
};