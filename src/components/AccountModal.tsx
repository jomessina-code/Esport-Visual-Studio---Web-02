
import React, { useState, useEffect } from 'react';
import type { CurrentUser } from '../types';
import SpinnerIcon from './icons/SpinnerIcon';
import TrashIcon from './icons/TrashIcon';
import IdentificationIcon from './icons/IdentificationIcon';
import CreditCardIcon from './icons/CreditCardIcon';
import Cog6ToothIcon from './icons/Cog6ToothIcon';
import ShieldCheckIcon from './icons/ShieldCheckIcon';
import QuestionMarkCircleIcon from './icons/QuestionMarkCircleIcon';
import UserIcon from './icons/UserIcon';
import CalendarIcon from './icons/CalendarIcon';
import ChevronDownIcon from './icons/ChevronDownIcon';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: CurrentUser | null;
  onUpdateUser: (updates: Partial<Pick<CurrentUser, 'pseudo'>>) => Promise<void>;
  onLogout: () => void;
  onDeleteAccount: () => void;
  onPurchase: (pack: { name: string, price: string, credits: number }) => void;
  onOpenPricingModal: () => void;
}

const Section: React.FC<{ title: string, icon: React.ReactElement<any>, children: React.ReactNode }> = ({ title, icon, children }) => (
    <section className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
        <h3 className="text-lg font-semibold text-purple-200 font-orbitron mb-4 flex items-center gap-3">
            {React.cloneElement(icon, { className: 'w-5 h-5' })}
            {title}
        </h3>
        <div className="space-y-4">
            {children}
        </div>
    </section>
);

const ConfirmationDialog: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  children: React.ReactNode;
  confirmText: string;
  isDestructive?: boolean;
}> = ({ isOpen, onClose, onConfirm, title, children, confirmText, isDestructive }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4" onClick={onClose}>
            <div className={`bg-gray-800 rounded-lg shadow-2xl w-full max-w-md p-6 border ${isDestructive ? 'border-red-700' : 'border-gray-700'}`} onClick={e => e.stopPropagation()}>
                <h3 className={`text-xl font-bold font-orbitron ${isDestructive ? 'text-red-400' : 'text-purple-300'} mb-4`}>{title}</h3>
                <div className="text-gray-300 space-y-4 mb-6">{children}</div>
                <div className="flex justify-end gap-4">
                    <button onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition">Annuler</button>
                    <button onClick={onConfirm} className={`${isDestructive ? 'bg-red-600 hover:bg-red-700' : 'bg-purple-600 hover:bg-purple-700'} text-white font-bold py-2 px-4 rounded-lg transition`}>{confirmText}</button>
                </div>
            </div>
        </div>
    );
};


