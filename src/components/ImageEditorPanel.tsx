import React, { useState } from 'react';
import SpinnerIcon from './icons/SpinnerIcon';
import TrashIcon from './icons/TrashIcon';
import { editImage } from '../services/geminiService'; // New service function
import { CREDIT_COSTS } from '../constants/costs';
import { SparklesIcon } from './icons/CheckIcon'; // Using Sparkles for generate button
import UserMenu from './UserMenu';
import type { CurrentUser } from '../types'; 
import { useVoiceToText } from '../hooks/useVoiceToText'; // Import voice-to-text hook
import MicrophoneIcon from './icons/MicrophoneIcon'; // Import MicrophoneIcon
import SendIcon from './icons/SendIcon'; // Import SendIcon

const EVS_LOGO_URL = "https://i.postimg.cc/nVCRVCHb/logo-EVSV2.png";

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

const ImageEditorPanel: React.FC<ImageEditorPanelProps> = ({
  originalImageBase64,
  originalImageMimeType,
  onClose,
  currentUser,
  onAttemptAction,
  saveCurrentUser,
  onLogout,
  onOpenAuthModal,
  onOpenAccountModal,
  onOpenPricingModal,
  onImageValidated, // NEW PROP
}) => {
  const [editedImageBase64, setEditedImageBase64] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null); // State for voice errors

  const { isRecording, isCorrecting, toggleRecording } = useVoiceToText({
    onCorrectedTranscript: (correctedTranscript: string) => {
        setPrompt(correctedTranscript);
    },
    onError: (error) => setVoiceError(error),
  });

  const handleToggleRecording = () => {
    setVoiceError(null); // Clear previous voice error
    if (!isRecording) {
        setPrompt(''); // Clear prompt when starting new recording
    }
    toggleRecording();
  };

  const executePromptAction = async () => {
    if (!prompt.trim()) {
      setError("Merci de décrire la modification à appliquer.");
      return;
    }
    if (!originalImageBase64) {
      setError("Aucune image originale détectée.");
      return;
    }
    
    // Stop recording if active before submitting prompt
    if (isRecording) {
      toggleRecording(); // This will trigger onCorrectedTranscript if there was speech
      // The actual generation will be triggered after transcription is done if prompt is valid
    }

    // Call onAttemptAction which handles credit checks and then runs the async action
    onAttemptAction(CREDIT_COSTS.VARIATION, async () => {
      setError(null);
      setIsLoading(true);
      setEditedImageBase64(null); // Clear previous edited image
      
      try {
        const resultBase64 = await editImage(originalImageBase64, originalImageMimeType, prompt);
        setEditedImageBase64(resultBase64);

        // Credit deduction is handled by onAttemptAction before this callback runs successfully.
        // It implicitly calls saveCurrentUser after a successful deduction.
      } catch (err: any) {
        // Specific error for composition too altered is hard to detect from API response directly.
        // For now, any non-API_KEY_INVALID error is treated as a generic failure.
        if (err.message === 'API_KEY_INVALID') {
            // This error is handled by App.tsx, just re-throw
            throw err;
        } else {
            setError(err.message || "Une erreur est survenue pendant l'édition de l'image.");
        }
      } finally {
        setIsLoading(false);
      }
    });
  };

  const handleClear = () => {
    setPrompt('');
    setEditedImageBase64(null);
    setError(null);
    setVoiceError(null);
    if (isRecording) {
      toggleRecording(); // Stop recording if active
    }
  };
  
  const handleValidate = () => {
    if (editedImageBase64) {
      onImageValidated(editedImageBase64, originalImageMimeType, prompt); // Pass the prompt
      onClose(); // Close the editor after validation
    } else {
      setError("Aucune image éditée à valider.");
    }
  };

  const handleLogoClick = () => {
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      executePromptAction();
    }
  };

  const getPlaceholderText = () => {
    if (isRecording) return "Enregistrement en cours...";
    if (isCorrecting) return "Transcription en cours...";
    return "Ex : remplace le personnage le dragon du fond par un dinosaure";
  };


  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      <header className="flex-shrink-0 p-4 flex justify-between items-center bg-gray-900/80 backdrop-blur-sm z-10 relative border-b border-gray-800">
        <button onClick={handleLogoClick} className="flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-purple-500 rounded-md -m-1 p-1">
          <img src={EVS_LOGO_URL} alt="Logo" className="h-8" />
          <h1 className="text-xl font-bold font-orbitron">Esport Visual Studio</h1>
        </button>
        <div className="text-right text-sm flex items-center gap-4">
          {currentUser ? (
            <UserMenu
                currentUser={currentUser}
                onLogout={onLogout}
                onOpenAccountModal={onOpenAccountModal}
                onOpenPricingModal={onOpenPricingModal}
            />
          ) : (
            <>
              <button 
                  onClick={() => onOpenAuthModal('login')}
                  className="font-bold text-gray-300 hover:text-white transition-colors cursor-pointer hover:underline"
              >
                  Se connecter
              </button>
              <button
                  onClick={() => onOpenAuthModal('signup')}
                  className="font-bold bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg transition-colors cursor-pointer"
              >
                  S'inscrire
              </button>
            </>
          )}
        </div>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white text-3xl leading-none" aria-label="Fermer la fenêtre">&times;</button>
      </header>

      <main className="flex-grow p-6 flex flex-col items-center justify-center space-y-6 overflow-y-auto">
        <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-6xl">
          {/* Original Image Column */}
          <div className="bg-slate-800 rounded-xl shadow-md flex flex-col">
            <h2 className="p-4 text-gray-300 font-semibold border-b border-gray-700">Original</h2>
            <div className="flex-grow flex items-center justify-center p-4">
              {originalImageBase64 ? (
                <img src={`data:${originalImageMimeType};base64,${originalImageBase64}`} alt="Original" className="max-w-full max-h-full object-contain rounded-lg" />
              ) : (
                <p className="text-gray-500">Aucune image originale chargée.</p>
              )}
            </div>
          </div>

          {/* Edited Image Column */}
          <div className="bg-slate-800 rounded-xl shadow-md flex flex-col">
            <h2 className="p-4 text-gray-300 font-semibold border-b border-gray-700">Modifié</h2>
            <div className="flex-grow flex items-center justify-center p-4">
              {isLoading ? (
                <div className="flex flex-col items-center">
                  <SpinnerIcon className="w-12 h-12 text-purple-400 mb-4" />
                  <p className="text-gray-400">Génération en cours...</p>
                </div>
              ) : editedImageBase64 ? (
                <img src={`data:${originalImageMimeType};base64,${editedImageBase64}`} alt="Modifié" className="max-w-full max-h-full object-contain rounded-lg" />
              ) : (
                <p className="text-gray-500">Image modifiée non disponible.</p>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="w-full max-w-6xl p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* This block is moved below the image display block */}
        <div className="w-full max-w-6xl flex flex-col gap-4 p-4 bg-slate-800 rounded-xl shadow-md">
            <p className="text-gray-300 font-semibold mb-2">Décris précisément la modification à appliquer</p>
            {voiceError && <p className="text-sm text-red-400 mb-2">{voiceError}</p>}
            <div className="flex items-center gap-2">
                <input
                    type="text"
                    className={`flex-grow bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 ${isRecording ? 'recording-glow' : ''}`}
                    placeholder={getPlaceholderText()}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isLoading || isRecording || isCorrecting}
                />
                <button
                    type="button"
                    onClick={handleToggleRecording}
                    disabled={isLoading || isCorrecting}
                    className={`w-12 h-12 flex-shrink-0 p-2 rounded-lg transition-colors duration-200 flex items-center justify-center ${isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-600 hover:bg-gray-500'}`}
                    aria-label={isRecording ? 'Arrêter l\'enregistrement' : 'Démarrer l\'enregistrement vocal'}
                >
                    <MicrophoneIcon className={`w-6 h-6 text-white ${isRecording ? 'animate-pulse' : ''}`} />
                </button>
                <button
                    type="button"
                    onClick={executePromptAction}
                    disabled={isLoading || isCorrecting || (!isRecording && !prompt.trim())}
                    className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-purple-600 hover:bg-purple-700 disabled:bg-gray-500 text-white font-bold rounded-lg transition"
                    aria-label={isRecording ? 'Arrêter et traiter la voix' : 'Générer la modification'}
                >
                    {isLoading || isCorrecting ? <SpinnerIcon className={`w-6 h-6 ${isCorrecting ? 'text-purple-400' : ''}`} /> : <SendIcon className="w-6 h-6" />}
                </button>
            </div>
            <div className="flex gap-4 flex-shrink-0 justify-end mt-4">
                <button
                    onClick={handleClear}
                    disabled={isLoading}
                    className="flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition disabled:bg-gray-500 disabled:cursor-not-allowed"
                >
                    <TrashIcon className="w-5 h-5" />
                    Effacer
                </button>
                <button
                    onClick={handleValidate}
                    disabled={isLoading || !editedImageBase64}
                    className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition disabled:bg-gray-500 disabled:cursor-not-allowed"
                >
                    Valider
                </button>
            </div>
        </div>
      </main>
    </div>
  );
};

export default ImageEditorPanel;