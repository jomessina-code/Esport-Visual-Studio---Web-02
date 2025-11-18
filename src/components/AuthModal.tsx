import React, { useState, useEffect } from 'react';
import SpinnerIcon from './icons/SpinnerIcon';
import EyeIcon from './icons/EyeIcon';
import EyeSlashIcon from './icons/EyeSlashIcon';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (email: string, pass: string) => Promise<void>;
  onSignup: (email: string, pass: string, pseudo: string) => Promise<void>;
  initialMode?: 'login' | 'signup';
  onDevLogin: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLogin, onSignup, initialMode = 'login', onDevLogin }) => {
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [passConfirm, setPassConfirm] = useState('');
  const [pseudo, setPseudo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordShown, setPasswordShown] = useState(false);
  const [confirmPasswordShown, setConfirmPasswordShown] = useState(false);

  // Dev mode state
  const [devModeVisible, setDevModeVisible] = useState(false);
  const [devCode, setDevCode] = useState('');

  const resetForm = () => {
    setEmail('');
    setPass('');
    setPassConfirm('');
    setPseudo('');
    setError(null);
    setIsLoading(false);
    setPasswordShown(false);
    setConfirmPasswordShown(false);
    setDevCode('');
    setDevModeVisible(false);
  };
  
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
    } else {
      // When the modal is closed (either manually or after success), reset the form.
      // A timeout prevents a "flash" of empty fields before the modal animates out.
      const timer = setTimeout(() => {
        resetForm();
      }, 300); // Adjust to match closing animation duration
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialMode]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (mode === 'signup' && pass !== passConfirm) {
      setError("Les mots de passe ne correspondent pas.");
      setIsLoading(false);
      return;
    }

    try {
      if (mode === 'login') {
        await onLogin(email, pass);
      } else {
        await onSignup(email, pass, pseudo);
      }
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDevCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const code = e.target.value;
    setDevCode(code);
    if (code === '0530') {
        onDevLogin();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in-up"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-md flex flex-col border border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex-shrink-0 p-6 flex justify-between items-center border-b border-gray-700">
          <h2 className="text-xl font-bold font-orbitron text-purple-300">
            {mode === 'login' ? 'Connexion' : 'Inscription'}
          </h2>
          <button onClick={onClose} disabled={isLoading} className="text-gray-400 hover:text-white text-3xl leading-none">&times;</button>
        </header>

        <main className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-red-400 bg-red-900/50 p-3 rounded-md text-sm">{error}</p>}
            
            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1" htmlFor="pseudo">Pseudo</label>
                <input
                  id="pseudo"
                  type="text"
                  value={pseudo}
                  onChange={(e) => setPseudo(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1" htmlFor="password">Mot de passe</label>
              <div className="relative">
                <input
                  id="password"
                  type={passwordShown ? 'text' : 'password'}
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setPasswordShown(!passwordShown)}
                  className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-white"
                  aria-label={passwordShown ? "Cacher le mot de passe" : "Afficher le mot de passe"}
                >
                  {passwordShown ? <EyeSlashIcon className="w-5 h-5"/> : <EyeIcon className="w-5 h-5"/>}
                </button>
              </div>
            </div>

            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1" htmlFor="password-confirm">Confirmer le mot de passe</label>
                <div className="relative">
                  <input
                    id="password-confirm"
                    type={confirmPasswordShown ? 'text' : 'password'}
                    value={passConfirm}
                    onChange={(e) => setPassConfirm(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setConfirmPasswordShown(!confirmPasswordShown)}
                    className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-white"
                    aria-label={confirmPasswordShown ? "Cacher le mot de passe" : "Afficher le mot de passe"}
                  >
                    {confirmPasswordShown ? <EyeSlashIcon className="w-5 h-5"/> : <EyeIcon className="w-5 h-5"/>}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center bg-purple-600 hover:bg-purple-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition"
            >
              {isLoading ? <SpinnerIcon className="w-5 h-5" /> : (mode === 'login' ? 'Se connecter' : "S'inscrire")}
            </button>
          </form>
          
          <div className="text-center mt-4">
            <button
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); resetForm(); }}
              className="text-sm text-purple-400 hover:underline"
            >
              {mode === 'login' ? "Pas encore de compte ? S'inscrire" : "Déjà un compte ? Se connecter"}
            </button>
          </div>
        </main>
        
        <div className="px-6 pb-6 text-center border-t border-gray-700 pt-4">
            <button
                onClick={() => setDevModeVisible(!devModeVisible)}
                className="text-xs text-gray-500 hover:text-gray-400 transition-colors"
                aria-expanded={devModeVisible}
            >
                Mode développeur
            </button>
            {devModeVisible && (
                <div className="mt-4 animate-fade-in-up" style={{ animationDuration: '300ms' }}>
                    <input
                        type="password"
                        value={devCode}
                        onChange={handleDevCodeChange}
                        placeholder="Entrer le code secret..."
                        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-center placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        autoFocus
                    />
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;