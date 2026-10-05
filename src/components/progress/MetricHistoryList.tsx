import type { MetricMeasurement } from '../../types/metrics-overview';

interface MetricHistoryListProps {
  measurements: MetricMeasurement[];
  unit: string | null;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Traitement éditorial (§15), même langage que /poids : plus de grande
// border/bg-white englobant toute la liste — uniquement `border-t` +
// `divide-y`. Ordre le plus récent d'abord : conforme à l'ordre déjà renvoyé
// par l'API (measuredAt DESC), donc pas de nouveau tri ici.
function MetricHistoryList({ measurements, unit }: MetricHistoryListProps) {
  if (measurements.length === 0) {
    return null;
  }

  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-ekvara-muted">Historique</h3>
      <ul className="mt-4 divide-y divide-gray-200 border-t border-gray-200">
        {measurements.map((measurement) => (
          <li key={measurement.id} className="flex items-baseline justify-between gap-4 py-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-ekvara-black">
                {formatDate(measurement.measuredAt)}
              </p>
              {measurement.comment && <p className="mt-1 text-xs text-ekvara-muted">{measurement.comment}</p>}
              {measurement.coachUserId !== null && (
                <span className="mt-1 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs text-ekvara-black/70">
                  Mesure encadrée
                </span>
              )}
            </div>
            <p className="flex-shrink-0 font-display text-xl font-bold leading-none tabular-nums text-ekvara-black">
              {measurement.value}
              {unit && <span className="ml-1 font-sans text-sm font-normal text-ekvara-muted">{unit}</span>}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default MetricHistoryList;
