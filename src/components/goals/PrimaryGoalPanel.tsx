import { useEffect, useState } from 'react';
import GoalRoadmap from './GoalRoadmap';
import SectionLabel from '../ui/SectionLabel';
import { updateGoalStatus } from '../../services/athletes.api';
import type { Goal, GoalStatus } from '../../types/goal';

interface PrimaryGoalPanelProps {
  athleteId: string;
  goal: Goal;
  onChanged: () => void;
}

function parseDateOnly(dateCible: string): Date {
  const [year, month, day] = dateCible.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(dateCible: string): string {
  return parseDateOnly(dateCible).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// Transformation purement présentationnelle (§8) : "long_terme" -> "long
// terme" (puis mis en capitales par la classe CSS `uppercase`) — jamais la
// valeur backend brute avec underscore affichée telle quelle.
function formatGoalType(type: string): string {
  return type.replace(/_/g, ' ');
}

// null si la date cible est passée : jamais de "J--12", jamais de décision
// automatique sur le statut à partir de la seule date (cf. §13 de la consigne).
function getDaysUntilLabel(dateCible: string): string | null {
  const targetDate = parseDateOnly(dateCible);
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const diffDays = Math.round((targetDate.getTime() - startOfToday.getTime()) / 86_400_000);

  if (diffDays < 0) return null;
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return 'J-1';
  return `J-${diffDays}`;
}

function PrimaryGoalPanel({ athleteId, goal, onChanged }: PrimaryGoalPanelProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<'abandonne' | null>(null);
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  function closeMenu() {
    setIsMenuOpen(false);
    setPendingConfirm(null);
  }

  // Même fermeture clavier que le menu profil du Header (Escape), en plus du
  // clic extérieur ; annule aussi une confirmation d'abandon en attente.
  useEffect(() => {
    if (!isMenuOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      setIsMenuOpen(false);
      setPendingConfirm(null);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isMenuOpen]);

  function handleStatusChange(statut: GoalStatus) {
    setStatusError(null);
    setStatusSubmitting(true);

    updateGoalStatus(athleteId, goal.id, statut)
      .then(() => {
        closeMenu();
        onChanged();
      })
      .catch((error: Error) => {
        console.error("Erreur lors du changement de statut de l'objectif", error);
        setStatusError('Impossible de mettre à jour le statut pour le moment.');
      })
      .finally(() => {
        setStatusSubmitting(false);
      });
  }

  const daysUntilLabel = goal.dateCible ? getDaysUntilLabel(goal.dateCible) : null;

  return (
    <div>
      <SectionLabel>Objectif principal</SectionLabel>

      {(goal.type || daysUntilLabel) && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <div>
            {goal.type && (
              <p className="text-xs font-semibold uppercase tracking-wide text-ekvara-muted">
                {formatGoalType(goal.type)}
              </p>
            )}
          </div>
          {daysUntilLabel && (
            <span className="flex-shrink-0 whitespace-nowrap rounded-full bg-ekvara-black px-2.5 py-1 text-xs font-semibold text-ekvara-surface">
              {daysUntilLabel}
            </span>
          )}
        </div>
      )}

      <div className="mt-2 flex items-start justify-between gap-4">
        <h2 className="text-balance font-display text-2xl font-extrabold tracking-tight text-ekvara-black sm:text-3xl">
          {goal.titre}
        </h2>

        <div className="relative flex-shrink-0">
          <button
            type="button"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-label="Actions sur l'objectif"
            aria-haspopup="true"
            aria-expanded={isMenuOpen}
            className="-mr-2 flex h-11 w-11 items-center justify-center rounded-md text-xl text-ekvara-black/55 transition-colors hover:bg-gray-100 hover:text-ekvara-black"
          >
            ⋯
          </button>

          {isMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={closeMenu} />
              <div className="absolute right-0 z-50 mt-2 w-64 rounded-md border border-gray-200 bg-white p-2 shadow-lg">
                {pendingConfirm === 'abandonne' ? (
                  <div className="p-2">
                    <p className="text-sm text-ekvara-black/80">Confirmer l'abandon de cet objectif ?</p>
                    <div className="mt-3 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setPendingConfirm(null)}
                        disabled={statusSubmitting}
                        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-ekvara-black/70 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Annuler
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatusChange('abandonne')}
                        disabled={statusSubmitting}
                        className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {statusSubmitting ? '...' : 'Oui, abandonner'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handleStatusChange('atteint')}
                      disabled={statusSubmitting}
                      className="block w-full rounded-md px-2 py-2 text-left text-sm text-ekvara-black/80 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Marquer comme atteint
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingConfirm('abandonne')}
                      disabled={statusSubmitting}
                      className="block w-full rounded-md px-2 py-2 text-left text-sm text-red-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Abandonner l'objectif
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {statusError && <p className="mt-2 text-sm text-red-600">{statusError}</p>}

      {goal.description && <p className="mt-3 text-sm text-ekvara-black/70">{goal.description}</p>}

      {goal.dateCible && <p className="mt-3 text-sm text-ekvara-muted">{formatDate(goal.dateCible)}</p>}

      {goal.progress.percentage === null ? (
        <p className="mt-6 text-sm text-ekvara-muted">Aucune étape définie</p>
      ) : (
        <div className="mt-8">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-display text-4xl font-extrabold text-ekvara-black">
              {goal.progress.percentage}%
            </span>
            <span className="text-sm text-ekvara-muted">
              {goal.progress.completed} / {goal.progress.total} étapes
            </span>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div className="h-full rounded-full bg-ekvara-lime" style={{ width: `${goal.progress.percentage}%` }} />
          </div>
        </div>
      )}

      <div className="mt-10">
        <SectionLabel>Roadmap</SectionLabel>
        <div className="mt-6">
          <GoalRoadmap athleteId={athleteId} goalId={goal.id} steps={goal.steps} finalLabel={goal.titre} onChanged={onChanged} />
        </div>
      </div>
    </div>
  );
}

export default PrimaryGoalPanel;
