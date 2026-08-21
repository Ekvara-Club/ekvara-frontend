import { useEffect, useId, useRef, type ReactNode } from 'react';

// Coquille commune aux 5 modales existantes (AddWeightLogModal,
// CompetitionResultModal, AddTrainingModal, AddCompetitionModal,
// ExerciseDetailModal) : overlay + panel + header (titre + fermer). Chaque
// modale garde entièrement son propre formulaire/logique en `children` — ce
// composant ne fait que remplacer le bloc overlay/panel/header dupliqué à
// l'identique, jamais la structure interne (scroll, footer, étapes...).
//
// Le piège de focus clavier est centralisé ici (jamais dupliqué par modale) :
// Tab/Shift+Tab restent à l'intérieur du panneau, Escape ferme, le focus
// initial et sa restauration à la fermeture sont gérés automatiquement.
interface ModalProps {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  maxWidthClassName?: string;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Jamais mise en cache au montage : certaines modales changent entièrement de
// contenu après le montage (ex. AddCompetitionModal passe d'une liste de
// résultats à un formulaire une fois une compétition choisie) — recalculée à
// chaque interaction clavier pour rester exacte.
function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => el.offsetParent !== null,
  );
}

function Modal({ title, onClose, children, maxWidthClassName = 'max-w-md' }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  // Toujours à jour sans forcer un ré-attachement des listeners (l'effet ne
  // s'exécute qu'au montage/démontage, jamais à chaque frappe dans un champ
  // contrôlé du formulaire parent).
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    // Restauration à la fermeture : l'élément qui avait le focus juste avant
    // l'ouverture est forcément le déclencheur (bouton "+ Ajouter",
    // "Modifier le résultat"...), jamais besoin d'une ref passée par chaque
    // consommateur.
    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Focus initial : respecte un autoFocus déjà posé par le consommateur
    // (ex. le champ Titre d'AddTrainingModal, déjà focus au moment où cet
    // effet s'exécute) ; sinon le premier élément focusable du panneau ;
    // sinon le panneau lui-même (tabIndex=-1 ci-dessous).
    if (!panel.contains(document.activeElement)) {
      const [first] = getFocusableElements(panel);
      (first ?? panel).focus();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab' || !panel) return;

      const focusable = getFocusableElements(panel);
      if (focusable.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey) {
        if (active === first || !panel.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last || !panel.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    }

    // Filet de sécurité : si le focus se retrouve malgré tout hors du
    // panneau (ex. l'élément actif disparaît suite à un changement de
    // contenu), le ramener immédiatement à l'intérieur — jamais un élément de
    // la page derrière ne doit garder le focus pendant que la modale est
    // ouverte.
    function handleFocusIn(event: FocusEvent) {
      if (panel && !panel.contains(event.target as Node)) {
        const [first] = getFocusableElements(panel);
        (first ?? panel).focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('focusin', handleFocusIn);

    // Verrouillage du scroll de la page derrière ; le contenu interne du
    // panneau garde son propre scroll (overflow-y-auto déjà posé par chaque
    // consommateur sur son formulaire/contenu).
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('focusin', handleFocusIn);
      document.body.style.overflow = previousBodyOverflow;
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ekvara-black/60 px-4 py-8">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`flex max-h-full w-full ${maxWidthClassName} flex-col overflow-hidden rounded-lg bg-white shadow-lg`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 p-5">
          <h2 id={titleId} className="font-display text-lg font-bold text-ekvara-black">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="text-xl leading-none text-ekvara-muted transition-colors hover:text-ekvara-black"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default Modal;
