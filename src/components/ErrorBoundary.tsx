
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // You can also log the error to an error reporting service
    console.error("Uncaught error in component:", error, errorInfo);
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="fixed inset-0 bg-red-900 text-white flex flex-col items-center justify-center p-6 text-center z-[9999]">
          <h2 className="text-2xl font-bold font-orbitron mb-4">Oups! Quelque chose a mal tourné.</h2>
          <p className="text-lg text-red-200 mb-6">
            Un problème est survenu lors du chargement de l'application. Veuillez réessayer.
          </p>
          {this.state.error && (
            <div className="bg-red-800 p-4 rounded-lg text-sm text-left max-w-lg mb-6">
              <p className="font-semibold mb-2">Détails de l'erreur :</p>
              <pre className="whitespace-pre-wrap break-words text-red-100">
                {this.state.error.message || 'Erreur inconnue'}
              </pre>
            </div>
          )}
          <button 
            onClick={() => window.location.reload()} 
            className="bg-white text-red-700 hover:bg-red-100 font-bold py-2 px-6 rounded-lg transition-colors"
          >
            Recharger l'application
          </button>
        </div>
      );
    }

    // Fix: Explicitly cast `this` to any to avoid TS error "Property 'props' does not exist on type 'ErrorBoundary'"
    return (this as any).props.children;
  }
}

export default ErrorBoundary;