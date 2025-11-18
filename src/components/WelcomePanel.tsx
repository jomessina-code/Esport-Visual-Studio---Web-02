import React from 'react';
import UserMenu from './UserMenu';
import type { CurrentUser } from '../types';
import ExampleGallery from './ExampleGallery';

const EVS_LOGO_URL = "https://i.postimg.cc/nVCRVCHb/logo-EVSV2.png";

interface WelcomePanelProps {
  onOpenPricingModal: () => void;
  currentUser: CurrentUser | null;
  onLogout: () => void;
  onOpenAuthModal: (mode: 'login' | 'signup') => void;
  onOpenAccountModal: () => void;
  onOpenStudio: () => void;
  onRequireLogin: () => void;
}

const WelcomePanel: React.FC<WelcomePanelProps> = ({ onOpenPricingModal, currentUser, onLogout, onOpenAuthModal, onOpenAccountModal, onOpenStudio, onRequireLogin }) => {

  return (
    <div className="h-full flex flex-col bg-gray-900 p-6 text-center overflow-y-auto custom-scrollbar">
      <header className="w-full flex justify-end flex-shrink-0 mb-6">
          <div className="text-right text-sm flex items-center gap-4">
               <a 
                  href="#" 
                  onClick={(e) => e.preventDefault()} 
                  className="font-bold text-gray-400 hover:text-white transition-colors cursor-pointer"
                  aria-label="Switch to English (coming soon)"
               >
                  EN
               </a>
              <span className="text-gray-600">|</span>
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
      </header>
      <div className="flex-grow flex flex-col items-center justify-center">
        <div className="w-full max-w-4xl mx-auto">
            <img 
              src={EVS_LOGO_URL} 
              alt="Logo Esport Visual Studio" 
              className="h-[120px] w-auto mx-auto mb-6"
            />
            <h1 className="text-4xl font-bold text-white font-orbitron mb-4">Esport Visual Studio</h1>
            <p className="text-lg text-gray-400 mb-8">
              Crée facilement des visuels gaming uniques pour tes tournois, streams, équipes<br />
              ou simplement pour partager ton univers avec ta communauté.
            </p>
            <div className="space-y-12">
              <div className="bg-black/20 p-6 rounded-lg border border-purple-800/50">
                  <div className="text-5xl mb-2 pulse-emoji text-yellow-300">✨</div>
                  <h3 className="font-bold text-xl text-gray-300 font-orbitron mb-4">Comment ça marche ?</h3>
                  <div className="space-y-2 text-left max-w-3xl mx-auto text-gray-400">
                    <p><strong className="text-purple-300 font-bold mr-2">1.</strong>Utilise le Studio de Création à gauche pour définir ton univers, ton style et ton ambiance.</p>
                    <p><strong className="text-purple-300 font-bold mr-2">2.</strong>Clique sur « ✨ Générer le visuel ✨ » pour créer ta composition.</p>
                    <p><strong className="text-purple-300 font-bold mr-2">3.</strong>Ajoute du texte si tu veux personnaliser ton visuel.</p>
                    <p><strong className="text-purple-300 font-bold mr-2">4.</strong>Télécharge ton visuel ou adapte-le à différents formats (affiche, carré, story, bannière, etc.).</p>
                  </div>
              </div>

              <div className="bg-black/20 p-6 rounded-lg border border-purple-800/50">
                  <h3 className="font-bold text-2xl text-gray-200 font-orbitron mb-6 text-center">
                      Galerie d'Inspiration
                  </h3>
                  <ExampleGallery 
                    onImageClick={onOpenStudio} 
                    currentUser={currentUser}
                    onLoginRequest={onRequireLogin}
                  />
              </div>

              <div className="bg-black/20 p-6 rounded-lg border border-purple-800/50 text-center">
                  <h3 className="font-bold text-xl text-gray-300 font-orbitron">Tarification</h3>
                  <div className="text-center mt-4 text-gray-400">
                    <p className="text-center">Un système simple, transparent et flexible.</p>
                    <p className="text-center">Pas d’abonnement, juste des crédits pour donner vie à ta créativité.</p>
                  </div>
                  <button onClick={onOpenPricingModal} className="mt-4 text-purple-400 hover:text-purple-300 font-semibold transition-colors">
                    En savoir plus
                  </button>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomePanel;
