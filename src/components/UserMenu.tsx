import React, { useState, useRef, useEffect } from 'react';
import UserIcon from './icons/UserIcon';
import LogoutIcon from './icons/LogoutIcon';
import ChevronDownIcon from './icons/ChevronDownIcon';
import type { CurrentUser } from '../types';

interface UserMenuProps {
  currentUser: CurrentUser;
  onLogout: () => void;
  onOpenAccountModal: () => void;
  onOpenPricingModal: () => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ currentUser, onLogout, onOpenAccountModal, onOpenPricingModal }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleOpenAccount = () => {
    setIsOpen(false);
    onOpenAccountModal();
  };
  
  const handleLogout = () => {
    setIsOpen(false);
    onLogout();
  }

  const handleBuyCredits = () => {
    setIsOpen(false);
    onOpenPricingModal();
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-700/50"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <UserIcon className="w-5 h-5" />
        <span className="font-semibold text-sm">{currentUser.pseudo}</span>
        <span className="text-xs bg-purple-800/80 text-purple-200 px-2 py-0.5 rounded-full">{currentUser.credits} C</span>
        <ChevronDownIcon className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-gray-800 rounded-lg shadow-lg z-20 border border-gray-700 animate-fade-in-up origin-top-right" style={{animationDuration: '150ms'}}>
            <ul className="p-2" role="menu" aria-orientation="vertical" aria-labelledby="user-menu-button">
            <li role="none">
              <button 
                onClick={handleOpenAccount} 
                className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm text-gray-300 rounded-md hover:bg-gray-700/80 hover:text-white transition-colors"
                role="menuitem"
              >
                <UserIcon className="w-5 h-5" />
                <span>Mon compte</span>
              </button>
            </li>
            <li role="none">
             <button 
                onClick={handleBuyCredits} 
                className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm text-gray-300 rounded-md hover:bg-gray-700/80 hover:text-white transition-colors"
                role="menuitem"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M8.433 7.418c.158-.103.335-.166.533-.166h5.05c.281 0 .506.204.555.474l1.43 5.432a.5.5 0 01-.465.679H9.497a.5.5 0 01-.465-.679l1.43-5.432a.5.5 0 01.028-.057zM11 11.25a.75.75 0 00-1.5 0v2.5a.75.75 0 001.5 0v-2.5z" />
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-5.903-4.101.447-1.691a.5.5 0 01.93.245l-.448 1.691a7.003 7.003 0 0010.95 1.54.75.75 0 011.09.828A8.503 8.503 0 014.097 13.899z" clipRule="evenodd" />
                </svg>
                <span>Acheter des crédits</span>
              </button>
            </li>
             <li role="none">
                <div className="h-px bg-gray-700 my-1"></div>
            </li>
            <li role="none">
              <button 
                onClick={handleLogout} 
                className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm text-gray-300 rounded-md hover:bg-gray-700/80 hover:text-white transition-colors"
                role="menuitem"
              >
                <LogoutIcon className="w-5 h-5" />
                <span>Déconnexion</span>
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default UserMenu;