interface CompetitionListRowProps {
  dateDebut: string;
  nom: string;
  metaLine: string | null;
  rightLabel: string | null;
  highlight?: boolean;
  onClick: () => void;
}

function formatShortDate(dateString: string): string {
  const [year, month, day] = dateString.slice(0, 10).split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }).replace('.', '').toUpperCase();
}

// Ligne éditoriale partagée par "À venir" et "Passées" (§12/§13) : plus de
// card bordée par compétition, un simple séparateur fin fourni par le
// conteneur (`divide-y`). Réutilise la navigation /competitions/:id déjà
// existante, jamais un nouveau système.
function CompetitionListRow({ dateDebut, nom, metaLine, rightLabel, highlight, onClick }: CompetitionListRowProps) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-start gap-4 py-3 text-left transition-colors hover:bg-gray-50"
      >
        <p className="w-12 flex-shrink-0 pt-0.5 font-display text-sm font-bold text-ekvara-black">
          {formatShortDate(dateDebut)}
        </p>

        <div className="min-w-0 flex-1">
          <p className="font-medium text-ekvara-black">{nom}</p>
          {metaLine && <p className="mt-0.5 text-sm text-ekvara-muted">{metaLine}</p>}
        </div>

        <span className="flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap pt-0.5 text-sm font-semibold text-ekvara-black/80">
          {highlight && (
            <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-ekvara-lime" aria-hidden="true" />
          )}
          {rightLabel}
          <span className="text-ekvara-muted" aria-hidden="true">
            →
          </span>
        </span>
      </button>
    </li>
  );
}

export default CompetitionListRow;
