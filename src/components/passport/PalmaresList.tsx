import { useState } from 'react';
import CompetitionResultModal from './CompetitionResultModal';
import Button from '../ui/Button';
import SectionLabel from '../ui/SectionLabel';
import type { ParticipationListItem } from '../../types/activity';
import { handleNavClick } from '../../utils/navigation';
import { hasCompetitionResult, isPastParticipation, isPodium } from '../../utils/participationStats';

interface PalmaresListProps {
  athleteId: string;
  participations: ParticipationListItem[];
  loading: boolean;
  error: string | null;
  onResultUpdated: () => void;
}

const MAX_ENTRIES = 5;

function parseDateOnly(dateString: string): Date {
  const [year, month, day] = dateString.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatCompetitionDate(dateString: string): string {
  return parseDateOnly(dateString).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function capitalizeFirst(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

// Transformation purement présentationnelle du classement réel (§10) :
// "3" -> "3E", "1" -> "1ER". N'invente jamais de classement absent.
// Ordinal français avec exposant : « 3e », « 1er » — jamais « 3E ».
function Ordinal({ value }: { value: number }) {
  return (
    <>
      {value}
      <sup className="ml-0.5 text-[0.45em] font-bold">{value === 1 ? 'er' : 'e'}</sup>
    </>
  );
}

function PalmaresList({ athleteId, participations, loading, error, onResultUpdated }: PalmaresListProps) {
  const [resultModalParticipation, setResultModalParticipation] = useState<ParticipationListItem | null>(
    null,
  );

  // Jamais les compétitions futures : elles appartiennent à Accueil (la
  // prochaine) et à Activité (le planning complet), pas à l'historique. Même
  // règle que le backend (qui reste l'autorité finale) pour décider si la
  // saisie d'un résultat est proposée.
  const past = participations
    .filter((p) => isPastParticipation(p))
    .sort((a, b) => b.competition.dateDebut.localeCompare(a.competition.dateDebut))
    .slice(0, MAX_ENTRIES);

  return (
    <div>
      <SectionLabel>Palmarès</SectionLabel>

      {loading && <p className="mt-4 text-sm text-ekvara-muted">Chargement...</p>}

      {!loading && error && (
        <p className="mt-4 text-sm text-red-600">Impossible de charger le palmarès pour le moment.</p>
      )}

      {!loading && !error && past.length === 0 && (
        <p className="mt-4 text-sm text-ekvara-muted">Aucune compétition passée pour le moment.</p>
      )}

      {!loading && !error && past.length > 0 && (
        <ul className="mt-4 divide-y divide-gray-200 border-t border-gray-200">
          {past.map((participation, index) => {
            const { competition } = participation;
            const location = [competition.ville, competition.pays].filter(Boolean).join(', ');
            const withResult = hasCompetitionResult(participation);
            // Un podium est un accomplissement réel confirmé par le backend
            // (classement 1-3 ou médaille non nulle) — jamais déduit/supposé.
            const podium = withResult && isPodium(participation);
            // Numéro purement de présentation, dérivé de l'ordre déjà trié/
            // limité de `past` — jamais un id, jamais envoyé au backend.
            const number = String(index + 1).padStart(2, '0');

            return (
              <li key={participation.id} className="flex items-start gap-4 py-6">
                <span
                  className="w-8 flex-shrink-0 font-display text-xl font-bold leading-none text-gray-300"
                  aria-hidden="true"
                >
                  {number}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                    <div className="flex items-center gap-2">
                      {podium && (
                        <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-ekvara-lime" aria-hidden="true" />
                      )}
                      <p className="font-display text-lg font-bold uppercase tracking-tight text-ekvara-black">
                        {competition.nom}
                      </p>
                    </div>

                    {participation.medaille !== null && (
                      <span className="rounded-full bg-ekvara-lime px-2.5 py-1 text-xs font-semibold text-ekvara-black">
                        {capitalizeFirst(participation.medaille)}
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-ekvara-muted">
                    {formatCompetitionDate(competition.dateDebut)}
                  </p>
                  {location && (
                    <p className="text-xs font-semibold uppercase tracking-wide text-ekvara-muted">{location}</p>
                  )}

                  {withResult ? (
                    <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-2">
                      {participation.classement !== null && (
                        <p className="font-display text-3xl font-extrabold leading-none text-ekvara-black">
                          <Ordinal value={participation.classement} />
                        </p>
                      )}

                      {(participation.victoires !== null && participation.victoires > 0) ||
                      (participation.defaites !== null && participation.defaites > 0) ? (
                        <div className="flex flex-col gap-0.5 text-xs font-semibold uppercase tracking-wide text-ekvara-black/60">
                          {participation.victoires !== null && participation.victoires > 0 && (
                            <span>
                              {participation.victoires} victoire{participation.victoires > 1 ? 's' : ''}
                            </span>
                          )}
                          {participation.defaites !== null && participation.defaites > 0 && (
                            <span>
                              {participation.defaites} défaite{participation.defaites > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-ekvara-muted">Résultat non renseigné</p>
                  )}

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setResultModalParticipation(participation)}
                    className="mt-3"
                  >
                    {withResult ? 'Modifier le résultat' : 'Renseigner le résultat'} →
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {!loading && !error && (
        <a
          href="/activite"
          onClick={(event) => handleNavClick(event, '/activite')}
          className="mt-6 inline-block text-sm font-medium text-ekvara-black hover:underline"
        >
          Voir toutes mes compétitions →
        </a>
      )}

      {resultModalParticipation && (
        <CompetitionResultModal
          athleteId={athleteId}
          participation={resultModalParticipation}
          onClose={() => setResultModalParticipation(null)}
          onSaved={() => {
            setResultModalParticipation(null);
            onResultUpdated();
          }}
        />
      )}
    </div>
  );
}

export default PalmaresList;
