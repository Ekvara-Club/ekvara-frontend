import { useEffect, useState } from 'react';
import Header from '../components/layout/Header';
import WeekTimeline from '../components/activity/WeekTimeline';
import CompetitionListRow from '../components/activity/CompetitionListRow';
import AddTrainingModal from '../components/activity/AddTrainingModal';
import AddCompetitionModal from '../components/activity/AddCompetitionModal';
import Button from '../components/ui/Button';
import SectionLabel from '../components/ui/SectionLabel';
import { useAuth } from '../contexts/AuthContext';
import { getTrainings, getCompetitions } from '../services/athletes.api';
import { navigateTo } from '../utils/navigation';
import { hasCompetitionResult, isPodium } from '../utils/participationStats';
import type { TrainingItem } from '../types/training';
import type { ParticipationListItem } from '../types/activity';
import { addWeeks, formatWeekLabel, getDaysOfWeek, getWeekRange } from '../utils/week';

const EXCLUDED_TRAINING_STATUS = 'annule';
const EXCLUDED_PARTICIPATION_STATUSES = ['annule', 'retire'];

function parseDateOnly(dateString: string): Date {
  const [year, month, day] = dateString.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatCompetitionMeta(p: ParticipationListItem): string | null {
  const { competition } = p;
  return [competition.ville, competition.pays, competition.niveau].filter(Boolean).join(' · ') || null;
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

// Même règle que CompetitionCard/GoalCard : jamais de "J-0" négatif, la liste
// "à venir" est déjà filtrée sur des dates non passées.
function getDaysUntilLabel(dateDebut: string): string {
  const targetDate = parseDateOnly(dateDebut);
  const today = startOfToday();
  const diffDays = Math.round((targetDate.getTime() - today.getTime()) / 86_400_000);

  if (diffDays <= 0) return "Aujourd'hui";
  if (diffDays === 1) return 'J-1';
  return `J-${diffDays}`;
}

// Résumé compact du résultat déjà connu (jamais de donnée inventée) :
// priorité classement/médaille, repli sur victoires/défaites si c'est le seul
// signal disponible. `null` si aucun résultat n'est renseigné.
function formatResultSummary(p: ParticipationListItem): string | null {
  if (!hasCompetitionResult(p)) return null;

  const parts: string[] = [];
  if (p.classement !== null) parts.push(`${p.classement}E`);
  if (p.medaille !== null) parts.push(p.medaille.toUpperCase());

  if (parts.length === 0) {
    if (p.victoires !== null && p.victoires > 0) parts.push(`${p.victoires}V`);
    if (p.defaites !== null && p.defaites > 0) parts.push(`${p.defaites}D`);
  }

  return parts.length > 0 ? parts.join(' · ') : null;
}

function ActivityPage() {
  // ActivityPage n'est rendue que lorsque l'utilisateur est authentifié
  // (garde dans App.tsx) : athlete est donc garanti non-null ici.
  const { athlete } = useAuth();
  const athleteId = athlete!.id;

  const [anchorDate, setAnchorDate] = useState(new Date());
  const { monday, sunday } = getWeekRange(anchorDate);

  const [trainings, setTrainings] = useState<TrainingItem[]>([]);
  const [trainingsLoading, setTrainingsLoading] = useState(true);
  const [trainingsError, setTrainingsError] = useState<string | null>(null);

  const [competitions, setCompetitions] = useState<ParticipationListItem[]>([]);
  const [competitionsLoading, setCompetitionsLoading] = useState(true);
  const [competitionsError, setCompetitionsError] = useState<string | null>(null);

  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [isAddTrainingOpen, setIsAddTrainingOpen] = useState(false);
  const [isAddCompetitionOpen, setIsAddCompetitionOpen] = useState(false);

  // Réutilisée à la fois par l'effet (changement de semaine) et par le
  // rafraîchissement immédiat après création d'un entraînement.
  function loadTrainings(isCancelled: () => boolean) {
    setTrainingsLoading(true);
    setTrainingsError(null);

    getTrainings(athleteId, monday, sunday)
      .then((data) => {
        if (!isCancelled()) {
          setTrainings(data.filter((training) => training.status !== EXCLUDED_TRAINING_STATUS));
        }
      })
      .catch((error: Error) => {
        if (!isCancelled()) {
          console.error('Erreur lors du chargement des entraînements de la semaine', error);
          setTrainingsError(error.message);
        }
      })
      .finally(() => {
        if (!isCancelled()) setTrainingsLoading(false);
      });
  }

  useEffect(() => {
    let cancelled = false;
    loadTrainings(() => cancelled);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monday.getTime(), sunday.getTime()]);

  // Réutilisée à la fois par l'effet initial et par le rafraîchissement
  // immédiat après une nouvelle participation, sans jamais recharger les
  // entraînements.
  function loadCompetitions(isCancelled: () => boolean) {
    setCompetitionsLoading(true);
    setCompetitionsError(null);

    getCompetitions(athleteId)
      .then((data) => {
        if (!isCancelled()) {
          setCompetitions(
            data.filter((p) => !EXCLUDED_PARTICIPATION_STATUSES.includes(p.statut)),
          );
        }
      })
      .catch((error: Error) => {
        if (!isCancelled()) {
          console.error('Erreur lors du chargement des compétitions', error);
          setCompetitionsError(error.message);
        }
      })
      .finally(() => {
        if (!isCancelled()) setCompetitionsLoading(false);
      });
  }

  useEffect(() => {
    let cancelled = false;
    loadCompetitions(() => cancelled);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const days = getDaysOfWeek(monday);

  const today = startOfToday();
  const upcoming = competitions
    .filter((p) => parseDateOnly(p.competition.dateFin ?? p.competition.dateDebut) >= today)
    .sort((a, b) => a.competition.dateDebut.localeCompare(b.competition.dateDebut));
  const past = competitions
    .filter((p) => parseDateOnly(p.competition.dateFin ?? p.competition.dateDebut) < today)
    .sort((a, b) => b.competition.dateDebut.localeCompare(a.competition.dateDebut));

  return (
    <div className="min-h-screen bg-ekvara-surface">
      <Header />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <section className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-ekvara-black">
              Activité
            </h1>
            <p className="mt-1 text-ekvara-muted">Ton planning et tes compétitions</p>
          </div>
          <div className="relative">
            <Button variant="primary" onClick={() => setIsAddMenuOpen((open) => !open)}>
              + Ajouter
            </Button>

            {isAddMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsAddMenuOpen(false)} />
                <div className="absolute right-0 z-50 mt-2 w-72 rounded-md border border-gray-200 bg-white p-2 shadow-lg">
                  <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-ekvara-muted">
                    Ajouter
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddMenuOpen(false);
                      setIsAddTrainingOpen(true);
                    }}
                    className="block w-full rounded-md px-2 py-2 text-left hover:bg-gray-50"
                  >
                    <span className="block text-sm font-medium text-ekvara-black">Entraînement</span>
                    <span className="block text-xs text-ekvara-muted">
                      Ajouter une séance à mon planning
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddMenuOpen(false);
                      setIsAddCompetitionOpen(true);
                    }}
                    className="block w-full rounded-md px-2 py-2 text-left hover:bg-gray-50"
                  >
                    <span className="block text-sm font-medium text-ekvara-black">Compétition</span>
                    <span className="block text-xs text-ekvara-muted">
                      M'inscrire à une compétition existante
                    </span>
                  </button>
                </div>
              </>
            )}
          </div>
        </section>

        <SectionLabel>Planning de la semaine</SectionLabel>

        {/* Contrôle de semaine compact (§4) : la période reste l'élément
            visuellement fort, "Aujourd'hui" et les flèches restent discrets. */}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setAnchorDate(new Date())}
            className="text-xs font-semibold uppercase tracking-wide text-ekvara-muted transition-colors hover:text-ekvara-black"
          >
            Aujourd'hui
          </button>

          <span className="h-4 w-px bg-gray-200" aria-hidden="true" />

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setAnchorDate((current) => addWeeks(current, -1))}
              aria-label="Semaine précédente"
              className="px-1 text-ekvara-muted transition-colors hover:text-ekvara-black"
            >
              ←
            </button>
            <p className="font-display text-lg font-bold uppercase tracking-wide text-ekvara-black">
              {formatWeekLabel(monday, sunday)}
            </p>
            <button
              type="button"
              onClick={() => setAnchorDate((current) => addWeeks(current, 1))}
              aria-label="Semaine suivante"
              className="px-1 text-ekvara-muted transition-colors hover:text-ekvara-black"
            >
              →
            </button>
          </div>
        </div>

        <div className="mt-6">
          {trainingsLoading && <p className="text-sm text-ekvara-muted">Chargement...</p>}

          {!trainingsLoading && trainingsError && (
            <p className="text-sm text-red-600">
              Impossible de charger les entraînements de cette semaine.
            </p>
          )}

          {!trainingsLoading && !trainingsError && (
            <WeekTimeline days={days} trainings={trainings} />
          )}
        </div>

        {/* Respiration forte avant la section secondaire (§14) : le planning
            reste visuellement l'élément principal de la page. */}
        <section className="mt-16">
          <SectionLabel>Mes compétitions</SectionLabel>

          {competitionsLoading && <p className="mt-4 text-sm text-ekvara-muted">Chargement...</p>}

          {!competitionsLoading && competitionsError && (
            <p className="mt-4 text-sm text-red-600">Impossible de charger les compétitions.</p>
          )}

          {!competitionsLoading && !competitionsError && competitions.length === 0 && (
            <p className="mt-4 text-sm text-ekvara-muted">Aucune compétition enregistrée pour le moment.</p>
          )}

          {!competitionsLoading && !competitionsError && competitions.length > 0 && (
            <div className="mt-4 flex flex-col gap-8">
              {upcoming.length > 0 && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-ekvara-muted">À venir</p>
                  <ul className="mt-1 divide-y divide-gray-100">
                    {upcoming.map((p) => (
                      <CompetitionListRow
                        key={p.id}
                        dateDebut={p.competition.dateDebut}
                        nom={p.competition.nom}
                        metaLine={formatCompetitionMeta(p)}
                        rightLabel={getDaysUntilLabel(p.competition.dateDebut)}
                        onClick={() => navigateTo(`/competitions/${p.competition.id}`)}
                      />
                    ))}
                  </ul>
                </div>
              )}

              {past.length > 0 && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-ekvara-muted">Passées</p>
                  <ul className="mt-1 divide-y divide-gray-100">
                    {past.map((p) => (
                      <CompetitionListRow
                        key={p.id}
                        dateDebut={p.competition.dateDebut}
                        nom={p.competition.nom}
                        metaLine={formatCompetitionMeta(p)}
                        rightLabel={formatResultSummary(p) ?? 'Résultat non renseigné'}
                        highlight={hasCompetitionResult(p) && isPodium(p)}
                        onClick={() => navigateTo(`/competitions/${p.competition.id}`)}
                      />
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      {isAddTrainingOpen && (
        <AddTrainingModal
          athleteId={athleteId}
          onClose={() => setIsAddTrainingOpen(false)}
          onCreated={() => {
            setIsAddTrainingOpen(false);
            loadTrainings(() => false);
          }}
        />
      )}

      {isAddCompetitionOpen && (
        <AddCompetitionModal
          athleteId={athleteId}
          existingCompetitionIds={competitions.map((p) => p.competition.id)}
          onClose={() => setIsAddCompetitionOpen(false)}
          onCreated={() => {
            setIsAddCompetitionOpen(false);
            loadCompetitions(() => false);
          }}
        />
      )}
    </div>
  );
}

export default ActivityPage;
