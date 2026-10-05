import { useEffect, useState } from 'react';
import Header from '../components/layout/Header';
import WeekTimeline from '../components/activity/WeekTimeline';
import CompetitionListRow from '../components/activity/CompetitionListRow';
import AddTrainingModal from '../components/activity/AddTrainingModal';
import AddCompetitionModal from '../components/activity/AddCompetitionModal';
import Button from '../components/ui/Button';
import SectionLabel from '../components/ui/SectionLabel';
import { useAuth } from '../contexts/AuthContext';
import { getTrainings, getCompetitions, getCoachPreparations } from '../services/athletes.api';
import { navigateTo } from '../utils/navigation';
import { hasCompetitionResult, isPodium } from '../utils/participationStats';
import { buildMyCompetitions } from '../utils/coachPreparation';
import type { MyCompetitionRow } from '../utils/coachPreparation';
import type { CoachPreparationItem } from '../types/competition';
import type { TrainingItem } from '../types/training';
import type { ParticipationListItem } from '../types/activity';
import { addWeeks, formatWeekLabel, getDaysOfWeek, getWeekRange } from '../utils/week';

const EXCLUDED_TRAINING_STATUS = 'annule';

function parseDateOnly(dateString: string): Date {
  const [year, month, day] = dateString.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day);
}

