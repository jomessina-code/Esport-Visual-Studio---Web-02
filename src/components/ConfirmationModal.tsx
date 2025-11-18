
import React from 'react';
import type { EsportPromptOptions, UniversePreset, PromptChangeSummary } from '../types';
import SpinnerIcon from './icons/SpinnerIcon';
import { CHARACTER_SHOTS } from '../constants/options';
import { validatePromptOptions } from '../utils/validation';
import WarningIcon from './icons/WarningIcon';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  options: EsportPromptOptions;
  allPresets: UniversePreset[];
  isLoading: boolean;
  cost: number;
}

const SummaryItem: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => {
  if (!value && typeof value !== 'boolean') return null;
  return (
    <div>
      <p className="text-sm text-gray-400">{label}</p>
      <p className="text-md text-white font-semibold">{String(value)}</p>
    </div>
  );
};

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  options,
  allPresets,
  isLoading,
  cost,
}) => {
  if (!isOpen) return null;

  const validationErrors = validatePromptOptions(options, allPresets);
  const hasErrors = validationErrors.length > 0;

  const selectedUniverses = allPresets
    .filter(p => options.universes.includes(p.id))
    .map(p => p.label)
    .join(', ');

  const hasTextContent = options.eventName || options.baseline || options.eventLocation || options.eventDate;
  const shouldDisplayText = !options.hideText && hasTextContent;

  const isSizedElement = options.visualElements === "Personnage central" ||
                         options.visualElements === "Duo de joueurs" ||
                         options.visualElements === "Logo ou trophée";
  
  const isCharacterSubject = options.visualElements === "Personnage central" ||
                           options.visualElements === "Duo de joueurs";
  const characterShotLabel = CHARACTER_SHOTS.find(s => s.value === options.characterShot)?.label;

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in-up"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex-shrink-0 p-6 flex justify-between items-center border-b border-gray-700">
          <h2 className="text-xl font-bold font-orbitron text-purple-300">
            Récapitulatif de ta création
          </h2>
          <button onClick={onClose} disabled={isLoading} className="text-gray-400 hover:text-white text-3xl leading-none">&times;</button>
        </header>

        <main className="flex-grow p-6 overflow-y-auto space-y-6">
          {hasErrors && (
            <div className="bg-yellow-900/50 border border-yellow-700 p-4 rounded-lg space-y-2">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-yellow-300 font-orbitron">
                <WarningIcon className="w-6 h-6" />
                Instructions contradictoires détectées
              </h3>
              <ul className="list-disc list-inside space-y-1 text-yellow-200 text-sm pl-2">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
              <p className="text-xs text-yellow-400 pt-2">Corrige ces points dans le studio avant de lancer la génération pour obtenir les meilleurs résultats.</p>
            </div>
          )}

          <section className="space-y-4 bg-gray-900/50 p-4 rounded-lg border border-gray-700">
            <h3 className="text-lg font-semibold text-purple-200 font-orbitron mb-3">Univers & Sujet</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SummaryItem label="Univers" value={selectedUniverses || "Personnalisé"} />
              <SummaryItem label="Sujet Principal" value={options.visualElements} />
               {isCharacterSubject && options.characterShot && (
                  <SummaryItem label="Plan du personnage" value={characterShotLabel} />
              )}
              {options.visualElementDescriptions.length > 0 && (
                <SummaryItem label="Description du sujet" value={options.visualElementDescriptions.join(' + ')} />
              )}
              {isSizedElement && (
                 <SummaryItem label="Taille du sujet" value={`${options.elementSize ?? 75}% de la hauteur`} />
              )}
            </div>
          </section>

          <section className="space-y-4 bg-gray-900/50 p-4 rounded-lg border border-gray-700">
            <h3 className="text-lg font-semibold text-purple-200 font-orbitron mb-3">Style & Ambiance</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SummaryItem label="Type de jeu" value={options.gameType} />
              <SummaryItem label="Style Graphique" value={options.graphicStyle} />
              <SummaryItem label="Ambiance / Éclairage" value={options.ambiance || "Automatique"} />
              <SummaryItem label="Intensité des effets" value={`${options.effectsIntensity}%`} />
              {options.inspirationImage && <SummaryItem label="Image d'inspiration" value="Oui" />}
            </div>
          </section>

          <section className="space-y-4 bg-gray-900/50 p-4 rounded-lg border border-gray-700">
            <h3 className="text-lg font-semibold text-purple-200 font-orbitron mb-3">Format & Finitions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SummaryItem label="Format" value={options.format} />
              <SummaryItem label="Résolution" value={options.highResolution ? "Haute Définition" : "Standard"} />
              {options.transparentBackground && <SummaryItem label="Fond" value="Transparent (PNG)" />}
              {options.reservePartnerZone && <SummaryItem label="Zone Logos" value={`Oui, en ${options.partnerZonePosition === 'bottom' ? 'bas' : 'haut'} (${options.partnerZoneHeight}%)`} />}
            </div>
          </section>

          <section className="space-y-4 bg-gray-900/50 p-4 rounded-lg border border-gray-700">
            <h3 className="text-lg font-semibold text-purple-200 font-orbitron mb-3">Informations de l'événement</h3>
            {shouldDisplayText ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SummaryItem label="Événement" value={options.eventName} />
                <SummaryItem label="Slogan" value={options.baseline} />
                <SummaryItem label="Lieu" value={options.eventLocation} />
                <SummaryItem label="Date" value={options.eventDate} />
              </div>
            ) : (
              <p className="text-gray-400 italic">Aucun texte ne sera affiché sur le visuel.</p>
            )}
          </section>

        </main>

        <footer className="flex-shrink-0 p-6 flex justify-end items-center gap-4 border-t border-gray-700">
          <div className="flex-grow text-sm text-gray-400">
            Coût de la génération : <span className="font-bold text-purple-300">{cost} crédits</span>
          </div>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading || hasErrors}
            className="w-1/2 flex items-center justify-center bg-purple-600 hover:bg-purple-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition"
          >
            {isLoading ? <><SpinnerIcon className="w-5 h-5" /> Lancement...</> : 'Confirmer & Générer'}
          </button>
        </footer>
      </div>
    </div>
  );
};


