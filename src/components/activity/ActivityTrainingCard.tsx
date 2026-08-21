import type { TrainingItem } from '../../types/training';

interface ActivityTrainingCardProps {
  training: TrainingItem;
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}h${minutes}`;
}

// Volontairement sans card (§7/§17 du ticket timeline) : un simple accent de
// bordure gauche, léger, pour que l'entraînement se sente appartenir à la
// timeline plutôt que d'être une case indépendante.
function ActivityTrainingCard({ training }: ActivityTrainingCardProps) {
  return (
    <div className="border-l-2 border-gray-200 py-0.5 pl-2.5">
      <p className="text-xs font-semibold text-ekvara-black">{training.title}</p>
      <p className="mt-0.5 font-display text-sm font-bold text-ekvara-black">
        {formatTime(training.startAt)}
        {training.endAt && (
          <>
            {' '}
            <span className="font-sans text-xs font-normal text-ekvara-muted">→</span>{' '}
            {formatTime(training.endAt)}
          </>
        )}
      </p>
      {training.location && <p className="mt-0.5 text-xs text-ekvara-muted">{training.location}</p>}
      {(training.subType || training.level) && (
        <p className="text-xs capitalize text-ekvara-muted">
          {[training.subType, training.level].filter(Boolean).join(' • ')}
        </p>
      )}
    </div>
  );
}

export default ActivityTrainingCard;
