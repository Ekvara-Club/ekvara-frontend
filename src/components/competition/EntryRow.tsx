import type { CompetitionEntry } from '../../types/competition-entries';

interface EntryRowProps {
  entry: CompetitionEntry;
  index: number;
}

// Ligne éditoriale (§12) : jamais une card par inscrit. Le numéro est
// purement de présentation (même convention que ExerciseListItem) — dérivé
// de l'ordre affiché à l'instant du rendu, jamais stocké ni supposé stable.
// Aucune donnée absente (club/league/country null) n'est jamais inventée ou
// remplacée par un texte de repli.
function EntryRow({ entry, index }: EntryRowProps) {
  const number = String(index + 1).padStart(2, '0');
  const clubLeague = [entry.club, entry.league].filter(Boolean).join(' · ');

  return (
    <div className="flex flex-col gap-1 py-3.5 sm:flex-row sm:items-baseline sm:gap-4">
      <div className="flex items-baseline gap-3 sm:min-w-0 sm:flex-1">
        <span
          className="w-6 flex-shrink-0 font-display text-sm font-bold leading-none text-gray-300"
          aria-hidden="true"
        >
          {number}
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-ekvara-black">{entry.name}</p>
          {clubLeague && <p className="mt-0.5 text-sm text-ekvara-muted">{clubLeague}</p>}
        </div>
      </div>

      {entry.country && (
        <p className="flex-shrink-0 pl-9 text-sm text-ekvara-muted sm:pl-0 sm:text-right">{entry.country}</p>
      )}
    </div>
  );
}

export default EntryRow;
