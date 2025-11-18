import React, { useEffect, useState } from 'react';
import WarningIcon from './icons/WarningIcon';
import { analyzeBlockedPrompt } from '../services/geminiService';
import SpinnerIcon from './icons/SpinnerIcon';

interface ApiBlockErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoToStudio: () => void;
  message: string | null;
  prompt: string | null;
}

const ApiBlockErrorModal: React.FC<ApiBlockErrorModalProps> = ({
  isOpen,
  onClose,
  onGoToStudio,
  message,
  prompt,
}) => {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    // Reset analysis when modal is closed
    if (!isOpen) {
      setAnalysis(null);
      setIsAnalyzing(false);
      return;
    }

    // Trigger analysis when modal opens with a prompt
    if (prompt && !analysis && !isAnalyzing) {
      const getAnalysis = async () => {
        setIsAnalyzing(true);
        try {
          const result = await analyzeBlockedPrompt(prompt);
          setAnalysis(result);
        } catch (error) {
          console.error("Failed to analyze blocked prompt:", error);
          setAnalysis("L'analyse automatique du brief créatif a échoué. Essaie de simplifier ta description en te basant sur le message d'erreur général.");
        } finally {
          setIsAnalyzing(false);
        }
      };
      getAnalysis();
    }
  }, [isOpen, prompt, analysis, isAnalyzing]);


  if (!isOpen || !message) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in-up"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-2xl flex flex-col border border-red-700"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex-shrink-0 p-6 flex justify-between items-center border-b border-gray-700">
          <h2 className="flex items-center gap-3 text-xl font-bold font-orbitron text-red-400">
            <WarningIcon className="w-6 h-6" />
            Génération Bloquée par l'IA
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-3xl leading-none">&times;</button>
        </header>

        <main className="flex-grow p-6 space-y-4 overflow-y-auto max-h-[60vh]">
          <p className="text-gray-300">
            L'IA a bloqué cette génération. Voici la raison fournie :
          </p>
          <div className="text-yellow-200 bg-yellow-900/50 border border-yellow-700 p-3 rounded-md text-sm">
            {message.replace('La génération a été bloquée : ', '')}
          </div>
          
          <div className="border-t border-gray-700 my-4"></div>

          <h3 className="text-lg font-semibold text-purple-200 font-orbitron">
            Analyse par l'IA
          </h3>

          {isAnalyzing ? (
            <div className="flex items-center gap-3 text-gray-400">
                <SpinnerIcon className="w-5 h-5" />
                <span>Analyse du brief créatif en cours pour trouver la cause...</span>
            </div>
          ) : analysis ? (
             <div className="text-gray-300 bg-gray-900/50 border border-gray-700 p-4 rounded-md text-sm space-y-2 whitespace-pre-wrap">
                {analysis}
             </div>
          ) : (
            <p className="text-sm text-gray-500">L'analyse n'a pas pu être lancée.</p>
          )}
        </main>

        <footer className="flex-shrink-0 p-6 flex justify-end items-center gap-4 border-t border-gray-700">
          <button
            type="button"
            onClick={onGoToStudio}
            className="w-full flex items-center justify-center bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg transition"
          >
            Retourner au Studio pour modifier
          </button>
        </footer>
      </div>
    </div>
  );
};

export default ApiBlockErrorModal;