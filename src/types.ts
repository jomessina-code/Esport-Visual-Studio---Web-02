import * as React from "react";

export type GameType = "MOBA" | "FPS" | "Combat" | "Battle Royale" | "Sport" | "Multi-genre";
export type GraphicStyle = "Cyberpunk / Néon" | "Fantasy Magique" | "3D Réaliste" | "Style manga explosif" | "Minimal Sportif";
export type Ambiance = "Dramatique / sombre" | "Énergique / colorée" | "Tech / futuriste" | "Street / urbaine" | "Épique / Légendaire" | "Lumineuse / Compétitive" | "";
export type VisualElements = "Personnage central" | "Logo ou trophée" | "Duo de joueurs" | "Fond immersif";
export type Language = "français" | "anglais";
export type CharacterShot = "plan_large" | "plan_americain" | "plan_mi_corps" | "plan_rapproche" | "gros_plan" | "plan_detail" | "";

export type Format = 
  "A3 / A2 (Vertical)" | 
  "4:5 (Vertical)" | 
  "1:1 (Carré)" | 
  "16:9 (Paysage)" |
  "9:16 (Story)" |
  "3:1 (Bannière)";

export type UniverseId = "smashverse" | "arenaFPS" | "epicLegends" | "stadiumCup" | "digitalHeroes" | string;

export interface UniversePreset {
  id: UniverseId;
  label: string;
  description: string;
  gameType: GameType;
  style: GraphicStyle;
  ambiance: Ambiance;
  elements: VisualElements;
  keywords: string[];
  colorPalette: string[];
  influenceWeight: number;
  dominant: boolean;
  isCustom?: boolean;
}

export interface InspirationImage {
  base64: string;
  mimeType: string;
}

export interface SavedSubject {
  id: string;
  description: string;
}

export interface EsportPromptOptions {
  gameType: GameType;
  graphicStyle: GraphicStyle;
  ambiance: Ambiance;
  visualElements: VisualElements;
  elementSize?: number;
  format: Format;
  effectsIntensity: number;
  language: Language;
  customPrompt: string;
  inspirationImage: InspirationImage | null;
  // Champs événementiels supprimés ici car gérés uniquement en post-prod manuelle désormais
  eventName: string; // Gardés pour compatibilité temporaire si besoin, mais non utilisés dans le prompt IA
  baseline: string;
  eventLocation: string;
  eventDate: string;
  textLock: boolean;
  reservePartnerZone: boolean;
  partnerZoneHeight: number;
  partnerZonePosition: 'bottom' | 'top';
  highResolution: boolean;
  hideText: false;
  transparentBackground: boolean;
  universes: UniverseId[];
  visualElementDescriptions: string[];
  characterShot?: CharacterShot;
}

export interface QualityCheckResults {
  resolution: boolean;
  ratio: boolean;
  margins: boolean;
  text: boolean;
}

export interface TextStyle {
  fontFamily: string;
  color: string;
  effect: string;
}

export interface ManualTextLayer {
  id: string;
  text: string;
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
  fontSize: number; // relative unit (percentage of image height)
  fontFamily: string;
  color: string;
  isVisible: boolean;
  type: 'eventName' | 'baseline' | 'eventLocation' | 'eventDate' | 'custom';
  effect?: 'none' | 'shadow' | 'outline' | 'neon';
}

export interface PartnerLogo {
  id: string;
  src: string; // base64 data URL
  name: string;
  x: number; // percentage (0-100) relative to its container
  y: number; // percentage (0-100) relative to its container
  width: number; // percentage (2-100) relative to its container
  height: number; // auto, based on aspect ratio
  aspectRatio: number;
  isVisible: boolean;
  container: 'zone' | 'canvas';
}

export interface PartnerZoneConfig {
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
  width: number; // percentage (10-100)
  height: number; // percentage (5-100)
  opacity: number; // 0-1
  isVisible: boolean; // Controls visibility of the zone background/handles
  backgroundColor: string;
  borderRadius: number; // As a percentage of the zone's height
  // New styling options
  borderWidth?: number; // in pixels
  borderColor?: string;
  shadowBlur?: number; // in pixels for glow effect
  shadowColor?: string;
  shadowSpread?: number; // in pixels for glow effect
}

