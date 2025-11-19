
import React, { useState, useEffect, useRef, useCallback } from 'react';
import ControlsPanel from './components/ControlsPanel/ControlsPanel';
import WelcomePanel from './components/WelcomePanel';
import LoadingPanel from './components/LoadingPanel';
import ImageResultPanel from './components/ImageResultPanel';
import Toast from './components/Toast';
import FormatManager from './components/FormatManager';
import PromptEditorModal from './components/ControlsPanel/PromptEditorModal';
import PricingModal from './components/PricingModal';
import { ConfirmationModal, LoginRequiredModal, InsufficientCreditsModal } from './components/ConfirmationModal';
import AuthModal from './components/AuthModal';
import AccountModal from './components/AccountModal';
import ApiBlockErrorModal from './components/ApiBlockErrorModal';
import ImageEditorPanel from './components/ImageEditorPanel';
import type { EsportPromptOptions, QualityCheckResults, GenerationHistoryItem, UniverseId, Format, DerivedImage, ChatMessage, UniversePreset, TextConfig, TextStyle, PromptChangeSummary, TextBlock, SavedSubject, AdaptationRequest, ManualTextLayer, PartnerZoneConfig, PartnerLogo, InspirationImage, CurrentUser, PurchaseHistoryItem, UniverseHistoryItem, VisualsHistoryItem } from './types';
import { generateEsportImage, adaptEsportImage, generateEsportPrompt, refinePrompt, suggestUniversePreset, determineTextStyle, editImage, applyOutpainting } from './services/geminiService';
import { UNIVERSE_PRESETS } from './constants/options';
import { DECLINATION_FORMATS } from './constants/formats';
import { CREDIT_COSTS } from './constants/costs';
import { cropImage, resizeAndCropImage, detectMargins } from './utils/image';
import { getHistory, saveHistoryItem, deleteHistoryItemId } from './services/historyService';

type View = 'welcome' | 'loading' | 'result' | 'imageEditor'; // Added 'imageEditor' view

const initialOptions: EsportPromptOptions = {
  universes: [],
  gameType: "MOBA",
  graphicStyle: "Cyberpunk / Néon",
  ambiance: "",
  visualElements: "Personnage central",
  visualElementDescriptions: [],
  characterShot: "",
  elementSize: 75,
  format: "1:1 (Carré)",
  effectsIntensity: 50,
  language: "français",
  customPrompt: "",
  inspirationImage: null,
  // Champs événementiels supprimés ici car gérés uniquement en post-prod manuelle désormais
  eventName: "", // Gardés pour compatibilité temporaire si besoin, mais non utilisés dans le prompt IA
  baseline: "",
  eventLocation: "",
  eventDate: "",
  textLock: true,
  reservePartnerZone: false,
  partnerZoneHeight: 8,
  partnerZonePosition: 'bottom',
  highResolution: true,
  hideText: false,
  transparentBackground: false,
};

