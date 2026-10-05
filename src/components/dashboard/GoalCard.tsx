import type { ActiveGoalResponse } from '../../types/goal';
import { navigateTo } from '../../utils/navigation';
import Button from '../ui/Button';
import SectionLabel from '../ui/SectionLabel';

interface GoalCardProps {
  goal: ActiveGoalResponse | null;
  loading: boolean;
  error: string | null;
}

const MAX_VISIBLE_STEPS = 3;

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

// null pour une date cible dépassée : on masque le badge plutôt que d'afficher
// un "J--12" incohérent.
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

function GoalCard({ goal, loading, error }: GoalCardProps) {
  return (
    <div className="flex min-h-[240px] flex-col rounded-lg border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <SectionLabel>Objectif</SectionLabel>

      {loading && <p className="mt-6 text-sm text-ekvara-muted">Chargement...</p>}

      {!loading && error && (
        <p className="mt-6 text-sm text-red-600">Impossible de charger l'objectif.</p>
      )}

      {!loading && !error && !goal && (
        <div className="mt-6">
          <p className="text-sm font-medium text-ekvara-black">Aucun objectif en cours</p>
          <p className="mt-1 text-sm text-ekvara-muted">
            Ton coach peut te fixer un objectif pour structurer ta préparation.
          </p>
        </div>
      )}

      {!loading && !error && goal && (
        <div className="mt-4 flex flex-1 flex-col gap-4">
          <div>
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-display text-xl font-bold leading-snug text-ekvara-black">
                {goal.titre}
              </h3>
              {goal.dateCible && getDaysUntilLabel(goal.dateCible) && (
                <span className="whitespace-nowrap rounded-full bg-ekvara-black px-2.5 py-1 text-xs font-semibold text-ekvara-surface">
                  {getDaysUntilLabel(goal.dateCible)}
                </span>
              )}
            </div>
            {goal.dateCible && <p className="mt-1 text-sm text-ekvara-muted">{formatDate(goal.dateCible)}</p>}
          </div>

          {goal.progress.percentage === null ? (
            <p className="text-sm text-ekvara-muted">Aucune étape définie</p>
          ) : (
            <div>
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-display text-2xl font-extrabold text-ekvara-black">
                  {goal.progress.percentage}%
                </span>
                <span className="text-sm text-ekvara-muted">
                  {goal.progress.completed} / {goal.progress.total} étapes
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-ekvara-lime"
                  style={{ width: `${goal.progress.percentage}%` }}
                />
              </div>
            </div>
          )}

          {goal.steps.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ekvara-muted">
                Objectifs intermédiaires
              </p>
              <ul className="mt-2 flex flex-col gap-1.5 text-sm text-ekvara-black/80">
                {goal.steps.slice(0, MAX_VISIBLE_STEPS).map((step) => (
                  <li key={step.id} className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${
                        step.completed ? 'bg-ekvara-lime' : 'border border-gray-300'
                      }`}
                    />
                    {step.titre}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Button variant="ghost" onClick={() => navigateTo('/objectifs')} className="group mt-auto self-start pt-1">
            Voir les objectifs
            <span className="inline-block transition-transform group-hover:translate-x-0.5">→</span>
          </Button>
        </div>
      )}
    </div>
  );
}

export default GoalCard;
