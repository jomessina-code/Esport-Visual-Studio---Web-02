

import React, { useState } from 'react';
import type { EsportPromptOptions, UniverseId, GenerationHistoryItem, UniversePreset, VisualElements, SavedSubject, CharacterShot, InspirationImage, CurrentUser } from '../../types';
import { GAME_TYPES, GRAPHIC_STYLES, AMBIANCES, VISUAL_ELEMENTS, CHARACTER_SHOTS } from '../../constants/options';
import { DECLINATION_FORMATS } from '../../constants/formats';
import SpinnerIcon from '../icons/SpinnerIcon';
import HistoryPanel from '../HistoryPanel';
import TrashIcon from '../icons/TrashIcon';
import AddPresetModal from './AddPresetModal';
import PencilIcon from '../icons/PencilIcon';
import HandshakeIcon from '../icons/HandshakeIcon';
import StarIcon from '../icons/StarIcon';
import PaintBrushIcon from '../icons/PaintBrushIcon';
import AdjustmentsIcon from '../icons/AdjustmentsIcon';
import { useVoiceToText } from '../../hooks/useVoiceToText';
import MicrophoneIcon from '../icons/MicrophoneIcon';
import SendIcon from '../icons/SendIcon';
import { SparklesIcon } from '../icons/CheckIcon';
import EyeIcon from '../icons/EyeIcon';
import ColorSwatchIcon from '../icons/ColorSwatchIcon';

interface SectionProps {
  title: string;
  icon?: React.ReactElement<{ className?: string }>;
  children: React.ReactNode;
  collapsable?: boolean;
}