const App: React.FC = () => {
  const [options, _setOptions] = useState<EsportPromptOptions>(initialOptions);
  const [currentImageOptions, setCurrentImageOptions] = useState<EsportPromptOptions>(initialOptions);
  const [view, setView] = useState<View>('welcome');

  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [masterImageNoText, setMasterImageNoText] = useState<string | null>(null);
  const [generatedPrompt, setGeneratedPrompt] = useState<string>('');
  const [textLayers, setTextLayers] = useState<ManualTextLayer[]>([]);
  const [partnerZone, setPartnerZone] = useState<PartnerZoneConfig | null>(null);
  const [partnerLogos, setPartnerLogos] = useState<PartnerLogo[]>([]);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isOutpainting, setIsOutpainting] = useState(false);
  // REMOVED: isModifying state and related logic (replaced by ImageEditorPanel)
  
  const [qualityCheckResults, setQualityCheckResults] = useState<QualityCheckResults | null>(null);
  
  const [history, setHistory] = useState<GenerationHistoryItem[]>([]);
  
  const [error, setError] = useState<string | null>(null);
  const [apiBlockError, setApiBlockError] = useState<string | null>(null);
  const [failedPrompt, setFailedPrompt] = useState<string | null>(null);

  const [toastMessage, setToastMessage] = useState<string>('');

  // REMOVED: isModificationMode, modificationRequest states and related logic (replaced by ImageEditorPanel)
  
  const [isFormatManagerOpen, setIsFormatManagerOpen] = useState(false);
  const [derivedImages, setDerivedImages] = useState<Record<Format, DerivedImage>>({} as Record<Format, DerivedImage>);
  const [isGeneratingAdaptations, setIsGeneratingAdaptations] = useState(false);

  // State for the new prompt editor chat
  const [promptHistory, setPromptHistory] = useState<ChatMessage[]>([]);
  const [isAssistantResponding, setIsAssistantResponding] = useState(false);
  const currentPromptRef = useRef<string>('');
  const [isPromptEditorOpen, setIsPromptEditorOpen] = useState(false);
  const [isPromptCustomized, setIsPromptCustomized] = useState(false);
  
  const [customPresets, setCustomPresets] = useState<UniversePreset[]>([]);
  
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  
  const [isSuggestingPreset, setIsSuggestingPreset] = useState(false);

  const [isPanelOpen, setIsPanelOpen] = useState(false);
  
  const [loadingState, setLoadingState] = useState({ progress: 0, message: '' });

  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  // REMOVED: ModificationConfirmationModal, refinedPromptForConfirmation, promptChangeSummary, isPreparingModification states
  
  const [savedSubjects, setSavedSubjects] = useState<SavedSubject[]>([]);
  
  // Auth State
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [initialAuthMode, setInitialAuthMode] = useState<'login' | 'signup'>('login');
  
  // New Modals State
  const [isLoginRequiredModalOpen, setIsLoginRequiredModalOpen] = useState(false);
  const [isInsufficientCreditsModalOpen, setIsInsufficientCreditsModalOpen] = useState(false);
  const [requiredCreditsInfo, setRequiredCreditsInfo] = useState<{ required: number; has: number } | null>(null);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

  // NEW STATE FOR IMAGE EDITOR PANEL
  const [isImageEditorOpen, setIsImageEditorOpen] = useState(false);


  const isLoading = isGenerating || isGeneratingAdaptations || isAssistantResponding || isSuggestingPreset || isOutpainting; // Updated isLoading calculation
  
  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 5000);
  }, [setToastMessage]);
  
  const handleGoHome = () => {
    setView('welcome');
    setIsImageEditorOpen(false); // Ensure editor is closed when going home
  };

  const handleApiError = useCallback((err: unknown, promptThatFailed?: string) => {
    const errorMessage = err instanceof Error ? err.message : "Une erreur est survenue.";

    // Stop all loading states regardless of error type
    setIsGenerating(false);
    setIsOutpainting(false);
    // REMOVED: setIsModifying(false);
    setIsGeneratingAdaptations(false);
    setIsAssistantResponding(false);
    setIsSuggestingPreset(false);
    // REMOVED: setIsPreparingModification(false);

    const isBlockError = errorMessage.includes("bloqué") || errorMessage.includes("échoué");
    
    if (isBlockError) {
        setApiBlockError(errorMessage);
        setFailedPrompt(promptThatFailed || null);
        setView('welcome');
        setIsImageEditorOpen(false); // Close editor on critical API errors
    } else {
        setError(`Erreur Gemini: ${errorMessage}`);
        setIsPanelOpen(true);
        setView('welcome');
        setIsImageEditorOpen(false); // Close editor on critical API errors
    }
  }, [showToast]);

  const saveCurrentUser = (user: CurrentUser | null) => {
    try {
        if (user) {
            // Save to the general "currently logged in" key
            localStorage.setItem('EVS_CURRENT_USER', JSON.stringify(user));
            // Also save to the specific user's data key for persistence across sessions
            localStorage.setItem(`EVS_USER_DATA_${user.email}`, JSON.stringify(user));
        } else {
            localStorage.removeItem('EVS_CURRENT_USER');
        }
        setCurrentUser(user);
    } catch (e) {
        console.error("Failed to save current user to localStorage", e);
    }
  };

  // Load user-specific history
  const loadHistoryForUser = async (userId: string) => {
      const items = await getHistory(userId);
      setHistory(items);
  };

  useEffect(() => {
    try {
        const loggedInUserStr = localStorage.getItem('EVS_CURRENT_USER');
        if (loggedInUserStr) {
            const user = JSON.parse(loggedInUserStr);
            setCurrentUser(user);
            // Load history for this user
            loadHistoryForUser(user.email);
        }
    } catch (e) {
        console.error("Failed to parse current user from localStorage", e);
        localStorage.removeItem('EVS_CURRENT_USER');
    }
  }, []);

  const setOptions: React.Dispatch<React.SetStateAction<EsportPromptOptions>> = (value) => {
    // Clear any existing error when user modifies settings
    setError(null);
    
    const newOptions = typeof value === 'function' ? value(options) : value;

    if (isPromptCustomized) {
      const PROMPT_AFFECTING_KEYS: (keyof EsportPromptOptions)[] = [
        'universes', 'gameType', 'graphicStyle', 'ambiance', 'visualElements', 
        'inspirationImage', 'eventName', 'baseline', 'eventLocation', 'eventDate',
        'textLock', 'hideText', 'reservePartnerZone', 'partnerZoneHeight', 
        'partnerZonePosition', 'effectsIntensity', 'elementSize', 'transparentBackground',
        'visualElementDescriptions', 'characterShot'
      ];

      const hasChanged = PROMPT_AFFECTING_KEYS.some(key => {
        if (key === 'universes' || key === 'visualElementDescriptions') {
            const oldArray = (options[key] as string[] | undefined)?.slice().sort() || [];
            const newArray = ((newOptions as any)[key] || []).slice().sort();
            return JSON.stringify(oldArray) !== JSON.stringify(newArray);
        }
        if (key === 'inspirationImage') {
            return options.inspirationImage?.base64 !== newOptions.inspirationImage?.base64;
        }
        return options[key] !== newOptions[key];
      });

      if (hasChanged) {
        setIsPromptCustomized(false);
      }
    }
    
    _setOptions(newOptions);
  };

  useEffect(() => {
    try {
      const savedCustomPresets = localStorage.getItem('customUniversePresets');
      if (savedCustomPresets) {
        setCustomPresets(JSON.parse(savedCustomPresets));
      }
      const savedSubjectsData = localStorage.getItem('savedSubjects');
      if (savedSubjectsData) {
        setSavedSubjects(JSON.parse(savedSubjectsData));
      }
    } catch (e) {
      console.error("Failed to load custom data from localStorage", e);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('customUniversePresets', JSON.stringify(customPresets));
      localStorage.setItem('savedSubjects', JSON.stringify(savedSubjects));
    } catch (e) {
      console.error("Failed to save custom data to localStorage", e);
    }
  }, [customPresets, savedSubjects]);

  const allPresets = [...UNIVERSE_PRESETS, ...customPresets];


  
  useEffect(() => {
    if (isPromptCustomized) return;
  
    try {
      const newPrompt = generateEsportPrompt(options, allPresets, false);
      currentPromptRef.current = newPrompt;
    } catch (e) {
      console.error("Failed to generate prompt from options:", e);
      currentPromptRef.current = "Erreur lors de la génération du prompt. Veuillez vérifier vos options.";
    }
  }, [options, allPresets, isPromptCustomized]);
  
  // --- AUTH HANDLERS ---
  const handleOpenAuthModal = (mode: 'login' | 'signup') => {
      setInitialAuthMode(mode);
      setIsAuthModalOpen(true);
  };
  
  const handleLogout = () => {
      saveCurrentUser(null);
      setHistory([]); // Clear history
      setIsPanelOpen(false); // Close panel
      setView('welcome'); // Go back to home
      setIsImageEditorOpen(false); // Close editor if open
      showToast("Tu as été déconnecté.");
  };

  const handleSignup = async (email: string, pass: string, pseudo: string) => {
      return new Promise<void>((resolve, reject) => {
          setTimeout(() => {
              try {
                  const users = JSON.parse(localStorage.getItem('EVS_USERS') || '{}');
                  if (users[email]) {
                      return reject(new Error("Un compte existe déjà avec cet email."));
                  }
                  if (Object.values(users).some((user: any) => user.pseudo.toLowerCase() === pseudo.toLowerCase())) {
                    return reject(new Error("Ce pseudo est déjà utilisé."));
                  }
                  
                  users[email] = { password: pass, pseudo };
                  localStorage.setItem('EVS_USERS', JSON.stringify(users));
                  
                  const newUser: CurrentUser = { 
                    email, 
                    pseudo,
                    credits: 20,
                    universesHistory: [],
                    visualsHistory: [],
                    purchasesHistory: [],
                  };
                  saveCurrentUser(newUser);
                  loadHistoryForUser(email); // Load empty history for new user

                  setIsAuthModalOpen(false);
                  showToast(`Bienvenue, ${pseudo} ! 20 crédits offerts.`);
                  resolve();
              } catch (e) {
                  reject(new Error("Erreur lors de la création du compte."));
              }
          }, 1000);
      });
  };
  const handleLogin = async (email: string, pass: string) => {
      return new Promise<void>((resolve, reject) => {
          setTimeout(() => {
              try {
                  const users = JSON.parse(localStorage.getItem('EVS_USERS') || '{}');
                  const storedUser = users[email];
                  if (!storedUser || storedUser.password !== pass) {
                      return reject(new Error("Identifiant ou mot de passe incorrect."));
                  }
                  
                  // Load the user's specific persisted data.
                  const userDataStr = localStorage.getItem(`EVS_USER_DATA_${email}`);
                  let user: CurrentUser;
                  
                  if (userDataStr) {
                      user = JSON.parse(userDataStr);
                  } else {
                      // Fallback for first-time login after signup or for migrating old accounts
                      // that only existed in EVS_USERS.
                      user = {
                          email, 
                          pseudo: storedUser.pseudo,
                          credits: 20, 
                          universesHistory: [],
                          visualsHistory: [],
                          purchasesHistory: [],
                      };
                  }

                  saveCurrentUser(user);
                  loadHistoryForUser(email); // Load specific history

                  setIsAuthModalOpen(false);
                  showToast(`Content de te revoir, ${user.pseudo} !`);
                  resolve();
              } catch(e) {
                  reject(new Error("Erreur lors de la connexion."));
              }
          }, 1000);
      });
  };

  const handleDevLogin = () => {
    const devUser: CurrentUser = {
      email: 'dev@evs.com',
      pseudo: 'AdminDev',
      credits: 9999, // Essentially unlimited
      universesHistory: [],
      visualsHistory: [],
      purchasesHistory: [],
    };
    saveCurrentUser(devUser);
    loadHistoryForUser(devUser.email);
    setIsAuthModalOpen(false);
    showToast('Connecté en mode développeur avec des crédits illimités.');
  };

  const handleUpdateUser = async (updates: Partial<Pick<CurrentUser, 'pseudo'>>) => {
    if (!currentUser) return;
    // Mock API call
    await new Promise(resolve => setTimeout(resolve, 500));
    const updatedUser = { ...currentUser, ...updates };
    saveCurrentUser(updatedUser);
    showToast("Profil mis à jour !");
  };

  const handleDeleteAccount = () => {
    if (!currentUser) return;
    try {
        const users = JSON.parse(localStorage.getItem('EVS_USERS') || '{}');
        delete users[currentUser.email];
        localStorage.removeItem(`EVS_USER_DATA_${currentUser.email}`);
        handleLogout();
        showToast("Ton compte a été supprimé avec succès.");
    } catch (e) {
        showToast("Une erreur est survenue lors de la suppression du compte.");
        console.error("Failed to delete account:", e);
    }
  };
  // -----------------------

  const calculateGenerationCost = (opts: EsportPromptOptions): number => {
    const hasCustomUniverse = opts.universes.some(id => allPresets.find(p => p.id === id)?.isCustom);
    if (hasCustomUniverse) {
        return CREDIT_COSTS.CUSTOM_UNIVERSE_GENERATION;
    }
    return CREDIT_COSTS.STANDARD_GENERATION;
  };
  
  const handleAttemptAction = (cost: number, action: () => void) => {
    if (!currentUser) {
        setIsLoginRequiredModalOpen(true);
        return;
    }
    if (currentUser.credits < cost) {
        setRequiredCreditsInfo({ required: cost, has: currentUser.credits });
        setIsInsufficientCreditsModalOpen(true);
        return;
    }
    
    if (cost > 0) {
        // Deduct credits immediately
        const newBalance = currentUser.credits - cost;
        try {
            saveCurrentUser({ ...currentUser, credits: newBalance });
            showToast(`${cost} crédits utilisés. Solde restant : ${newBalance}.`);
            action(); // Execute the actual action after successful deduction
        } catch (e) {
            // If saving fails, inform the user but still attempt the action.
            // The action might still work, but credits won't be persistently deducted until next successful save.
            console.error("Failed to save updated user credits to localStorage:", e);
            showToast("Erreur lors de la mise à jour des crédits. L'action va être tentée, mais votre solde pourrait ne pas être à jour. Veuillez vérifier vos réglages.");
            action();
        }
    } else {
        // Free action, just check login (already done) and proceed
        action();
    }
  };

  const handleOpenPromptEditor = () => {
    setPromptHistory([
      {
        sender: 'assistant',
        text: `Voici le brief créatif actuel basé sur tes choix :\n\n${currentPromptRef.current}`
      }
    ]);
    setIsPromptEditorOpen(true);
  };

  const addToHistory = async (item: GenerationHistoryItem) => {
    // Optimistic update
    setHistory(prev => [item, ...prev]);
    
    // Async save to DB
    try {
        await saveHistoryItem(item);
        // No need to reload all history, we just appended locally
    } catch (e) {
        console.error("Failed to save to IndexedDB", e);
        showToast("Erreur lors de la sauvegarde dans l'historique.");
    }
  };
  
  const handleDeleteHistoryItem = async (itemId: string) => {
    // Optimistic update
    setHistory(prev => prev.filter(item => item.id !== itemId));
    try {
        await deleteHistoryItemId(itemId);
        showToast("Version supprimée de l'historique.");
    } catch (e) {
         console.error("Failed to delete history item from IndexedDB", e);
    }
  };

  const handleUniverseToggle = (universeId: UniverseId) => {
    setOptions(prev => {
        const newUniverses = prev.universes.includes(universeId)
            ? []
            : [universeId];

        let newOptions: EsportPromptOptions = { ...prev, universes: newUniverses };

        if (newUniverses.length === 1) {
            const preset = allPresets.find(p => p.id === newUniverses[0]);
            if (preset) {
                newOptions.gameType = preset.gameType;
                newOptions.graphicStyle = preset.style;
                newOptions.ambiance = preset.ambiance;
                newOptions.visualElements = preset.elements;
            }
        }
        return newOptions;
    });
  };

  const handleRefinePrompt = async (userFeedback: string) => {
    setIsAssistantResponding(true);
    setPromptHistory(prev => [...prev, { sender: 'user', text: userFeedback }]);
    
    try {
      const refinedPrompt = await refinePrompt(currentPromptRef.current, userFeedback);
      currentPromptRef.current = refinedPrompt;
      setIsPromptCustomized(true);
      setPromptHistory(prev => [
        ...prev,
        { sender: 'assistant', text: `J'ai mis à jour le brief créatif :\n\n${refinedPrompt}` }
      ]);
    } catch (err: unknown) {
      handleApiError(err);
    } finally {
      setIsAssistantResponding(false);
    }
  };
  
  const handleFinalizePrompt = () => {
    setIsPromptEditorOpen(false);
    if(isPromptCustomized) {
      showToast("Brief créatif mis à jour !");
    }
  };

  const handleRestoreFromHistory = (item: GenerationHistoryItem) => {
    _setOptions(item.options);
    setGeneratedImage(item.imageUrl);
    setMasterImageNoText(item.masterImageNoText || item.imageUrl);
    setCurrentImageOptions(item.options);
    setGeneratedPrompt(item.prompt);
    setQualityCheckResults(item.qualityCheckResults);
    setTextLayers(item.manualTextLayers || []);
    setPartnerZone(item.partnerZone || null);
    const restoredPartnerLogos = (item.partnerLogos || []).map(logo => ({
      ...logo,
      container: logo.container ?? 'zone'
    }));
    setPartnerLogos(restoredPartnerLogos);
    // REMOVED: setIsModificationMode(false);
    // REMOVED: setModificationRequest('');
    setView('result');
    setIsPanelOpen(false);
    showToast("Version restaurée depuis l'historique.");
  };

  const handleAddSavedSubject = (description: string) => {
    if (description.trim() && !savedSubjects.some(s => s.description.toLowerCase() === description.toLowerCase().trim())) {
      const newSubject: SavedSubject = { id: Date.now().toString(), description: description.trim() };
      setSavedSubjects(prev => [newSubject, ...prev]);
    }
  };

  const handleDeleteSavedSubject = (subjectId: string) => {
    const subjectToDelete = savedSubjects.find(s => s.id === subjectId);
    if (!subjectToDelete) return;

    setSavedSubjects(prev => prev.filter(s => s.id !== subjectToDelete.id));
    setOptions(prev => ({
        ...prev,
        visualElementDescriptions: prev.visualElementDescriptions.filter(d => d !== subjectToDelete.description)
    }));
    showToast("Sujet supprimé.");
  };

  const handleSubjectToggle = (description: string) => {
    setOptions(prev => {
        const newDescriptions = prev.visualElementDescriptions.includes(description)
            ? prev.visualElementDescriptions.filter(d => d !== description)
            : [...prev.visualElementDescriptions, description];
        return { ...prev, visualElementDescriptions: newDescriptions };
    });
  };

  const useDebouncedHistorySave = (data: any, dataName: string) => {
    useEffect(() => {
        if (generatedImage && history.length > 0 && history[0].imageUrl === generatedImage) {
            const currentHistoryItem = history[0];
            if (JSON.stringify(currentHistoryItem[dataName as keyof GenerationHistoryItem]) !== JSON.stringify(data)) {
                 const updatedItem = { ...currentHistoryItem, [dataName]: data };
                 setHistory(prev => [updatedItem, ...prev.slice(1)]);
                 saveHistoryItem(updatedItem).catch(e => console.error(`Failed to update ${dataName} in history DB`, e));
            }
        }
    }, [data, generatedImage, history, dataName]);
  };

  useDebouncedHistorySave(textLayers, 'manualTextLayers');
  useDebouncedHistorySave(partnerZone, 'partnerZone');
  useDebouncedHistorySave(partnerLogos, 'partnerLogos');


  const startGeneration = async () => {
    if (!currentUser) {
      return;
    }
    const cost = calculateGenerationCost(options);
    
    setIsConfirmationModalOpen(false);
    setIsPanelOpen(false);
    setView('loading');
    setIsGenerating(true);
    setError(null);
    setLoadingState({ progress: 0, message: 'Préparation de la génération...' });
    const finalPrompt = isPromptCustomized ? currentPromptRef.current : generateEsportPrompt(options, allPresets);
    setGeneratedPrompt(finalPrompt);

    try {
        setLoadingState({ progress: 40, message: 'Génération du visuel...' });
        
        const { imageBase64, prompt } = await generateEsportImage(options, allPresets, finalPrompt);
        
        setLoadingState({ progress: 80, message: 'Vérification des finitions...' });
        const hasMargins = await detectMargins(imageBase64);
        let finalImageBase64 = imageBase64;

        if (hasMargins) {
            setLoadingState({ progress: 90, message: 'Correction automatique des marges...' });
            try {
                finalImageBase64 = await applyOutpainting(imageBase64, 'image/png');
                showToast("Des marges ont été détectées et corrigées automatiquement.");
            } catch (outpaintErr) {
                console.error("Automatic outpainting failed, using original image.", outpaintErr);
                showToast("La correction automatique des marges a échoué. Vous pouvez tenter un outpainting manuel.");
            }
        }

        const newVisualHistoryItem: VisualsHistoryItem = {
            historyId: Date.now().toString(),
            creditsSpent: cost,
            date: Date.now(),
        };
        const updatedUser = {
            ...currentUser,
            visualsHistory: [newVisualHistoryItem, ...currentUser.visualsHistory]
        };
        saveCurrentUser(updatedUser);
        
        setMasterImageNoText(finalImageBase64);
        setGeneratedImage(finalImageBase64);
        setCurrentImageOptions(options);
        setQualityCheckResults({ resolution: options.highResolution, ratio: true, margins: true, text: true });
        setDerivedImages({} as Record<Format, DerivedImage>);
        setTextLayers([]);
        setPartnerZone(null);
        setPartnerLogos([]);

        await addToHistory({
          id: newVisualHistoryItem.historyId,
          userId: currentUser.email, // Ensure history is tied to user
          timestamp: newVisualHistoryItem.date,
          imageUrl: finalImageBase64,
          masterImageNoText: finalImageBase64,
          options,
          prompt,
          qualityCheckResults: { resolution: options.highResolution, ratio: true, margins: !hasMargins, text: true },
          manualTextLayers: [],
          partnerZone: null,
          partnerLogos: []
        });

        setLoadingState({ progress: 100, message: 'Terminé !' });
        setView('result');
    } catch (err: unknown) {
        handleApiError(err, finalPrompt);
    } finally {
        setIsGenerating(false);
    }
  };

  const handleOutpainting = () => {
    if (!masterImageNoText || !currentUser) return;

    handleAttemptAction(CREDIT_COSTS.VARIATION, async () => {
      setIsOutpainting(true);
      setError(null);
      try {
        const outpaintedImageBase64 = await applyOutpainting(masterImageNoText, 'image/png');
        
        setMasterImageNoText(outpaintedImageBase64);
        setGeneratedImage(outpaintedImageBase64);
        
        const newHistoryId = Date.now().toString();
        const newHistoryItem: GenerationHistoryItem = {
          id: newHistoryId,
          userId: currentUser.email,
          timestamp: Date.now(),
          imageUrl: outpaintedImageBase64,
          masterImageNoText: outpaintedImageBase64,
          options: currentImageOptions,
          prompt: `Outpainting appliqué sur l'image précédente.`,
          qualityCheckResults: qualityCheckResults || { resolution: true, ratio: true, margins: true, text: true },
          manualTextLayers: [],
          partnerZone: null,
          partnerLogos: [],
        };
        await addToHistory(newHistoryItem);

        setTextLayers([]);
        setPartnerZone(null);
        setPartnerLogos([]);
        
        showToast("Outpainting réussi ! Le fond a été étendu.");

      } catch (err: unknown) {
        handleApiError(err);
      } finally {
        setIsOutpainting(false);
      }
    });
  };

  // REMOVED: executeModification, handleStartModification, ModificationConfirmationModal related logic
  
  const handleGenerateAdaptations = async (adaptations: AdaptationRequest[]) => {
    if (!masterImageNoText) return;

    setIsGeneratingAdaptations(true);

    setDerivedImages(prev => {
        const newDerived = { ...prev };
        adaptations.forEach(({ format, cropArea }) => {
            newDerived[format] = {
                format,
                imageUrl: null,
                isGenerating: true,
                cropArea,
                manualTextLayers: textLayers,
                partnerZone: partnerZone,
                partnerLogos: partnerLogos,
            };
        });
        return newDerived;
    });

    const sourceImageUrl = `data:image/png;base64,${masterImageNoText}`;

    for (const { format, cropArea } of adaptations) {
        try {
            const formatDef = DECLINATION_FORMATS.find(f => f.id === format);
            if (!formatDef) throw new Error(`Format definition not found for ${format}`);

            let finalImageBase64: string;

            if (cropArea && currentImageOptions.format === "1:1 (Carré)") {
                const getFullCropArea = (): { x: number; y: number; width: number; height: number } => {
                    switch (format) {
                        case '3:1 (Bannière)': return { x: 0, y: cropArea.y ?? 0, width: 1, height: 1 / 3 };
                        case '16:9 (Paysage)': return { x: 0, y: cropArea.y ?? 0, width: 1, height: 9 / 16 };
                        case '4:5 (Vertical)': return { x: cropArea.x ?? 0, y: 0, width: 4 / 5, height: 1 };
                        case 'A3 / A2 (Vertical)': return { x: cropArea.x ?? 0, y: 0, width: 2 / 3, height: 1 };
                        case '9:16 (Story)': return { x: cropArea.x ?? 0, y: 0, width: 9 / 16, height: 1 };
                        default: throw new Error("Unsupported crop format");
                    }
                };
                const croppedImageUrl = await cropImage(sourceImageUrl, getFullCropArea());
                finalImageBase64 = croppedImageUrl.split(',')[1];
            } else {
                const [targetWidth, targetHeight] = formatDef.dimensions.replace('px', '').split('x').map(Number);
                const resizedImageUrl = await resizeAndCropImage(sourceImageUrl, targetWidth, targetHeight);
                finalImageBase64 = resizedImageUrl.split(',')[1];
            }

            setDerivedImages(prev => ({
                ...prev,
                [format]: { ...prev[format], imageUrl: finalImageBase64, isGenerating: false }
            }));
        } catch (err: unknown) {
            console.error(`Failed to adapt for format ${format}`, err);
            setDerivedImages(prev => ({
                ...prev,
                [format]: { ...prev[format], isGenerating: false }
            }));
        }
    }

    setIsGeneratingAdaptations(false);
  };
  
  const handleAddPreset = (presetData: Omit<UniversePreset, 'id' | 'isCustom' | 'dominant'>) => {
    if (!currentUser) {
        setIsLoginRequiredModalOpen(true);
        return;
    }
    const newPreset: UniversePreset = {
        ...presetData,
        id: `custom_${Date.now()}`,
        isCustom: true,
        dominant: false,
    };
    const newHistoryItem: UniverseHistoryItem = {
        id: newPreset.id,
        date: Date.now(),
        preset: presetData,
    };
    saveCurrentUser({ ...currentUser, universesHistory: [newHistoryItem, ...currentUser.universesHistory] });
    setCustomPresets(prev => [...prev, newPreset]);
    showToast(`Univers "${presetData.label}" créé !`);
  };

  const handleUpdatePreset = (presetId: UniverseId, updatedData: Omit<UniversePreset, 'id' | 'isCustom' | 'dominant'>) => {
      setCustomPresets(prev => prev.map(p => p.id === presetId ? { ...p, ...updatedData } : p));
      
      if (options.universes.includes(presetId)) {
          setOptions(prev => ({
              ...prev,
              gameType: updatedData.gameType,
              graphicStyle: updatedData.style,
              ambiance: updatedData.ambiance,
              visualElements: updatedData.elements
          }));
      }

      showToast(`Univers "${updatedData.label}" mis à jour !`);
  };

  const handleDeletePreset = (presetId: UniverseId) => {
      setCustomPresets(prev => prev.filter(p => p.id !== presetId));
      setOptions(prev => ({
          ...prev,
          universes: prev.universes.filter(id => id !== presetId)
      }));
      showToast(`Univers supprimé.`);
  };

  const handleSuggestPreset = async (theme: string, image?: InspirationImage | null) => {
      setIsSuggestingPreset(true);
      setError(null);
      try {
          const preset = await suggestUniversePreset(theme, image);
          showToast("Suggestion d'univers générée !");
          return preset;
      } catch (err: unknown) {
          handleApiError(err);
          return null;
      } finally {
          setIsSuggestingPreset(false);
      }
  };

  const handlePurchase = (pack: { name: string, price: string, credits: number }) => {
    if (!currentUser) return;
    const newPurchase: PurchaseHistoryItem = {
        id: `purchase_${Date.now()}`,
        date: Date.now(),
        packName: pack.name,
        creditsAdded: pack.credits,
        amount: pack.price,
        stripePaymentId: `mock_pi_${Date.now()}`
    };
    const updatedUser: CurrentUser = {
        ...currentUser,
        credits: currentUser.credits + pack.credits,
        purchasesHistory: [newPurchase, ...currentUser.purchasesHistory]
    };
    saveCurrentUser(updatedUser);
    showToast(`${pack.credits} crédits ajoutés !`);
    setIsPricingModalOpen(false);
  };

  const closeApiBlockErrorModal = () => {
    setApiBlockError(null);
    setFailedPrompt(null);
  };

  const goToStudioFromError = () => {
    closeApiBlockErrorModal();
    setView('welcome');
    setIsPanelOpen(true);
  };

  // NEW FUNCTIONS FOR IMAGE EDITOR
  const handleOpenImageEditor = () => {
    if (!masterImageNoText) {
      setError("Aucune image de base disponible pour l'édition.");
      setIsPanelOpen(true); // Open panel to allow generating a base image
      return;
    }
    setIsImageEditorOpen(true);
    setView('imageEditor'); // Set a specific view for the editor
    setIsPanelOpen(false); // Hide the controls panel
  };

  const handleCloseImageEditor = () => {
    setIsImageEditorOpen(false);
    setView('result'); // Go back to the result view
  };

  // Dedicated action handler for ImageEditorPanel to avoid re-deducting credits
  const handleImageEditAction = (cost: number, action: () => void) => {
    handleAttemptAction(cost, action);
  };
  
  // NEW: Function to handle when an image is validated in the editor
  const handleImageValidated = async (newImageBase64: string, newImageMimeType: string, editPrompt: string) => {
      if (!currentUser) return;

      setMasterImageNoText(newImageBase64);
      setGeneratedImage(newImageBase64);
      
      // Create a new history item for the edited image
      const newHistoryId = Date.now().toString();
      const newHistoryItem: GenerationHistoryItem = {
          id: newHistoryId,
          userId: currentUser.email,
          timestamp: Date.now(),
          imageUrl: newImageBase64,
          masterImageNoText: newImageBase64,
          options: currentImageOptions, // Options from the original image that was edited
          prompt: `Image éditée via l'éditeur: "${editPrompt}"`, // Descriptive prompt for history
          qualityCheckResults: qualityCheckResults || { resolution: true, ratio: true, margins: true, text: true }, // Inherit or default
          manualTextLayers: [], // Edited image starts fresh without manual overlays
          partnerZone: null,
          partnerLogos: [],
      };
      await addToHistory(newHistoryItem);

      // Reset text layers and partner zone for the *active* state as the base image has changed
      setTextLayers([]);
      setPartnerZone(null);
      setPartnerLogos([]);
      
      setView('result');
      setIsImageEditorOpen(false);
      showToast("L'image modifiée a été validée et est devenue la nouvelle référence.");
  };

  return (
    <div className="flex h-full bg-gray-900">
      {/* LEFT PANEL - ControlsPanel (only visible if NOT in image editor view) */}
      {!isImageEditorOpen && (
        <div className={`transition-all duration-300 ease-in-out ${isPanelOpen ? 'w-full md:w-[400px] lg:w-[450px]' : 'w-0'} flex-shrink-0 relative h-full z-20`}>
          <div className="w-full h-full overflow-hidden">
                {isPanelOpen && <ControlsPanel 
                options={options}
                setOptions={setOptions}
                onGenerate={() => {
                  handleAttemptAction(calculateGenerationCost(options), () => {
                    setIsConfirmationModalOpen(true);
                  });
                }}
                onAttemptAction={handleAttemptAction}
                isLoading={isLoading}
                error={error}
                setError={setError}
                history={history}
                onRestoreFromHistory={handleRestoreFromHistory}
                onDeleteHistoryItem={handleDeleteHistoryItem}
                onUniverseToggle={handleUniverseToggle}
                onOpenPromptEditor={handleOpenPromptEditor}
                allPresets={allPresets}
                onAddPreset={handleAddPreset}
                onUpdatePreset={handleUpdatePreset}
                onDeletePreset={handleDeletePreset}
                onSuggestPreset={handleSuggestPreset}
                isSuggestingPreset={isSuggestingPreset}
                onClosePanel={() => setIsPanelOpen(false)}
                savedSubjects={savedSubjects}
                onAddSavedSubject={handleAddSavedSubject}
                onDeleteSavedSubject={handleDeleteSavedSubject}
                onSubjectToggle={handleSubjectToggle}
                onGoHome={handleGoHome}
                currentUser={currentUser}
            />}
          </div>
          <button
              onClick={() => setIsPanelOpen(!isPanelOpen)}
              className={`absolute top-1/2 -translate-y-1/2 bg-purple-600 hover:bg-purple-700 text-white p-2 shadow-lg focus:outline-none focus:ring-2 focus:ring-purple-400 z-50 transition-all duration-300 ease-in-out ${isPanelOpen ? 'right-0 md:left-full md:right-auto rounded-l-lg md:rounded-l-none md:rounded-r-lg' : 'left-full rounded-r-lg'}`}
              aria-label={isPanelOpen ? "Fermer le panneau" : "Ouvrir le panneau"}
          >
              {isPanelOpen ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
              ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
              )}
          </button>
        </div>
      )}


      <div className="flex-1 flex flex-col relative">
        <main className="flex-1 overflow-hidden">
          {/* NEW IMAGE EDITOR VIEW */}
          {isImageEditorOpen && (
            <ImageEditorPanel
              originalImageBase64={masterImageNoText || ''} // Provide masterImageNoText as the base
              originalImageMimeType="image/png" // Assume generated images are PNG, may need to be more dynamic
              onClose={handleCloseImageEditor}
              currentUser={currentUser}
              onAttemptAction={handleImageEditAction} // Pass dedicated action wrapper
              saveCurrentUser={saveCurrentUser}
              onLogout={handleLogout}
              onOpenAuthModal={handleOpenAuthModal}
              onOpenPricingModal={() => setIsPricingModalOpen(true)}
              onImageValidated={handleImageValidated} // NEW PROP
              onOpenAccountModal={() => setIsAccountModalOpen(true)}
            />
          )}

          {/* OTHER VIEWS (only if image editor is not open) */}
          {!isImageEditorOpen && view === 'welcome' && (
            <WelcomePanel 
            onOpenPricingModal={() => setIsPricingModalOpen(true)} 
            currentUser={currentUser}
            onLogout={handleLogout}
            onOpenAuthModal={handleOpenAuthModal}
            onOpenAccountModal={() => setIsAccountModalOpen(true)}
            onOpenStudio={() => setIsPanelOpen(true)}
            onRequireLogin={() => setIsLoginRequiredModalOpen(true)}
            />
          )}
          {!isImageEditorOpen && view === 'loading' && (
            <LoadingPanel progress={loadingState.progress} message={loadingState.message} />
          )}
          {!isImageEditorOpen && view === 'result' && generatedImage && (
            <ImageResultPanel
              imageSrc={generatedImage}
              masterImageNoText={masterImageNoText || generatedImage}
              options={currentImageOptions}
              qualityCheckResults={qualityCheckResults}
              prompt={generatedPrompt}
              onOutpainting={handleOutpainting}
              isOutpainting={isOutpainting}
              onBack={() => { setView('welcome'); setIsPanelOpen(true); }}
              onDecline={() => setIsFormatManagerOpen(true)}
              allPresets={allPresets}
              currentUser={currentUser}
              onLogout={handleLogout}
              onOpenAuthModal={handleOpenAuthModal}
              onOpenAccountModal={() => setIsAccountModalOpen(true)}
              onOpenPricingModal={() => setIsPricingModalOpen(true)}
              textLayers={textLayers}
              setTextLayers={setTextLayers}
              partnerZone={partnerZone}
              setPartnerZone={setPartnerZone}
              partnerLogos={partnerLogos}
              setPartnerLogos={setPartnerLogos}
              isLeftPanelOpen={isPanelOpen}
              onRequestCloseLeftPanel={() => setIsPanelOpen(false)}
              isFormatManagerOpen={isFormatManagerOpen}
              onGoHome={handleGoHome}
              onOpenImageEditor={handleOpenImageEditor} // NEW PROP to open the editor
            />
          )}
        </main>
      </div>
      
      <Toast message={toastMessage} />

      {/* MODAL WINDOWS (only render if image editor is not open, if they should overlay) */}
      {!isImageEditorOpen && (
        <>
          <FormatManager
            isOpen={isFormatManagerOpen}
            onClose={() => setIsFormatManagerOpen(false)}
            mainImageSrc={generatedImage || ''}
            mainImageOptions={currentImageOptions}
            onGenerate={handleGenerateAdaptations}
            isGenerating={isGeneratingAdaptations}
            derivedImages={derivedImages}
            setDerivedImages={setDerivedImages}
            allPresets={allPresets}
            textLayers={textLayers}
            partnerZone={partnerZone}
            partnerLogos={partnerLogos}
          />

          <PromptEditorModal
            isOpen={isPromptEditorOpen}
            onClose={() => setIsPromptEditorOpen(false)}
            history={promptHistory}
            onSendMessage={handleRefinePrompt}
            isAssistantResponding={isAssistantResponding}
            onFinalize={handleFinalizePrompt}
          />

          <PricingModal
            isOpen={isPricingModalOpen}
            onClose={() => setIsPricingModalOpen(false)}
            currentUser={currentUser}
            onLogout={handleLogout}
            onOpenAuthModal={handleOpenAuthModal}
            onOpenAccountModal={() => setIsAccountModalOpen(true)}
            onPurchase={handlePurchase}
          />

          <AccountModal
            isOpen={isAccountModalOpen}
            onClose={() => setIsAccountModalOpen(false)}
            currentUser={currentUser}
            onUpdateUser={handleUpdateUser}
            onLogout={handleLogout}
            onDeleteAccount={handleDeleteAccount}
            onPurchase={handlePurchase}
            onOpenPricingModal={() => setIsPricingModalOpen(true)}
          />
          
          {/* REMOVED: ModificationConfirmationModal */}
          
          <AuthModal 
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
            onLogin={handleLogin}
            onSignup={handleSignup}
            initialMode={initialAuthMode}
            onDevLogin={handleDevLogin}
          />

          <ApiBlockErrorModal
              isOpen={!!apiBlockError}
              message={apiBlockError}
              prompt={failedPrompt}
              onClose={closeApiBlockErrorModal}
              onGoToStudio={goToStudioFromError}
          />

          <LoginRequiredModal
            isOpen={isLoginRequiredModalOpen}
            onClose={() => setIsLoginRequiredModalOpen(false)}
            onLogin={() => handleOpenAuthModal('login')}
            onSignup={() => handleOpenAuthModal('signup')}
          />

          <InsufficientCreditsModal
            isOpen={isInsufficientCreditsModalOpen}
            onClose={() => setIsInsufficientCreditsModalOpen(false)}
            onGoToPricing={() => {
                setIsInsufficientCreditsModalOpen(false);
                setIsPricingModalOpen(true);
            }}
            required={requiredCreditsInfo?.required ?? 0}
            has={requiredCreditsInfo?.has ?? 0}
          />

          <ConfirmationModal // Moved outside conditional rendering
              isOpen={isConfirmationModalOpen}
              onClose={() => setIsConfirmationModalOpen(false)}
              onConfirm={startGeneration}
              options={options}
              allPresets={allPresets}
              isLoading={isGenerating}
              cost={calculateGenerationCost(options)}
          />
        </>
      )}
    </div>
  );
};
export default App;
