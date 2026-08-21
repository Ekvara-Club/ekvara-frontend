import type { CompetitionEntryCategory } from '../../types/competition-entries';
import EntryRow from './EntryRow';

interface CategoryDisclosureRowProps {
  category: CompetitionEntryCategory;
  expanded: boolean;
  onToggle: () => void;
}

function formatEntryCount(count: number): string {
  return `${count} ${count === 1 ? 'inscrit' : 'inscrits'}`;
}

// Accordéon léger (§15) : state local au parent (selectedRawLabel), aucune
// nouvelle dépendance. Zone tactile généreuse (py-3.5) — pas de survol requis
// pour ouvrir/fermer.
function CategoryDisclosureRow({ category, expanded, onToggle }: CategoryDisclosureRowProps) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-4 py-3.5 text-left"
      >
        <span className="text-sm font-medium text-ekvara-black">{category.rawLabel}</span>
        <span className="flex flex-shrink-0 items-center gap-3 text-sm text-ekvara-muted">
          {formatEntryCount(category.entries.length)}
          <span
            className={`inline-block transition-transform ${expanded ? 'rotate-180' : ''}`}
            aria-hidden="true"
          >
            ⌄
          </span>
        </span>
      </button>

      {expanded && (
        <div className="divide-y divide-gray-100 border-t border-gray-100 pb-2">
          {category.entries.map((entry, index) => (
            <EntryRow key={entry.id} entry={entry} index={index} />
          ))}
        </div>
      )}
    </div>
  );
}

export default CategoryDisclosureRow;
