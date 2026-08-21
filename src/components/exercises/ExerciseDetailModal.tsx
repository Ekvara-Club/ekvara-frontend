import Button from '../ui/Button';
import Modal from '../ui/Modal';
import type { Exercise } from '../../types/exercise';
import { getExerciseNiveauLabel, getExerciseTypeLabel } from '../../utils/exerciseOptions';

interface ExerciseDetailModalProps {
  exercise: Exercise;
  onClose: () => void;
}

// N'affiche un lecteur que pour les formats explicitement supportés
// (YouTube, Vimeo) : pas d'infrastructure vidéo, pas d'iframe générique
// pointant vers une origine arbitraire.
function getVideoEmbedUrl(videoUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(videoUrl);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, '');

  if (host === 'youtube.com' || host === 'm.youtube.com') {
    const videoId = url.pathname === '/watch' ? url.searchParams.get('v') : url.pathname.split('/').pop();
    if (url.pathname.startsWith('/embed/')) return url.toString();
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  }

  if (host === 'youtu.be') {
    const videoId = url.pathname.slice(1);
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  }

  if (host === 'vimeo.com') {
    const videoId = url.pathname.slice(1);
    return /^\d+$/.test(videoId) ? `https://player.vimeo.com/video/${videoId}` : null;
  }

  if (host === 'player.vimeo.com') {
    return url.toString();
  }

  return null;
}

function ExerciseDetailModal({ exercise, onClose }: ExerciseDetailModalProps) {
  const typeLabel = getExerciseTypeLabel(exercise.type_exercice);
  const niveauLabel = getExerciseNiveauLabel(exercise.niveau);
  const metaLine = [typeLabel, niveauLabel].filter(Boolean).join(' · ');
  const embedUrl = exercise.video_url ? getVideoEmbedUrl(exercise.video_url) : null;
  const hasBody = Boolean(exercise.description || exercise.panel_technique);

  return (
    <Modal title={exercise.titre} onClose={onClose}>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-5">
          {metaLine && (
            <p className="text-xs font-semibold uppercase tracking-wide text-ekvara-muted">{metaLine}</p>
          )}

          {hasBody && (
            <div className={`flex flex-col gap-4 ${metaLine ? 'mt-4 border-t border-gray-100 pt-4' : ''}`}>
              {exercise.description && (
                <p className="whitespace-pre-line text-sm text-ekvara-black/80">{exercise.description}</p>
              )}

              {/* Uniquement l'information réellement fournie par le backend
                  (§15/§17) : jamais de séries, répétitions, muscles ou coach
                  inventés autour de ce champ. */}
              {exercise.panel_technique && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-ekvara-muted">
                    Focus technique
                  </p>
                  <p className="mt-1 font-display text-base font-bold text-ekvara-black">
                    {exercise.panel_technique}
                  </p>
                </div>
              )}
            </div>
          )}

          {embedUrl && (
            <div className="mt-4 aspect-video w-full overflow-hidden rounded-md bg-gray-100">
              <iframe
                src={embedUrl}
                title={exercise.titre}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-gray-100 p-5">
          <Button type="button" variant="secondary" onClick={onClose}>
            Fermer
          </Button>
        </div>
    </Modal>
  );
}

export default ExerciseDetailModal;
