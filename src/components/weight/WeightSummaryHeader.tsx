import type { WeightSummaryResponse } from '../../types/weight';
import StatValue from '../ui/StatValue';

interface WeightSummaryHeaderProps {
  summary: WeightSummaryResponse | null;
  loading: boolean;
  error: string | null;
}

function formatWeight(value: number): string {
  return value.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
}

function formatSignedWeight(value: number): string {
  if (value === 0) return '0 kg';
  const sign = value > 0 ? '+' : '';
  return `${sign}${formatWeight(value)} kg`;
}

function formatMeasuredAt(measuredAt: string): string {
  const date = new Date(measuredAt);
  const datePart = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${datePart} à ${hours}h${minutes}`;
}

// Section éditoriale "Synthèse" (§5) : plus de grande card blanche englobante.
// Stats secondaires construites dynamiquement (jamais un tableau fixe de 3
// cellules) : Objectif/Écart n'existent que si `target` est réellement
// renseigné, "Cette semaine" seulement si `weeklyChange` n'est pas null —
// mêmes conditions strictement que l'implémentation précédente, uniquement
// regroupées pour piloter un `divide-x` (fin séparateur vertical, actif à
// partir de sm où les cellules tiennent sur une seule rangée).
function WeightSummaryHeader({ summary, loading, error }: WeightSummaryHeaderProps) {
  const secondaryStats: { label: string; value: string }[] = [];
  if (summary?.target) {
    secondaryStats.push({ label: 'Objectif', value: `${formatWeight(summary.target.weight)} kg` });
  }
  if (summary?.target && summary.differenceToTarget !== null) {
    secondaryStats.push({ label: 'Écart', value: formatSignedWeight(summary.differenceToTarget) });
  }
  if (summary?.weeklyChange !== null && summary?.weeklyChange !== undefined) {
    secondaryStats.push({ label: 'Cette semaine', value: formatSignedWeight(summary.weeklyChange) });
  }

  return (
    <div>
      {loading && <p className="text-sm text-ekvara-muted">Chargement...</p>}

      {!loading && error && (
        <p className="text-sm text-red-600">Impossible de charger le résumé de poids pour le moment.</p>
      )}

      {!loading && !error && summary && summary.currentWeight === null && (
        <div>
          <p className="text-sm font-medium text-ekvara-black">Aucune pesée enregistrée</p>
          <p className="mt-1 text-sm text-ekvara-muted">Ajoute une première pesée pour commencer ton suivi.</p>
        </div>
      )}

      {!loading && !error && summary && summary.currentWeight !== null && (
        <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <StatValue value={formatWeight(summary.currentWeight)} label="kg" />
            {summary.measuredAt && (
              <p className="mt-2 text-sm text-ekvara-muted">{formatMeasuredAt(summary.measuredAt)}</p>
            )}
          </div>

          {secondaryStats.length > 0 && (
            <div className="grid grid-cols-2 gap-y-4 sm:grid-cols-3 sm:gap-y-0 sm:divide-x sm:divide-gray-200">
              {secondaryStats.map((stat) => (
                <div key={stat.label} className="sm:px-6 sm:first:pl-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ekvara-muted">
                    {stat.label}
                  </p>
                  {/* Jamais de coloration morale du signe : neutre, quelle que soit
                      la direction de la variation. */}
                  <p className="mt-1 font-display text-xl font-bold text-ekvara-black">{stat.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default WeightSummaryHeader;
