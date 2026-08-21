import type { MetricOverviewEntry, MetricStatus } from '../../types/metrics-overview';

interface MetricDetailProps {
  metric: MetricOverviewEntry;
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

function formatValue(value: number, unit: string | null): string {
  return unit ? `${value} ${unit}` : `${value}`;
}

function MetricDetail({ metric }: MetricDetailProps) {
  const { name, currentValue, previousValue, unit, status, percentage, direction } = metric;

  if (currentValue === null) {
    return (
      <div>
        <h2 className="font-display text-2xl font-bold text-ekvara-black">{name}</h2>
        <p className="mt-2 text-sm text-ekvara-muted">Aucune mesure enregistrée pour cette capacité.</p>
      </div>
    );
  }

  const isImproved = status === 'improved';

  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-wide text-ekvara-muted">{name}</p>

      <div className="mt-2 flex flex-wrap items-baseline gap-x-6 gap-y-1">
        <p className="font-display text-5xl font-extrabold leading-none tracking-tight text-ekvara-black">
          {currentValue}
          {unit && <span className="ml-2 font-sans text-lg font-medium text-ekvara-muted">{unit}</span>}
        </p>

        {previousValue !== null && (
          <p className="text-sm text-ekvara-muted">Précédente : {formatValue(previousValue, unit)}</p>
        )}
      </div>

      {status === 'unknown' ? (
        <p className="mt-3 text-sm text-ekvara-muted">
          {previousValue === null ? "Pas encore assez de mesures pour évaluer l'évolution." : 'Évolution non calculable.'}
        </p>
      ) : (
        <p className="mt-3 flex items-center gap-2 text-sm font-medium text-ekvara-black">
          {isImproved && (
            <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-ekvara-lime" aria-hidden="true" />
          )}
          {percentage !== null && `${formatPercentage(percentage)} — `}
          {STATUS_LABELS[status]}
        </p>
      )}

      {direction === 'higher' && (
        <p className="mt-3 text-sm text-ekvara-muted">Une valeur plus élevée indique une progression.</p>
      )}
      {direction === 'lower' && (
        <p className="mt-3 text-sm text-ekvara-muted">Une valeur plus basse indique une progression.</p>
      )}
    </div>
  );
}

export default MetricDetail;
