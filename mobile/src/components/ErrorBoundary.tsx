import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

// Filet de sécurité global : sans lui, une erreur de rendu non interceptée
// démonte tout l'arbre React et laisse un écran blanc, sans aucun message.
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Erreur non interceptée:', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (error) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center bg-white dark:bg-gray-900">
          <p className="text-4xl">⚠️</p>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Erreur de l'application</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 break-words max-w-xs">{error.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-primary-600 text-white px-6 py-3 rounded-full font-semibold"
          >
            Réessayer
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
