import { navigateTo } from '../../utils/navigation';
import Button from '../ui/Button';
import SectionLabel from '../ui/SectionLabel';
import StatValue from '../ui/StatValue';
import type { ProgressHighlightsResponse } from '../../types/progress';

interface ProgressCardProps {
  data: ProgressHighlightsResponse | null;
  loading: boolean;
  error: string | null;
}

// Le backend fournit déjà status = "improved" et un percentage positif quand la
// performance s'améliore (y compris pour une métrique "lower" comme le temps de
// réaction, où la valeur brute baisse). On ne se base donc jamais sur le signe
// de delta pour l'affichage, uniquement sur percentage/status déjà interprétés.
function formatPercentage(percentage: number): string {
  const sign = percentage >= 0 ? '+' : '';
  const formatted = percentage.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${sign}${formatted} %`;
}

function ProgressCard({ data, loading, error }: ProgressCardProps) {
  return (
    <div className="min-h-[240px] rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <SectionLabel>Progression</SectionLabel>

      {loading && <p className="mt-6 text-sm text-ekvara-muted">Chargement...</p>}

      {!loading && error && (
        <p className="mt-6 text-sm text-red-600">Impossible de charger la progression.</p>
      )}

      {!loading && !error && data && data.highlights.length === 0 && (
        <div className="mt-6">
          <p className="text-sm font-medium text-ekvara-black">Prochain bilan</p>
          <p className="mt-1 text-sm text-ekvara-muted">
            Tes nouvelles progressions apparaîtront ici après tes prochains tests.
          </p>
        </div>
      )}

      {!loading && !error && data && data.highlights.length > 0 && (
        <div className="mt-4 flex flex-col gap-4">
          <StatValue
            value={String(data.improvedCount)}
            label={`capacité${data.improvedCount > 1 ? 's' : ''} en progression`}
          />

          <ul className="flex flex-col gap-2 border-t border-gray-100 pt-3">
            {data.highlights.map((highlight) => (
              <li
                key={highlight.metricTypeId}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="flex items-center gap-2 font-medium text-ekvara-black">
                  {/* Rare accent lime : chaque ligne de ce highlight est déjà une
                      amélioration réelle (highlights = uniquement "improved" côté
                      backend), jamais un indicateur ajouté arbitrairement. */}
                  <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-ekvara-lime" aria-hidden="true" />
                  {highlight.name}
                </span>
                <span className="flex items-center gap-3 whitespace-nowrap text-ekvara-black/70">
                  <span>
                    {highlight.currentValue}
                    {highlight.unit ? ` ${highlight.unit}` : ''}
                  </span>
                  {highlight.percentage !== null && (
                    <span className="font-display font-bold text-ekvara-black">
                      {formatPercentage(highlight.percentage)}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>

          <Button variant="ghost" onClick={() => navigateTo('/progression')} className="group mt-1 self-start">
            Voir ma progression
            <span className="inline-block transition-transform group-hover:translate-x-0.5">→</span>
          </Button>
        </div>
      )}
    </div>
  );
}

export default ProgressCard;
