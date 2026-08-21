import Button from '../ui/Button';
import type { Goal } from '../../types/goal';

interface GoalSummaryCardProps {
  goal: Goal;
  badge?: { label: string; className: string };
  onReactivate?: () => void;
  reactivating?: boolean;
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

// Même transformation purement présentationnelle que PrimaryGoalPanel (§8) :
// "long_terme" -> "long terme", jamais l'underscore brut affiché.
function formatGoalType(type: string): string {
  return type.replace(/_/g, ' ');
}

// Même calcul strictement que PrimaryGoalPanel (§9) : null si la date cible
// est passée, jamais de "J--12".
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

// Ligne éditoriale (§19-21) réutilisée par les 3 sections secondaires (autres
// actifs, atteints, abandonnés) : plus de grille de cards bordées — un simple
// séparateur fourni par le conteneur (`divide-y`). Jamais de lime en grande
// surface ni de bordure englobante : le badge (petite pill) suffit à porter
// le statut, toujours doublé du texte réel (jamais la couleur seule).
function GoalSummaryCard({ goal, badge, onReactivate, reactivating }: GoalSummaryCardProps) {
  const daysUntilLabel = goal.dateCible ? getDaysUntilLabel(goal.dateCible) : null;
  const progressLabel =
    goal.progress.percentage === null
      ? 'Aucune étape définie'
      : `${goal.progress.percentage} % · ${goal.progress.completed} / ${goal.progress.total} étapes`;

  return (
    <li className="py-5">
      {goal.type && (
        <p className="text-xs font-semibold uppercase tracking-wide text-ekvara-muted">
          {formatGoalType(goal.type)}
        </p>
      )}

      <div className="mt-1 flex items-start justify-between gap-4">
        <p className="font-display text-lg font-bold text-ekvara-black">{goal.titre}</p>

        <div className="flex flex-shrink-0 items-center gap-2">
          {badge && (
            <span
              className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.className}`}
            >
              {badge.label}
            </span>
          )}
          {daysUntilLabel && (
            <span className="whitespace-nowrap rounded-full bg-ekvara-black px-2.5 py-1 text-xs font-semibold text-ekvara-surface">
              {daysUntilLabel}
            </span>
          )}
        </div>
      </div>

      {goal.dateCible && <p className="mt-1 text-xs text-ekvara-muted">{formatDate(goal.dateCible)}</p>}

      <p className="mt-2 text-sm text-ekvara-muted">{progressLabel}</p>

      {onReactivate && (
        <Button type="button" variant="ghost" onClick={onReactivate} disabled={reactivating} className="mt-2">
          {reactivating ? 'Réactivation...' : 'Réactiver'}
        </Button>
      )}
    </li>
  );
}

export default GoalSummaryCard;
