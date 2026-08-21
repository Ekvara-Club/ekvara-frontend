import type { MetricOverviewEntry, MetricStatus } from '../../types/metrics-overview';
import SectionLabel from '../ui/SectionLabel';

interface MetricsLedgerProps {
  metrics: MetricOverviewEntry[];
  loading: boolean;
  error: string | null;
  selectedId: string | null;
  onSelect: (metric: MetricOverviewEntry) => void;
}

const STATUS_LABELS: Record<MetricStatus, string> = {
  improved: 'En progression',
  stable: 'Stable',
  regressed: 'En baisse',
  unknown: 'Non évalué',
};

function formatPercentage(percentage: number): string {
  const sign = percentage > 0 ? '+' : '';
  return `${sign}${percentage.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;
}

// Ligne "performance ledger" (§3) : plus de grille de 6 cards identiques —
// chaque ligne reste un vrai bouton cliquable (logique de sélection
// inchangée). La sélection est signalée par un simple trait noir à gauche
// (largeur de bordure toujours réservée via `border-transparent`, jamais de
// décalage de layout au clic) — pas de grosse bordure, pas de fond lime.
//
// Le point lime ne dépend JAMAIS du signe de `delta`, uniquement du statut
// métier `improved` déjà fourni par le backend (§5/§10) — un temps de
// réaction qui baisse (420 → 380 ms) est une amélioration malgré un delta
// négatif.
function MetricRow({
  metric,
  selected,
  onSelect,
}: {
  metric: MetricOverviewEntry;
  selected: boolean;
  onSelect: () => void;
}) {
  const { currentValue, unit, status, percentage } = metric;
  const isImproved = status === 'improved';

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected ? 'true' : undefined}
        className={`grid w-full grid-cols-[16px_1fr] items-start gap-x-3 gap-y-1.5 border-l-2 py-4 pl-4 pr-2 text-left transition-colors sm:grid-cols-[16px_1fr_auto_auto] sm:items-center sm:gap-x-6 ${
          selected ? 'border-ekvara-black' : 'border-transparent hover:bg-gray-50'
        }`}
      >
        <span
          className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full sm:mt-0 ${
            isImproved ? 'bg-ekvara-lime' : 'border border-ekvara-black/20'
          }`}
          aria-hidden="true"
        />

        <p className="text-sm font-semibold uppercase tracking-wide text-ekvara-black">{metric.name}</p>

        {currentValue === null ? (
          <p className="col-start-2 text-sm text-ekvara-muted sm:col-start-3">Pas encore évaluée</p>
        ) : (
          <>
            <p className="col-start-2 font-display text-lg font-bold text-ekvara-black sm:col-start-3 sm:text-right">
              {currentValue}
              {unit && <span className="ml-1 font-sans text-xs font-normal text-ekvara-muted">{unit}</span>}
            </p>

            {status === 'unknown' ? (
              <p className="col-start-2 text-xs text-ekvara-muted sm:col-start-4">Pas assez de données</p>
            ) : (
              <p className="col-start-2 text-xs text-ekvara-black/70 sm:col-start-4 sm:text-right">
                {percentage !== null && `${formatPercentage(percentage)} · `}
                {STATUS_LABELS[status]}
              </p>
            )}
          </>
        )}
      </button>
    </li>
  );
}

function MetricsLedger({ metrics, loading, error, selectedId, onSelect }: MetricsLedgerProps) {
  return (
    <div>
      <SectionLabel>Capacités</SectionLabel>

      {loading && <p className="mt-4 text-sm text-ekvara-muted">Chargement...</p>}

      {!loading && error && <p className="mt-4 text-sm text-red-600">Impossible de charger la progression.</p>}

      {!loading && !error && metrics.length === 0 && (
        <p className="mt-4 text-sm text-ekvara-muted">Aucune capacité sportive suivie pour le moment.</p>
      )}

      {!loading && !error && metrics.length > 0 && (
        <ul className="mt-4 divide-y divide-gray-200 border-t border-gray-200">
          {metrics.map((metric) => (
            <MetricRow
              key={metric.id}
              metric={metric}
              selected={metric.id === selectedId}
              onSelect={() => onSelect(metric)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

export default MetricsLedger;
