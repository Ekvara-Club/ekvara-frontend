import type { WeightLog } from '../../types/weight';
import SectionLabel from '../ui/SectionLabel';

interface WeightHistoryListProps {
  logs: WeightLog[];
  loading: boolean;
  error: string | null;
}

interface HistoryEntry {
  log: WeightLog;
  variation: number | null;
}

function formatWeight(value: number): string {
  return value.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
}

// Jamais de jugement moral (une variation négative n'est pas "bonne" ou
// "mauvaise" en soi) : uniquement le chiffre signé.
function formatSignedVariation(value: number): string {
  if (value === 0) return '0 kg';
  const sign = value > 0 ? '+' : '';
  return `${sign}${formatWeight(value)} kg`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// Construit un tableau dérivé (jamais de mutation de `logs`, qui reste trié
// DESC pour les autres usages) : variation calculée en ordre chronologique
// ASC, puis ré-affiché du plus récent au plus ancien.
function buildHistoryEntries(logs: WeightLog[]): HistoryEntry[] {
  const ascending = [...logs].sort((a, b) => a.measuredAt.localeCompare(b.measuredAt));

  const withVariation: HistoryEntry[] = ascending.map((log, index) => ({
    log,
    variation: index === 0 ? null : round2(log.weight - ascending[index - 1].weight),
  }));

  return [...withVariation].reverse();
}

// Traitement éditorial (§15) : plus de grande border/bg-white englobant toute
// la liste — uniquement `border-t` + `divide-y`, cohérent avec /passeport et
// /activite. Le poids devient la valeur dominante de chaque ligne (Archivo,
// plus grand qu'avant), l'unité "kg" reste secondaire (inline, plus petite,
// muted) plutôt qu'accolée au même poids visuel que le chiffre.
function WeightHistoryList({ logs, loading, error }: WeightHistoryListProps) {
  const entries = buildHistoryEntries(logs);

  return (
    <div>
      <SectionLabel>Historique</SectionLabel>

      {loading && <p className="mt-4 text-sm text-ekvara-muted">Chargement...</p>}

      {!loading && error && (
        <p className="mt-4 text-sm text-red-600">Impossible de charger l'historique des pesées.</p>
      )}

      {!loading && !error && entries.length === 0 && (
        <p className="mt-4 text-sm text-ekvara-muted">Aucune pesée enregistrée.</p>
      )}

      {!loading && !error && entries.length > 0 && (
        <ul className="mt-4 divide-y divide-gray-200 border-t border-gray-200">
          {entries.map(({ log, variation }) => (
            <li key={log.id} className="flex items-start justify-between gap-4 py-5">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-ekvara-black">
                  {formatDate(log.measuredAt)}
                </p>
                {log.note && <p className="mt-1 text-xs text-ekvara-muted">{log.note}</p>}
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="font-display text-2xl font-bold leading-none text-ekvara-black">
                  {formatWeight(log.weight)}
                  <span className="ml-1 font-sans text-sm font-normal text-ekvara-muted">kg</span>
                </p>
                {variation !== null && (
                  <p className="mt-1.5 text-xs text-ekvara-muted">{formatSignedVariation(variation)}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default WeightHistoryList;
