import type { WeightSummaryResponse } from '../../types/weight';
import { navigateTo } from '../../utils/navigation';
import Button from '../ui/Button';
import SectionLabel from '../ui/SectionLabel';
import StatValue from '../ui/StatValue';

interface WeightCardProps {
  summary: WeightSummaryResponse | null;
  loading: boolean;
  error: string | null;
  // État vide : action d'ajout directe (la page ouvre la modale, la card
  // reste présentationnelle).
  onAdd?: () => void;
}

function formatWeight(value: number): string {
  return value.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
}

function formatSignedWeight(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${formatWeight(value)}`;
}

function formatMeasuredAt(measuredAt: string): string {
  const date = new Date(measuredAt);
  const datePart = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${datePart} à ${hours}h${minutes}`;
}

function getDifferenceLabel(differenceToTarget: number): string {
  if (differenceToTarget === 0) return 'Objectif atteint';
  if (differenceToTarget > 0) return `${formatWeight(differenceToTarget)} kg à perdre`;
  return `${formatWeight(Math.abs(differenceToTarget))} kg sous l'objectif`;
}

// Ne jamais colorer un +/- de poids comme "positif"/"négatif" (§8) : le sens
// dépend du contexte sportif de l'athlète, pas du signe brut. Texte neutre
// uniquement, jamais de lime/rouge automatique ici.
function getWeeklyChangeLabel(weeklyChange: number): string {
  if (weeklyChange === 0) return 'Poids stable cette semaine';
  return `${formatSignedWeight(weeklyChange)} kg cette semaine`;
}

function WeightCard({ summary, loading, error, onAdd }: WeightCardProps) {
  return (
    <div className="min-h-[240px] rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <SectionLabel>Poids</SectionLabel>

      {loading && <p className="mt-6 text-sm text-ekvara-muted">Chargement...</p>}

      {!loading && error && (
        <p className="mt-6 text-sm text-red-600">Impossible de charger les données de poids.</p>
      )}

      {!loading && !error && summary && summary.currentWeight === null && (
        <div className="mt-6">
          <p className="text-sm font-medium text-ekvara-black">Aucune pesée enregistrée</p>
          <p className="mt-1 text-sm text-ekvara-muted">
            Ajoute une première pesée pour commencer ton suivi.
          </p>
          {onAdd && (
            <Button variant="primary" onClick={onAdd} className="mt-4">
              + Ajouter une pesée
            </Button>
          )}
        </div>
      )}

      {!loading && !error && summary && summary.currentWeight !== null && (
        <div className="mt-4 flex flex-col gap-4">
          <div>
            <StatValue value={formatWeight(summary.currentWeight)} label="kg" />
            {summary.measuredAt && (
              <p className="mt-2 text-sm text-ekvara-muted">
                Dernière pesée · {formatMeasuredAt(summary.measuredAt)}
              </p>
            )}
          </div>

          {summary.target && (
            <div className="flex gap-6 border-t border-gray-100 pt-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ekvara-muted">
                  Objectif
                </p>
                <p className="mt-0.5 text-base font-semibold text-ekvara-black">
                  {formatWeight(summary.target.weight)} kg
                </p>
              </div>
              {summary.differenceToTarget !== null && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ekvara-muted">
                    Écart
                  </p>
                  <p className="mt-0.5 text-base font-semibold text-ekvara-black">
                    {getDifferenceLabel(summary.differenceToTarget)}
                  </p>
                </div>
              )}
            </div>
          )}

          {summary.weeklyChange !== null && (
            <p className="text-sm text-ekvara-black/70">{getWeeklyChangeLabel(summary.weeklyChange)}</p>
          )}

          <Button variant="ghost" onClick={() => navigateTo('/poids')} className="group mt-1 self-start">
            Voir mon poids
            <span className="inline-block transition-transform group-hover:translate-x-0.5">→</span>
          </Button>
        </div>
      )}
    </div>
  );
}

export default WeightCard;