interface ModificationConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  summary: PromptChangeSummary | null;
  isLoading: boolean;
  cost: number;
}

export const ModificationConfirmationModal: React.FC<ModificationConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  summary,
  isLoading,
  cost
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in-up"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex-shrink-0 p-6 flex justify-between items-center border-b border-gray-700">
          <h2 className="text-xl font-bold font-orbitron text-purple-300">
            Confirmation de la modification
          </h2>
          <button onClick={onClose} disabled={isLoading} className="text-gray-400 hover:text-white text-3xl leading-none">&times;</button>
        </header>

        <main className="flex-grow p-6 overflow-y-auto space-y-6">
          {isLoading || !summary ? (
            <div className="flex flex-col items-center justify-center text-center py-10">
                <SpinnerIcon className="w-12 h-12 text-purple-400 mb-4" />
                <p className="text-lg text-gray-300">J'analyse ta demande et je prépare le nouveau brief créatif...</p>
            </div>
          ) : (
            <>
                <p className="text-gray-300">Voici comment j'ai interprété ta demande de modification. Confirmes-tu ces changements ?</p>
                <section className="space-y-4 bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                    <h3 className="text-lg font-semibold text-green-400 font-orbitron">Éléments conservés</h3>
                    <ul className="list-disc list-inside space-y-1 text-gray-300">
                        {summary.kept.map((item, index) => <li key={`kept-${index}`}>{item}</li>)}
                    </ul>
                </section>
                <section className="space-y-4 bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                    <h3 className="text-lg font-semibold text-yellow-400 font-orbitron">Éléments modifiés</h3>
                     <ul className="list-disc list-inside space-y-1 text-gray-300">
                        {summary.changed.map((item, index) => <li key={`changed-${index}`}>{item}</li>)}
                    </ul>
                </section>
            </>
          )}
        </main>

        <footer className="flex-shrink-0 p-6 flex justify-end items-center gap-4 border-t border-gray-700">
            <div className="flex-grow text-sm text-gray-400">
                Coût de la modification : <span className="font-bold text-purple-300">{cost} crédits</span>
            </div>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading || !summary}
            className="w-1/2 flex items-center justify-center bg-purple-600 hover:bg-purple-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition"
          >
            {isLoading && !summary ? <><SpinnerIcon className="w-5 h-5" /> Analyse...</> : 'Confirmer & Modifier'}
          </button>
        </footer>
      </div>
    </div>
  );
};

// --- NEW MODAL FOR LOGIN REQUIRED ---

interface LoginRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: () => void;
  onSignup: () => void;
}

export const LoginRequiredModal: React.FC<LoginRequiredModalProps> = ({ isOpen, onClose, onLogin, onSignup }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in-up" onClick={onClose}>
      <div className="relative bg-gray-800 rounded-lg shadow-2xl w-full max-w-md p-8 border border-gray-700 text-center" onClick={e => e.stopPropagation()}>
        <button 
            onClick={onClose} 
            className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl leading-none"
            aria-label="Fermer"
        >
            &times;
        </button>
        <h2 className="text-xl font-bold font-orbitron text-purple-300 mb-4">Connexion requise</h2>
        <p className="text-gray-300 mb-6">
          Pour créer un univers ou générer un visuel, tu dois t'inscrire. L’inscription est gratuite et t'offre 20 crédits.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <button onClick={() => { onClose(); onSignup(); }} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition">S'inscrire</button>
          <button onClick={() => { onClose(); onLogin(); }} className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition">Se connecter</button>
        </div>
      </div>
    </div>
  );
};


// --- NEW MODAL FOR INSUFFICIENT CREDITS ---

interface InsufficientCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoToPricing: () => void;
  required: number;
  has: number;
}

export const InsufficientCreditsModal: React.FC<InsufficientCreditsModalProps> = ({ isOpen, onClose, onGoToPricing, required, has }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in-up" onClick={onClose}>
      <div className="relative bg-gray-800 rounded-lg shadow-2xl w-full max-w-md p-8 border border-yellow-700 text-center" onClick={e => e.stopPropagation()}>
        <button 
            onClick={onClose} 
            className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl leading-none"
            aria-label="Fermer"
        >
            &times;
        </button>
        <h2 className="text-xl font-bold font-orbitron text-yellow-300 mb-4">Crédits insuffisants</h2>
        <p className="text-gray-300 mb-2">
          Vous n’avez plus assez de crédits pour cette action.
        </p>
        <div className="text-gray-400 mb-6 space-y-1 bg-gray-900/50 p-3 rounded-lg">
            <p>Crédits disponibles : <span className="font-bold text-white">{has}</span></p>
            <p>Crédits nécessaires : <span className="font-bold text-white">{required}</span></p>
        </div>
        <p className="text-gray-300 mb-6">
            Souhaitez-vous acheter un pack de crédits ?
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <button onClick={onGoToPricing} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition">Acheter des crédits</button>
          <button onClick={onClose} className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition">Annuler</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