const Section: React.FC<SectionProps> = ({ title, icon, children, collapsable = false }) => {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
            <h3 
                className={`text-lg font-semibold text-purple-300 mb-4 font-orbitron flex items-center gap-3 ${collapsable ? 'cursor-pointer' : ''}`}
                onClick={() => collapsable && setIsOpen(!isOpen)}
            >
                {icon && React.cloneElement(icon, { className: "w-5 h-5" })}
                <span>{title}</span>
                 {collapsable && (
                    <svg className={`w-4 h-4 ml-auto transition-transform ${isOpen ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                )}
            </h3>
            {isOpen && <div className="space-y-4">
                {children}
            </div>}
        </div>
    );
};

const Label: React.FC<{ htmlFor?: string; children: React.ReactNode }> = ({ htmlFor, children }) => (
  <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-400 mb-1">
    {children}
  </label>
);

const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
  <select {...props} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed" />
);

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className, ...props }) => (
    <input {...props} className={`w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors duration-200 ${className || ''}`} />
);

const UniverseDetailsModal: React.FC<{ preset: UniversePreset | null; onClose: () => void }> = ({ preset, onClose }) => {
  if (!preset) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in-up" onClick={onClose} role="dialog" aria-modal="true">
      <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-md p-6 border border-purple-700" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-bold text-purple-300 font-orbitron text-lg">{preset.label}</h4>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-3xl leading-none" aria-label="Fermer la description">&times;</button>
        </div>
        <p className="text-gray-300 text-sm mb-4">{preset.description}</p>
        <div className="border-t border-gray-700 pt-3 space-y-2 text-sm">
          <div className="flex justify-between items-center gap-2">
            <span className="font-semibold text-gray-400 whitespace-nowrap">Style :</span>
            <span className="text-right text-gray-200">{preset.style}</span>
          </div>
          <div className="flex justify-between items-center gap-2">
            <span className="font-semibold text-gray-400 whitespace-nowrap">Ambiance :</span>
            <span className="text-right text-gray-200">{preset.ambiance || 'Non spécifiée'}</span>
          </div>
          <div className="flex justify-between items-center gap-2">
            <span className="font-semibold text-gray-400 whitespace-nowrap">Sujet type :</span>
            <span className="text-right text-gray-200">{preset.elements}</span>
          </div>
        </div>
        <div className="mt-4">
          <p className="text-sm font-semibold text-gray-400">Mots-clés :</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {preset.keywords.map(keyword => (
              <span key={keyword} className="bg-gray-700 text-purple-300 text-xs px-2 py-1 rounded-full">
                {keyword}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};


interface ControlsPanelProps {
  options: EsportPromptOptions;
  setOptions: React.Dispatch<React.SetStateAction<EsportPromptOptions>>;
  onGenerate: () => void;
  isLoading: boolean;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  history: GenerationHistoryItem[];
  onRestoreFromHistory: (item: GenerationHistoryItem) => void;
  onDeleteHistoryItem: (itemId: string) => void;
  onUniverseToggle: (universeId: UniverseId) => void;
  onOpenPromptEditor: () => void;
  allPresets: UniversePreset[];
  onAddPreset: (presetData: Omit<UniversePreset, 'id' | 'isCustom' | 'dominant'>) => void;
  onUpdatePreset: (presetId: UniverseId, updatedData: Omit<UniversePreset, 'id' | 'isCustom' | 'dominant'>) => void;
  onDeletePreset: (presetId: UniverseId) => void;
  onSuggestPreset: (theme: string, image?: InspirationImage | null) => Promise<Omit<UniversePreset, 'id' | 'isCustom' | 'dominant'> | null>;
  isSuggestingPreset: boolean;
  onClosePanel: () => void;
  savedSubjects: SavedSubject[];
  onAddSavedSubject: (description: string) => void;
  onDeleteSavedSubject: (subjectId: string) => void;
  onSubjectToggle: (description: string) => void;
  onGoHome: () => void;
  currentUser: CurrentUser | null;
  onAttemptAction: (cost: number, action: () => void) => void;
}

const EVS_LOGO_URL = "https://i.postimg.cc/nVCRVCHb/logo-EVSV2.png";

const ControlsPanel: React.FC<ControlsPanelProps> = ({
  options,
  setOptions,
  onGenerate,
  isLoading,
  error,
  history,
  onRestoreFromHistory,
  onDeleteHistoryItem,
  onUniverseToggle,
  onOpenPromptEditor,
  allPresets,
  onAddPreset,
  onUpdatePreset,
  onDeletePreset,
  onSuggestPreset,
  isSuggestingPreset,
  onClosePanel,
  savedSubjects,
  onAddSavedSubject,
  onDeleteSavedSubject,
  onSubjectToggle,
  onGoHome,
  currentUser,
  onAttemptAction,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<UniversePreset | null>(null);
  const [visualElementInput, setVisualElementInput] = useState('');
  const [activePresetDetails, setActivePresetDetails] = useState<UniversePreset | null>(null);

  const { isRecording, isCorrecting, toggleRecording } = useVoiceToText({
    onCorrectedTranscript: (transcript: string) => {
        setVisualElementInput(transcript);
    },
    onError: (error) => {
      console.error("Voice to text error in ControlsPanel:", error);
    },
  });

  const handleToggleRecording = () => {
    if (!isRecording) {
        setVisualElementInput('');
    }
    toggleRecording();
  };

  const executeVisualElementSubmit = () => {
    const description = visualElementInput.trim();
    if (description) {
      onAddSavedSubject(description);
      onSubjectToggle(description);
      setVisualElementInput('');
    }
  };

  const handleSubjectAction = () => {
    if (isRecording) {
      toggleRecording();
    } else if (visualElementInput.trim()) {
      executeVisualElementSubmit();
    }
  };

  const handleVisualElementKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubjectAction();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const isCheckbox = type === 'checkbox';
    const isChecked = isCheckbox ? (e.target as HTMLInputElement).checked : undefined;

    if (name === 'visualElements') {
        const newVisualElement = value as VisualElements;
        setOptions(prev => {
            const isCharacter = newVisualElement === "Personnage central" || newVisualElement === "Duo de joueurs";
            let newCharacterShot = prev.characterShot;

            if (isCharacter) {
                const shotOption = CHARACTER_SHOTS.find(s => s.value === prev.characterShot);
                const subjectType: 'single' | 'duo' = newVisualElement === "Personnage central" ? 'single' : 'duo';
                if (shotOption && !shotOption.for.includes(subjectType)) {
                    newCharacterShot = "";
                }
            } else {
                newCharacterShot = "";
            }
            
            return {
                ...prev, 
                visualElements: newVisualElement, 
                visualElementDescriptions: [],
                characterShot: newCharacterShot
            };
        });
    } else {
        setOptions(prev => ({ ...prev, [name]: isCheckbox ? isChecked : value }));
    }
  };

  const handleRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOptions(prev => ({ ...prev, [e.target.name]: parseInt(e.target.value, 10) }));
  };

  const handleOpenModal = (preset: UniversePreset | null = null) => {
    onAttemptAction(0, () => { // Cost is 0 for opening, but check login
        setEditingPreset(preset);
        setIsModalOpen(true);
    });
  };
  
  const handleSavePreset = (presetData: Omit<UniversePreset, 'id' | 'isCustom' | 'dominant'>, id?: UniverseId) => {
    if (id) {
        onUpdatePreset(id, presetData);
    } else {
        onAddPreset(presetData);
    }
    setIsModalOpen(false);
  };
  
  const isSizedElement = options.visualElements === "Personnage central" ||
                         options.visualElements === "Duo de joueurs" ||
                         options.visualElements === "Logo ou trophée";

  const isCharacterSubject = options.visualElements === "Personnage central" || options.visualElements === "Duo de joueurs";
  const subjectTypeForShot = options.visualElements === 'Personnage central' ? 'single' : 'duo';
  const availableShots = CHARACTER_SHOTS.filter(shot => shot.for.includes(subjectTypeForShot));

  return (
    <>
      <div className="relative flex flex-col h-full bg-gray-800 text-gray-200">
        <header className="flex-shrink-0 p-4 flex justify-between items-center border-b border-gray-700">
          <button onClick={onGoHome} className="flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-purple-500 rounded-md -m-1 p-1">
            <img src={EVS_LOGO_URL} alt="Logo" className="h-8" />
            <h1 className="text-xl font-bold font-orbitron">Studio de Création</h1>
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          <HistoryPanel history={history} onRestore={onRestoreFromHistory} onDelete={onDeleteHistoryItem} allPresets={allPresets} />
          
          <Section title="Univers" icon={<HandshakeIcon />}>
            <p className="text-sm text-gray-400 mb-3">Sélectionne un univers</p>
            <div className="grid grid-cols-2 gap-2">
              {allPresets.map(preset => {
                const isSelected = options.universes.includes(preset.id);
                return (
                  <div key={preset.id} className="relative">
                    <button
                      onClick={() => onUniverseToggle(preset.id)}
                      className={`w-full h-full text-left p-3 rounded-lg border-2 transition-colors duration-200 ease-in-out ${isSelected ? 'bg-purple-800/50 border-purple-500' : 'bg-gray-700/50 border-gray-600 hover:bg-gray-700'}`}
                    >
                      <div>
                        <p className="font-bold text-sm text-gray-200">{preset.label}</p>
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">{preset.description}</p>
                      </div>
                    </button>
                    <div className="absolute top-1 right-1">
                        <button 
                            onClick={(e) => { e.stopPropagation(); setActivePresetDetails(preset); }} 
                            className="w-6 h-6 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700/80 transition-colors" 
                            aria-label={`Détails pour ${preset.label}`}
                        >
                            <EyeIcon className="w-4 h-4" />
                        </button>
                    </div>
                    {preset.isCustom && (
                        <div className="absolute bottom-1 right-1 flex items-center gap-1">
                            <button onClick={() => handleOpenModal(preset)} className="w-6 h-6 bg-gray-800/80 rounded-full flex items-center justify-center text-gray-300 hover:text-white hover:bg-blue-600"><PencilIcon className="w-3 h-3" /></button>
                            <button onClick={() => onDeletePreset(preset.id)} className="w-6 h-6 bg-gray-800/80 rounded-full flex items-center justify-center text-gray-300 hover:text-white hover:bg-red-600"><TrashIcon className="w-3 h-3"/></button>
                        </div>
                    )}
                  </div>
                )
              })}
            </div>
            <button onClick={() => handleOpenModal()} className="w-full mt-2 p-2 bg-purple-600/20 text-purple-300 rounded-lg hover:bg-purple-600/40 transition">
              + Crée un univers
            </button>
          </Section>

          <Section title="Sujet principal" icon={<StarIcon />}>
            <div>
                <Label htmlFor="visualElements">Type</Label>
                <Select id="visualElements" name="visualElements" value={options.visualElements} onChange={handleInputChange}>
                    {VISUAL_ELEMENTS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </Select>
            </div>
            
            {savedSubjects.length > 0 && (
              <div className="mt-4 space-y-2">
                <Label>Sujets enregistrés</Label>
                <div className="grid grid-cols-2 gap-2">
                  {savedSubjects.map(subject => {
                    const isSelected = options.visualElementDescriptions.includes(subject.description);
                    return (
                        <div key={subject.id} className="relative">
                            <button
                                onClick={() => onSubjectToggle(subject.description)}
                                className={`w-full h-full text-left p-3 rounded-lg border-2 transition-colors duration-200 ease-in-out ${isSelected ? 'bg-purple-800/50 border-purple-500' : 'bg-gray-700/50 border-gray-600 hover:bg-gray-700'}`}
                            >
                                <p className="text-sm text-gray-200 line-clamp-3">{subject.description}</p>
                            </button>
                            <div className="absolute bottom-1 right-1 flex items-center gap-1">
                                <button onClick={(e) => { e.stopPropagation(); onDeleteSavedSubject(subject.id); }} className="w-6 h-6 bg-gray-800/80 rounded-full flex items-center justify-center text-gray-300 hover:text-white hover:bg-red-600">
                                    <TrashIcon className="w-3 h-3"/>
                                </button>
                            </div>
                        </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="mt-4 p-4 bg-gray-900/50 rounded-lg border border-gray-700 space-y-3">
              <Label htmlFor="visualElementInput">Décris un ou plusieurs sujets (séparés par "et")</Label>
              <div className="flex items-center gap-2">
                  <div className="relative flex-grow">
                      <Input
                        id="visualElementInput"
                        name="visualElementInput"
                        value={visualElementInput}
                        onChange={(e) => setVisualElementInput(e.target.value)}
                        onKeyDown={handleVisualElementKeyDown}
                        placeholder={isCorrecting ? 'Transcription...' : isRecording ? 'Enregistrement...' : 'un guerrier et un dragon'}
                        disabled={isRecording || isCorrecting}
                        className={isRecording ? 'recording-glow' : ''}
                      />
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleRecording}
                    disabled={isCorrecting}
                    className={`w-10 h-10 flex-shrink-0 p-2 rounded-lg transition-colors duration-200 flex items-center justify-center ${isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-600 hover:bg-gray-500'}`}
                    aria-label={isRecording ? 'Arrêter' : 'Enregistrer'}
                  >
                    <MicrophoneIcon className={`w-5 h-5 text-white ${isRecording ? 'animate-pulse' : ''}`} />
                  </button>
                  <button
                    type="button"
                    onClick={handleSubjectAction}
                    disabled={isRecording || isCorrecting || !visualElementInput.trim()}
                    className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-purple-600 hover:bg-purple-700 disabled:bg-gray-500 text-white font-bold py-2 px-2 rounded-lg transition"
                    aria-label={isRecording ? 'Arrêter et traiter la voix' : 'Ajouter le sujet'}
                  >
                    {isRecording ? <div className="w-3 h-3 bg-white rounded-sm"></div>
                      : isCorrecting ? <SpinnerIcon className={`w-5 h-5 text-purple-400`} /> 
                      : <SendIcon className="w-5 h-5" />}
                  </button>
              </div>
            </div>
            
            <div className={`transition-opacity duration-300 ${isCharacterSubject ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                <Label htmlFor="characterShot">🎥 Plan du personnage</Label>
                <Select 
                    id="characterShot" 
                    name="characterShot" 
                    value={options.characterShot ?? ''} 
                    onChange={handleInputChange}
                    disabled={!isCharacterSubject}
                >
                    {availableShots.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </Select>
            </div>

            {isSizedElement && (
              <div className="mt-4">
                  <Label htmlFor="elementSize">Taille du sujet dans le visuel : {options.elementSize ?? 75}%</Label>
                  <Input 
                      type="range"
                      id="elementSize"
                      name="elementSize"
                      min="0"
                      max="100"
                      value={options.elementSize ?? 75}
                      onChange={handleRangeChange}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>Fond seul</span>
                      <span>Très gros plan</span>
                  </div>
              </div>
            )}
          </Section>
          
          <Section title="Style & Format" icon={<PaintBrushIcon />} collapsable={true}>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="gameType">Type de jeu</Label>
                    <Select id="gameType" name="gameType" value={options.gameType} onChange={handleInputChange}>
                    {GAME_TYPES.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </Select>
                </div>
                <div>
                    <Label htmlFor="graphicStyle">Style graphique</Label>
                    <Select id="graphicStyle" name="graphicStyle" value={options.graphicStyle} onChange={handleInputChange}>
                    {GRAPHIC_STYLES.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </Select>
                </div>
            </div>
            <div>
              <Label htmlFor="format">Format</Label>
              <Select id="format" name="format" value={options.format} onChange={handleInputChange}>
                  {DECLINATION_FORMATS.map(f => (
                      <option key={f.id} value={f.id}>
                          {f.label} - {f.description}
                      </option>
                  ))}
              </Select>
            </div>
          </Section>
          
          <Section title="Ambiance & Éclairage" icon={<AdjustmentsIcon />} collapsable={true}>
            <div>
              <Label htmlFor="ambiance">Ambiance</Label>
              <Select id="ambiance" name="ambiance" value={options.ambiance} onChange={handleInputChange}>
                {AMBIANCES.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </Select>
            </div>
            <div>
              <Label htmlFor="effectsIntensity">Intensité des effets : {options.effectsIntensity}%</Label>
              <Input type="range" id="effectsIntensity" name="effectsIntensity" min="0" max="100" value={options.effectsIntensity} onChange={handleRangeChange} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"/>
            </div>
          </Section>

          <Section title="Options avancées" icon={<SparklesIcon />} collapsable={true}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <input type="checkbox" id="highResolution" name="highResolution" checked={options.highResolution} onChange={handleInputChange} className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
                    <Label htmlFor="highResolution">Haute Résolution (plus lent)</Label>
                </div>
            </div>
            <div className="flex items-center justify-between">
                 <div className="flex items-center gap-2">
                    <input type="checkbox" id="transparentBackground" name="transparentBackground" checked={options.transparentBackground} onChange={handleInputChange} className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
                    <Label htmlFor="transparentBackground">Fond transparent</Label>
                </div>
            </div>
             <div className="mt-2">
                <button onClick={() => onAttemptAction(0, onOpenPromptEditor)} className="w-full text-center text-sm text-purple-400 hover:underline">
                    Éditer le brief créatif manuellement
                </button>
            </div>
          </Section>

        </main>
        
        {error && (
            <div className="px-4 pb-2">
                <div 
                    className="p-4 bg-gray-900 rounded-lg border border-purple-500 text-gray-200 text-sm"
                    role="alert"
                >
                    <p>{error}</p>
                </div>
            </div>
        )}

        <footer className="flex-shrink-0 p-4 border-t border-gray-700">
          <button
            onClick={onGenerate}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-all duration-300"
          >
            {isLoading ? (
              <><SpinnerIcon className="w-5 h-5" /> Génération en cours...</>
            ) : (
              '✨ Générer le visuel ✨'
            )}
          </button>
        </footer>
      </div>
      {activePresetDetails && <UniverseDetailsModal preset={activePresetDetails} onClose={() => setActivePresetDetails(null)} />}
      {isModalOpen && <AddPresetModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSavePreset} presetToEdit={editingPreset} onSuggestPreset={onSuggestPreset} isSuggestingPreset={isSuggestingPreset} />}
    </>
  );
};

export default ControlsPanel;