function capitalizeFirst(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

// Ligne de méta : lieu · niveau, puis le contexte PROUVÉ par les données —
// statut de la participation, ou "Prévue par ton coach" pour une compétition
// seulement préparée (jamais présentée comme une inscription) — et la
// catégorie si elle est connue (jamais déduite).
function formatCompetitionMeta(row: MyCompetitionRow): string | null {
  const { competition } = row;
  const place = [competition.ville, competition.pays, competition.niveau && capitalizeFirst(competition.niveau)]
    .filter(Boolean)
    .join(' · ');
  const context = row.participation ? capitalizeFirst(row.participation.statut) : 'Prévue par ton coach';
  const category = [row.categorieAge, row.categoriePoids].filter(Boolean).join(' · ');
  return [place, context, category].filter(Boolean).join(' · ') || null;
}

// Historique borné à l'affichage initial : les plus récentes d'abord, le reste
// sur demande (jamais masqué définitivement — /activite est aussi l'historique).
const PAST_INITIAL_COUNT = 5;

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
  const [preparations, setPreparations] = useState<CoachPreparationItem[]>([]);
  const [competitionsLoading, setCompetitionsLoading] = useState(true);
  const [competitionsError, setCompetitionsError] = useState<string | null>(null);
  const [showAllPast, setShowAllPast] = useState(false);

  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);

  // Même fermeture clavier que le menu profil du Header (Escape), en plus du
  // clic extérieur — n'entre en jeu que si le menu est ouvert.
  useEffect(() => {
    if (!isAddMenuOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsAddMenuOpen(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isAddMenuOpen]);
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
  // Mes compétitions = participations + préparations coach visibles par
  // l'athlète (vue Athlete-safe, jamais de note coach), combinées par
  // buildMyCompetitions — la même règle que "Mes compétitions" de
  // /competitions. Les préparations enrichissent la liste mais ne doivent
  // jamais la faire échouer : indisponibles, les participations restent.
  function loadCompetitions(isCancelled: () => boolean) {
    setCompetitionsLoading(true);
    setCompetitionsError(null);

    Promise.all([
      getCompetitions(athleteId),
      getCoachPreparations(athleteId).catch((error: Error) => {
        console.error('Erreur lors du chargement des préparations coach', error);
        return [] as CoachPreparationItem[];
      }),
    ])
      .then(([participations, coachPreparations]) => {
        if (!isCancelled()) {
          // Liste brute conservée : buildMyCompetitions a besoin de TOUTES les
          // participations (une participation annulée masque la préparation).
          setCompetitions(participations);
          setPreparations(coachPreparations);
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
  const { upcoming, past } = buildMyCompetitions(competitions, preparations, today);
  const visiblePast = showAllPast ? past : past.slice(0, PAST_INITIAL_COUNT);
  const hasAnyCompetition = upcoming.length > 0 || past.length > 0;

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
            <Button
              variant="primary"
              onClick={() => setIsAddMenuOpen((open) => !open)}
              aria-haspopup="true"
              aria-expanded={isAddMenuOpen}
            >
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
            className="py-3 text-xs font-semibold uppercase tracking-wide text-ekvara-black/55 transition-colors hover:text-ekvara-black"
          >
            Aujourd'hui
          </button>

          <span className="h-4 w-px bg-gray-200" aria-hidden="true" />

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setAnchorDate((current) => addWeeks(current, -1))}
              aria-label="Semaine précédente"
              className="-mx-2 flex h-11 w-11 items-center justify-center text-ekvara-muted transition-colors hover:text-ekvara-black"
            >
              ←
            </button>
            <p className="min-w-[15ch] text-center font-display text-lg font-bold uppercase tracking-wide tabular-nums text-ekvara-black">
              {formatWeekLabel(monday, sunday)}
            </p>
            <button
              type="button"
              onClick={() => setAnchorDate((current) => addWeeks(current, 1))}
              aria-label="Semaine suivante"
              className="-mx-2 flex h-11 w-11 items-center justify-center text-ekvara-muted transition-colors hover:text-ekvara-black"
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
        <section className="mt-12 border-t border-gray-200 pt-8">
          <SectionLabel>Mes compétitions</SectionLabel>

          {competitionsLoading && <p className="mt-4 text-sm text-ekvara-muted">Chargement...</p>}

          {!competitionsLoading && competitionsError && (
            <p className="mt-4 text-sm text-red-600">Impossible de charger les compétitions.</p>
          )}

          {!competitionsLoading && !competitionsError && !hasAnyCompetition && (
            <p className="mt-4 text-sm text-ekvara-muted">Aucune compétition enregistrée pour le moment.</p>
          )}

          {!competitionsLoading && !competitionsError && hasAnyCompetition && (
            <div className="mt-4 flex flex-col gap-8">
              {upcoming.length > 0 && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-ekvara-muted">À venir</p>
                  <ul className="mt-1 divide-y divide-gray-100">
                    {upcoming.map((row) => (
                      <CompetitionListRow
                        key={row.key}
                        dateDebut={row.competition.dateDebut}
                        nom={row.competition.nom}
                        metaLine={formatCompetitionMeta(row)}
                        rightLabel={getDaysUntilLabel(row.competition.dateDebut)}
                        onClick={() => navigateTo(`/competitions/${row.competition.id}`)}
                      />
                    ))}
                  </ul>
                </div>
              )}

              {past.length > 0 && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-ekvara-muted">Passées</p>
                  <ul className="mt-1 divide-y divide-gray-100">
                    {visiblePast.map((row) => (
                      <CompetitionListRow
                        key={row.key}
                        dateDebut={row.competition.dateDebut}
                        nom={row.competition.nom}
                        metaLine={formatCompetitionMeta(row)}
                        // Résultat seulement pour une participation officielle ;
                        // une compétition seulement préparée n'a pas de résultat.
                        rightLabel={row.participation ? (formatResultSummary(row.participation) ?? 'Résultat non renseigné') : null}
                        highlight={row.participation !== null && hasCompetitionResult(row.participation) && isPodium(row.participation)}
                        onClick={() => navigateTo(`/competitions/${row.competition.id}`)}
                      />
                    ))}
                  </ul>
                  {past.length > PAST_INITIAL_COUNT && (
                    <Button variant="ghost" onClick={() => setShowAllPast((v) => !v)} className="mt-3">
                      {showAllPast ? 'Afficher moins' : `Voir tout (${past.length})`}
                    </Button>
                  )}
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
