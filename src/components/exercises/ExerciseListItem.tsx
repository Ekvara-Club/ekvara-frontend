import type { Exercise } from '../../types/exercise';
import { getExerciseNiveauLabel, getExerciseTypeLabel } from '../../utils/exerciseOptions';

interface ExerciseListItemProps {
  exercise: Exercise;
  index: number;
  onSelect: (exercise: Exercise) => void;
}

// Un peu plus généreux qu'avant (100) : la bibliothèque passe de 3 à 2
// colonnes (§7), chaque élément dispose donc de plus de largeur réelle pour
// un extrait — reste un extrait, jamais la description complète tronquée
// pour une autre raison que la lisibilité de la liste.
const DESCRIPTION_EXCERPT_LENGTH = 160;

function getExcerpt(description: string | null): string | null {
  if (!description) return null;
  if (description.length <= DESCRIPTION_EXCERPT_LENGTH) return description;
  return `${description.slice(0, DESCRIPTION_EXCERPT_LENGTH).trimEnd()}…`;
}

// Numéro purement de présentation (§8) : dérivé de l'ordre du tableau filtré
// affiché à l'instant du rendu — jamais stocké, jamais un id, jamais supposé
// stable d'un rendu à l'autre (recherche/filtre change l'ordre affiché).
function ExerciseListItem({ exercise, index, onSelect }: ExerciseListItemProps) {
  const typeLabel = getExerciseTypeLabel(exercise.type_exercice);
  const niveauLabel = getExerciseNiveauLabel(exercise.niveau);
  const metaLine = [typeLabel, niveauLabel].filter(Boolean).join(' · ');
  const excerpt = getExcerpt(exercise.description);
  const number = String(index + 1).padStart(2, '0');

  return (
    <button
      type="button"
      onClick={() => onSelect(exercise)}
      className="group flex w-full items-start gap-4 border-b border-gray-200 py-5 text-left transition-colors hover:bg-gray-50"
    >
      <span
        className="w-10 flex-shrink-0 font-display text-2xl font-bold leading-none text-gray-300"
        aria-hidden="true"
      >
        {number}
      </span>

      <div className="min-w-0 flex-1">
        <h3 className="font-display text-lg font-bold uppercase tracking-tight text-ekvara-black">
          {exercise.titre}
        </h3>

        {metaLine && (
          <p className="mt-1.5 text-xs font-semibold uppercase tracking-wide text-ekvara-muted">{metaLine}</p>
        )}
        {exercise.panel_technique && (
          <p className="text-xs font-semibold uppercase tracking-wide text-ekvara-black/40">
            {exercise.panel_technique}
          </p>
        )}

        {excerpt && <p className="mt-2 text-sm text-ekvara-black/70">{excerpt}</p>}
      </div>

      <span
        className="flex-shrink-0 self-center text-ekvara-muted transition-transform group-hover:translate-x-0.5 group-hover:text-ekvara-black"
        aria-hidden="true"
      >
        →
      </span>
    </button>
  );
}

export default ExerciseListItem;
