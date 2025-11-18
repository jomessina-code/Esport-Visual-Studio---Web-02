import React from 'react';
import UserMenu from './UserMenu';
import type { CurrentUser } from '../types';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: CurrentUser | null;
  onLogout: () => void;
  onOpenAuthModal: (mode: 'login' | 'signup') => void;
  onOpenAccountModal: () => void;
  onPurchase: (pack: { name: string, price: string, credits: number }) => void;
}

const packs = [
  { name: 'Découverte', price: '4,90 €', credits: 100, approx: '~20 visuels', priceId: 'decouverte' },
  { name: 'Créateur', price: '9,90 €', credits: 200, approx: '~40 visuels', priceId: 'createur' },
  { name: 'Pro Gamer', price: '24,90 €', credits: 500, approx: '~100 visuels', priceId: 'progamer' },
  { name: 'Association', price: '44,90 €', credits: 1000, approx: '~200 visuels', priceId: 'association' },
];

const PricingModal: React.FC<PricingModalProps> = ({ isOpen, onClose, currentUser, onLogout, onOpenAuthModal, onOpenAccountModal, onPurchase }) => {
  if (!isOpen) return null;

  const handleBuyClick = (pack: typeof packs[0]) => {
    if (currentUser) {
        onPurchase(pack);
    } else {
        onOpenAuthModal('signup');
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in-up"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div 
        className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex-shrink-0 p-6 flex justify-between items-start border-b border-gray-700">
          <div>
            <h2 className="text-2xl font-bold font-orbitron text-purple-300">Tarification & Crédits</h2>
            <p className="text-gray-400">Simple. Flexible. Sans abonnement.</p>
          </div>
          <div className="flex items-center gap-4">
              {currentUser ? (
                 <UserMenu
                    currentUser={currentUser}
                    onLogout={onLogout}
                    onOpenAccountModal={onOpenAccountModal}
                    onOpenPricingModal={() => {}}
                 />
              ) : (
                <>
                  <button 
                      onClick={() => onOpenAuthModal('login')}
                      className="font-bold text-gray-300 hover:text-white transition-colors cursor-pointer hover:underline text-sm"
                  >
                      Se connecter
                  </button>
                  <button
                      onClick={() => onOpenAuthModal('signup')}
                      className="font-bold bg-purple-600 hover:bg-purple-700 text-white py-2 px-3 rounded-lg transition-colors cursor-pointer text-sm"
                  >
                      S'inscrire
                  </button>
                </>
              )}
            <button onClick={onClose} className="text-gray-400 hover:text-white text-3xl leading-none">&times;</button>
          </div>
        </header>

        <main className="flex-grow p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
                 <p className="text-gray-300">
                    Esport Visual Studio utilise un système de crédits : tu paies uniquement ce que tu consommes, visuel par visuel.
                  </p>

                  <section>
                    <h3 className="text-lg font-semibold text-white font-orbitron mb-3">Coût des actions</h3>
                    <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                      <ul className="space-y-2 text-gray-300">
                        <li className="flex justify-between items-center"><span>Génération d'image</span> <span className="font-bold text-purple-400">5 crédits</span></li>
                        <li className="flex justify-between items-center"><span>Variation ou modification</span> <span className="font-bold text-purple-400">3 crédits</span></li>
                        <li className="flex justify-between items-center"><span>Création d'univers personnalisé</span><span className="font-bold text-green-400">Gratuit</span></li>
                        <li className="flex justify-between items-center"><span>Déclinaison de format</span><span className="font-bold text-green-400">Gratuit</span></li>
                      </ul>
                    </div>
                  </section>
                  
                  <section>
                    <h3 className="text-lg font-semibold text-white font-orbitron mb-3">Avantages</h3>
                     <ul className="text-gray-300 list-inside space-y-1">
                        <li><span className="text-yellow-300">✨</span> 20 crédits offerts à l’inscription</li>
                        <li><span className="text-yellow-300">✨</span> Aucun abonnement automatique</li>
                        <li><span className="text-yellow-300">✨</span> 5 Crédits bonus lors d'un parrainage d'un(e) ami(e)</li>
                    </ul>
                  </section>
            </div>
            
            <div className="space-y-4">
                 <h3 className="text-lg font-semibold text-white font-orbitron mb-3">Packs de crédits</h3>
                 {packs.map((pack) => (
                    <div key={pack.name} className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 flex items-center justify-between gap-4">
                        <div>
                            <h4 className="font-bold text-white">{pack.name}</h4>
                            <p className="text-sm text-purple-300">{pack.credits} crédits</p>
                            <p className="text-xs text-gray-400">{pack.approx}</p>
                        </div>
                        <div className="text-right">
                           <p className="text-lg font-bold text-white mb-2">{pack.price}</p>
                           <button 
                                onClick={() => handleBuyClick(pack)}
                                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-6 rounded-lg transition text-sm">
                                Acheter
                            </button>
                        </div>
                    </div>
                 ))}
                 <p className="text-xs text-center text-gray-500 pt-2">Les paiements sont sécurisés par Stripe. Les crédits n'expirent jamais.</p>
            </div>
        </main>
      </div>
    </div>
  );
};

export default PricingModal;