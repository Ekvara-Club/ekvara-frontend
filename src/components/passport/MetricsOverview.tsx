import type { MetricOverviewEntry, MetricStatus } from '../../types/metrics-overview';
import SectionLabel from '../ui/SectionLabel';
import SkillsRadar from '../progress/SkillsRadar';

interface MetricsOverviewProps {
  metrics: MetricOverviewEntry[];
  loading: boolean;
  error: string | null;
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

// Ligne "performance ledger" (§5/§6) : plus de grille de 6 cards identiques.
// Grille CSS par ligne [indicateur, nom, valeur, évolution] à partir de sm
// (une seule rangée par ligne, donc pas de risque d'asymétrie comme sur une
// grille multi-lignes) ; sous sm, valeur et évolution repassent sous le nom
// (col-start-2) pour un empilement nom/valeur/évolution (§18).
//
// Le point lime ne dépend JAMAIS du signe de `delta`, uniquement du statut
// métier `improved` déjà fourni par le backend (§7) — un temps de réaction
// qui baisse (420 → 380 ms) est une amélioration malgré un delta négatif.
function MetricRow({ metric }: { metric: MetricOverviewEntry }) {
  const { currentValue, unit, status, percentage } = metric;
  const isImproved = status === 'improved';

  return (
    <div className="grid grid-cols-[16px_1fr] items-start gap-x-3 gap-y-1.5 border-l-2 border-transparent py-4 pl-4 pr-2 sm:grid-cols-[16px_1fr_7rem_13rem] sm:items-center sm:gap-x-6">
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
          <p className="col-start-2 font-display text-lg font-bold tabular-nums text-ekvara-black sm:col-start-3 sm:text-right">
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
    </div>
  );
}

function MetricsOverview({ metrics, loading, error }: MetricsOverviewProps) {
  return (
    <div>
      <SectionLabel>Capacités</SectionLabel>

      {loading && <p className="mt-4 text-sm text-ekvara-muted">Chargement...</p>}

      {!loading && error && (
        <p className="mt-4 text-sm text-red-600">Impossible de charger la progression pour le moment.</p>
      )}

      {!loading && !error && metrics.length === 0 && (
        <p className="mt-4 text-sm text-ekvara-muted">Aucune capacité sportive suivie pour le moment.</p>
      )}

      {!loading && !error && metrics.length > 0 && (
        <div className="mt-6">
          <SkillsRadar metrics={metrics} />
        </div>
      )}

      {!loading && !error && metrics.length > 0 && (
        <div className="mt-4 divide-y divide-gray-200 border-t border-gray-200">
          {metrics.map((metric) => (
            <MetricRow key={metric.id} metric={metric} />
          ))}
        </div>
      )}
    </div>
  );
}

export default MetricsOverview;
