import { Component, type ErrorInfo, type ReactNode } from 'react';
import Button from '../ui/Button';
import { handleNavClick } from '../../utils/navigation';

interface PageErrorBoundaryProps {
  // Change à chaque navigation : efface l'erreur sans remonter la page saine.
  resetKey: string;
  children: ReactNode;
}

interface PageErrorBoundaryState {
  hasError: boolean;
}

// Même règle que les cards du dashboard, à l'échelle d'une page : une erreur
// de rendu (ou un morceau de JS introuvable après un déploiement) ne doit pas
// laisser un écran blanc. Quitter la page fautive (resetKey = pathname)
// suffit à repartir propre.
class PageErrorBoundary extends Component<PageErrorBoundaryProps, PageErrorBoundaryState> {
  state: PageErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): PageErrorBoundaryState {
    return { hasError: true };
  }

  componentDidUpdate(prevProps: PageErrorBoundaryProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Erreur lors de l'affichage de la page", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div role="alert" className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ekvara-surface px-6 text-center">
        <p className="text-sm text-ekvara-muted">Cette page n'a pas pu s'afficher.</p>
        <div className="flex gap-3">
          <Button onClick={() => window.location.reload()}>Recharger la page</Button>
          <a
            href="/"
            onClick={(event) => handleNavClick(event, '/')}
            className="inline-flex items-center rounded-md px-4 py-2.5 font-sans text-sm font-medium text-ekvara-black hover:opacity-70"
          >
            Retour à l'accueil
          </a>
        </div>
      </div>
    );
  }
}

export default PageErrorBoundary;