export interface GenerationHistoryItem {
  id: string;
  timestamp: number;
  imageUrl: string;
  masterImageNoText?: string;
  options: EsportPromptOptions;
  prompt: string;
  qualityCheckResults: QualityCheckResults;
  manualTextLayers?: ManualTextLayer[]; // Sauvegarde des calques manuels
  partnerZone?: PartnerZoneConfig;
  partnerLogos?: PartnerLogo[];
}

export type TextBlock = 'eventName' | 'baseline' | 'eventLocation' | 'eventDate';

export type TextConfig = {
  [key in TextBlock]: boolean;
};

export interface CropArea {
  x?: number; // Horizontal start position as a percentage (0.0 to 1.0)
  y?: number; // Vertical start position as a percentage (0.0 to 1.0)
}

export interface StoryConfig {
    scale: number;
    x: number; // Offset in pixels from center
    y: number; // Offset in pixels from center
}

export interface AdaptationRequest {
  format: Format;
  textConfig: TextConfig;
  cropArea?: CropArea;
  storyConfig?: StoryConfig;
}

export interface DerivedImage {
  format: Format;
  imageUrl: string | null;
  isGenerating: boolean;
  textConfig?: TextConfig;
  cropArea?: CropArea;
  manualTextLayers?: ManualTextLayer[];
  partnerZone?: PartnerZoneConfig;
  partnerLogos?: PartnerLogo[];
}

export type ChatMessageSender = 'user' | 'assistant';

export interface ChatMessage {
  sender: ChatMessageSender;
  text: string;
}

export interface PromptChangeSummary {
  kept: string[];
  changed: string[];
}

export interface TextOverlayConfig {
  layers: ManualTextLayer[];
}

// --- User & Credits System Types ---

export interface PurchaseHistoryItem {
  id: string;
  date: number;
  packName: string;
  creditsAdded: number;
  amount: string;
  stripePaymentId: string; // Mocked for now
}

export interface UniverseHistoryItem {
  id: string;
  date: number;
  preset: Omit<UniversePreset, 'id' | 'isCustom' | 'dominant'>;
}

export interface VisualsHistoryItem {
  historyId: string; // Corresponds to GenerationHistoryItem id in IndexedDB
  creditsSpent: number;
  date: number;
}


export interface CurrentUser {
  email: string;
  pseudo: string;
  credits: number;
  universesHistory: UniverseHistoryItem[];
  visualsHistory: VisualsHistoryItem[];
  purchasesHistory: PurchaseHistoryItem[];
}

export interface DraggableTextOverlayProps {
  layers: ManualTextLayer[];
  selectedLayerId: string | null;
  onLayerSelect: (id: string | null) => void;
  onLayerUpdate: (id: string, updates: Partial<ManualTextLayer>) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  readOnly?: boolean;
  referenceHeight?: number;
  partnerZone: PartnerZoneConfig | null;
  partnerLogos: PartnerLogo[];
  onPartnerZoneUpdate: React.Dispatch<React.SetStateAction<PartnerZoneConfig | null>>;
  onPartnerLogosUpdate: React.Dispatch<React.SetStateAction<PartnerLogo[]>>;
  isExporting?: boolean;
}

// Props pour ImageEditorPanel
export interface ImageEditorPanelProps {
  originalImageBase64: string;
  originalImageMimeType: string;
  onClose: () => void;
  currentUser: CurrentUser | null;
  onAttemptAction: (cost: number, action: () => void) => void;
  saveCurrentUser: (user: CurrentUser | null) => void;
  onLogout: () => void;
  onOpenAuthModal: (mode: 'login' | 'signup') => void;
  onOpenAccountModal: () => void;
  onOpenPricingModal: () => void;
  onImageValidated: (newImageBase64: string, newImageMimeType: string, editPrompt: string) => void;
}