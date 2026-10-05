import Button from '../ui/Button';
import SectionLabel from '../ui/SectionLabel';
import { navigateTo } from '../../utils/navigation';
import type { NextTrainingResponse } from '../../types/training';

interface NextTrainingCardProps {
  training: NextTrainingResponse | null;
  loading: boolean;
  error: string | null;
  onAdd?: () => void;
}

function formatDate(startAt: string): string {
  return new Date(startAt).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}h${minutes}`;
}

// Indicateur simple, pas de countdown : en cours si l'heure actuelle est dans
// l'intervalle [startAt, endAt] (ou après startAt si endAt est absent, cf.
// règle backend "prochain entraînement"), sinon aujourd'hui/demain/rien.
function getTemporalStatusLabel(startAt: string, endAt: string | null): string | null {
  const now = new Date();
  const start = new Date(startAt);
  const end = endAt ? new Date(endAt) : null;

  if (start <= now && (!end || end >= now)) {
    return 'En cours';
  }

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTrainingDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const diffDays = Math.round((startOfTrainingDay.getTime() - startOfToday.getTime()) / 86_400_000);

  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return 'Demain';
  return null;
}

function NextTrainingCard({ training, loading, error, onAdd }: NextTrainingCardProps) {
  const status = training ? getTemporalStatusLabel(training.startAt, training.endAt) : null;
  // Lime réservé exclusivement à "Aujourd'hui" (§3) : les autres états
  // temporels ("En cours", "Demain"...) restent neutres.
  const isToday = status === "Aujourd'hui";

  return (
    <div className="min-h-[240px] rounded-lg border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <SectionLabel>Prochain entraînement</SectionLabel>

      {loading && <p className="mt-6 text-sm text-ekvara-muted">Chargement...</p>}

      {!loading && error && (
        <p className="mt-6 text-sm text-red-600">Impossible de charger le prochain entraînement.</p>
      )}

      {!loading && !error && !training && (
        <div className="mt-6">
          <p className="text-sm font-medium text-ekvara-black">Aucun entraînement à venir</p>
          <p className="mt-1 text-sm text-ekvara-muted">
            Ajoute une séance pour organiser ta préparation.
          </p>
          {onAdd && (
            <Button variant="primary" onClick={onAdd} className="mt-4">
              + Ajouter un entraînement
            </Button>
          )}
        </div>
      )}

      {!loading && !error && training && (
        <div className="mt-4 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-lg font-bold text-ekvara-black">{training.title}</h3>
            {status && (
              <span
                className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${
                  isToday ? 'bg-ekvara-lime text-ekvara-black' : 'bg-ekvara-black text-ekvara-surface'
                }`}
              >
                {status}
              </span>
            )}
          </div>

          {/* Horaires mis en avant comme un élément graphique scannable, pas
              une simple ligne de texte parmi d'autres. */}
          <p className="flex items-baseline gap-2 font-display text-2xl font-bold text-ekvara-black">
            {formatTime(training.startAt)}
            {training.endAt && (
              <>
                <span className="text-base font-medium text-ekvara-muted">→</span>
                <span>{formatTime(training.endAt)}</span>
              </>
            )}
          </p>

          <div className="text-sm text-ekvara-muted">
            <p>{formatDate(training.startAt)}</p>
            {training.location && <p>{training.location}</p>}
          </div>

          {(training.subType || training.level) && (
            <p className="text-sm capitalize text-ekvara-black/70">
              {[training.subType, training.level].filter(Boolean).join(' • ')}
            </p>
          )}

          <Button variant="ghost" onClick={() => navigateTo('/activite')} className="group mt-1 self-start">
            Voir les activités
            <span className="inline-block transition-transform group-hover:translate-x-0.5">→</span>
          </Button>
        </div>
      )}
    </div>
  );
}

export default NextTrainingCard;