const AccountModal: React.FC<AccountModalProps> = ({ isOpen, onClose, currentUser, onUpdateUser, onLogout, onDeleteAccount, onPurchase, onOpenPricingModal }) => {
    const [pseudo, setPseudo] = useState(currentUser?.pseudo || '');
    const [isSaving, setIsSaving] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [isFinalDeleteConfirmOpen, setIsFinalDeleteConfirmOpen] = useState(false);
    const [deleteInput, setDeleteInput] = useState('');
    
    useEffect(() => {
        if (currentUser) {
            setPseudo(currentUser.pseudo);
        }
        if (!isOpen) {
            setIsDeleteConfirmOpen(false);
            setIsFinalDeleteConfirmOpen(false);
            setDeleteInput('');
            setIsHistoryOpen(false);
        }
    }, [currentUser, isOpen]);

    const handleSaveProfile = async () => {
        setIsSaving(true);
        await onUpdateUser({ pseudo });
        setIsSaving(false);
    };
    
    const handleDelete = () => {
        onDeleteAccount();
        onClose();
    };

    const handleBuyCredits = () => {
        onClose();
        onOpenPricingModal();
    };

    if (!isOpen || !currentUser) return null;

    return (
        <>
            <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in-up" onClick={onClose}>
                <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-gray-700" onClick={(e) => e.stopPropagation()}>
                    <header className="flex-shrink-0 p-6 flex justify-between items-center border-b border-gray-700">
                        <h2 className="text-2xl font-bold font-orbitron text-purple-300">Mon Compte</h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-white text-3xl leading-none">&times;</button>
                    </header>

                    <main className="flex-grow p-6 overflow-y-auto custom-scrollbar space-y-6">
                        <Section title="Informations Personnelles" icon={<IdentificationIcon />}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center">
                                        <UserIcon className="w-8 h-8 text-gray-400" />
                                    </div>
                                    <div>
                                        <label htmlFor="pseudo" className="block text-sm font-medium text-gray-400 mb-1">Pseudo</label>
                                        <input
                                            id="pseudo"
                                            type="text"
                                            value={pseudo}
                                            onChange={(e) => setPseudo(e.target.value)}
                                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div>
                                        <p className="text-sm font-medium text-gray-400">Email</p>
                                        <p className="text-white bg-gray-700/50 px-3 py-2 rounded-md">{currentUser.email}</p>
                                    </div>
                                </div>
                            </div>
                             <div className="flex justify-end">
                                <button onClick={handleSaveProfile} disabled={isSaving || pseudo === currentUser.pseudo} className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition">
                                    {isSaving ? <SpinnerIcon className="w-5 h-5"/> : 'Enregistrer'}
                                </button>
                            </div>
                        </Section>
                        
                        <Section title="Crédits & Historique" icon={<CreditCardIcon />}>
                            <div className="bg-gray-700/50 p-4 rounded-lg flex items-center justify-between mb-2">
                                <div>
                                    <p className="text-sm text-gray-400">Solde actuel</p>
                                    <p className="text-2xl font-bold text-white">{currentUser.credits} crédits</p>
                                </div>
                                <button onClick={handleBuyCredits} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition">
                                    Acheter des crédits
                                </button>
                            </div>
                            
                            <div className="mt-6">
                                <button 
                                    onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                                    className="w-full flex items-center justify-between text-sm font-semibold text-gray-300 mb-3 hover:text-white transition-colors focus:outline-none"
                                >
                                    <div className="flex items-center gap-2">
                                        <CalendarIcon className="w-4 h-4 text-gray-500" />
                                        Historique des achats
                                    </div>
                                    <ChevronDownIcon className={`w-4 h-4 transition-transform duration-200 ${isHistoryOpen ? 'rotate-180' : ''}`} />
                                </button>
                                
                                {isHistoryOpen && (
                                    <>
                                        {currentUser.purchasesHistory.length > 0 ? (
                                            <div className="bg-gray-900/30 rounded-lg border border-gray-700 overflow-hidden max-h-60 overflow-y-auto custom-scrollbar animate-fade-in-up" style={{ animationDuration: '200ms' }}>
                                                {[...currentUser.purchasesHistory]
                                                    .sort((a, b) => b.date - a.date)
                                                    .map((purchase) => (
                                                    <div key={purchase.id} className="p-3 border-b border-gray-700 last:border-0 hover:bg-gray-800/50 transition-colors">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div>
                                                                <p className="font-bold text-white text-sm">{purchase.packName}</p>
                                                                <p className="text-xs text-gray-500 capitalize">
                                                                    {new Date(purchase.date).toLocaleString('fr-FR', {
                                                                        year: 'numeric',
                                                                        month: 'long',
                                                                        day: 'numeric',
                                                                        hour: '2-digit',
                                                                        minute: '2-digit'
                                                                    })}
                                                                </p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-purple-400 font-bold text-sm">+{purchase.creditsAdded} Crédits</p>
                                                                <p className="text-xs text-gray-400">{purchase.amount}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex justify-between items-center">
                                                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-900/20 text-green-400 border border-green-900/30">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                                                Réussi
                                                            </span>
                                                            <button className="text-xs text-gray-500 hover:text-gray-300 transition-colors underline decoration-gray-600 hover:decoration-gray-400">
                                                                Voir le reçu
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="bg-gray-900/30 rounded-lg border border-gray-700 p-6 text-center animate-fade-in-up" style={{ animationDuration: '200ms' }}>
                                                <p className="text-gray-500 text-sm">Aucun achat de crédits pour le moment.</p>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </Section>
                        
                        <Section title="Préférences" icon={<Cog6ToothIcon />}>
                           <p className="text-gray-500 text-sm">Les options de préférences (thème, langue, notifications) seront bientôt disponibles ici.</p>
                        </Section>
                        
                        <Section title="Sécurité & Confidentialité" icon={<ShieldCheckIcon />}>
                           <div className="bg-red-900/30 p-4 rounded-lg border border-red-700 flex items-center justify-between gap-4">
                                <div>
                                    <h4 className="font-semibold text-red-300">Supprimer le compte</h4>
                                    <p className="text-sm text-red-400 mt-1">Cette action est irréversible et entraînera la suppression de toutes vos données.</p>
                                </div>
                                <button onClick={() => setIsDeleteConfirmOpen(true)} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition flex-shrink-0">
                                    Supprimer
                                </button>
                           </div>
                        </Section>

                        <Section title="Support & Aide" icon={<QuestionMarkCircleIcon />}>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                <a href="#" className="bg-gray-700/50 hover:bg-gray-700 p-3 rounded-lg text-purple-300 font-semibold transition-colors">Contacter le support</a>
                                <a href="#" className="bg-gray-700/50 hover:bg-gray-700 p-3 rounded-lg text-purple-300 font-semibold transition-colors">FAQ</a>
                                <a href="#" className="bg-gray-700/50 hover:bg-gray-700 p-3 rounded-lg text-purple-300 font-semibold transition-colors">Suggérer une idée</a>
                                <a href="#" className="bg-gray-700/50 hover:bg-gray-700 p-3 rounded-lg text-purple-300 font-semibold transition-colors">Rejoindre Discord</a>
                            </div>
                        </Section>
                    </main>
                </div>
            </div>

            <ConfirmationDialog
                isOpen={isDeleteConfirmOpen}
                onClose={() => setIsDeleteConfirmOpen(false)}
                onConfirm={() => { setIsDeleteConfirmOpen(false); setIsFinalDeleteConfirmOpen(true); }}
                title="Êtes-vous sûr ?"
                confirmText="Continuer"
                isDestructive
            >
                <p>Ceci est la première étape pour supprimer votre compte. Cette action est définitive et toutes vos données, y compris vos crédits restants et vos créations, seront perdues.</p>
            </ConfirmationDialog>
            
             <ConfirmationDialog
                isOpen={isFinalDeleteConfirmOpen}
                onClose={() => setIsFinalDeleteConfirmOpen(false)}
                onConfirm={handleDelete}
                title="Confirmation Finale"
                confirmText="Supprimer Définitivement"
                isDestructive
            >
                <p>Pour confirmer la suppression de votre compte, veuillez taper <strong className="text-white">SUPPRIMER</strong> dans le champ ci-dessous.</p>
                 <input
                    type="text"
                    value={deleteInput}
                    onChange={(e) => setDeleteInput(e.target.value)}
                    placeholder='SUPPRIMER'
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                 {deleteInput !== 'SUPPRIMER' && <p className="text-xs text-yellow-400 mt-2">Le bouton de suppression sera activé une fois le mot correctement saisi.</p>}
            </ConfirmationDialog>

        </>
    );
};

export default AccountModal;
