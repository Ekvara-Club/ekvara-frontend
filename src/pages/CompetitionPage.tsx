import { useEffect, useState } from 'react';
import Header from '../components/layout/Header';
import CompetitionResultModal from '../components/passport/CompetitionResultModal';
import CompetitionEntriesSection from '../components/competition/CompetitionEntriesSection';
import Button from '../components/ui/Button';
import SectionLabel from '../components/ui/SectionLabel';
import StatValue from '../components/ui/StatValue';
import { useAuth } from '../contexts/AuthContext';
import { COMPETITION_NOT_FOUND_MESSAGE, getCompetitionById, getCompetitions } from '../services/athletes.api';
import { hasCompetitionResult, isPastParticipation, isPodium } from '../utils/participationStats';
import type { CompetitionDetail } from '../types/competition';
import type { ParticipationListItem } from '../types/activity';

function capitalizeFirst(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

interface CompetitionPageProps {
  competitionId: string;
}

// Même technique que CompetitionCard/PalmaresList : dateDebut/dateFin sont
// des DATE métier sans heure — jamais new Date() naïf.
function parseDateOnly(dateString: string): Date {
  const [year, month, day] = dateString.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day);
}

const FULL_DATE_OPTIONS: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };

// Ne suppose jamais que dateDebut/dateFin restent dans le même mois ou la
// même année : "9–11 octobre 2026", mais aussi "28 février – 2 mars 2026" ou
// "30 décembre 2026 – 2 janvier 2027" selon les dates réelles.
function formatDateRange(dateDebut: string, dateFin: string | null): string {
  const start = parseDateOnly(dateDebut);

  if (!dateFin) {
    return start.toLocaleDateString('fr-FR', FULL_DATE_OPTIONS);
  }

  const end = parseDateOnly(dateFin);
  if (start.getTime() === end.getTime()) {
    return start.toLocaleDateString('fr-FR', FULL_DATE_OPTIONS);
  }

  const endFull = end.toLocaleDateString('fr-FR', FULL_DATE_OPTIONS);
  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();

  if (sameMonth) {
    const startDay = start.toLocaleDateString('fr-FR', { day: 'numeric' });
    return `${startDay}–${endFull}`;
  }

  const startPartial = start.toLocaleDateString(
    'fr-FR',
    sameYear ? { day: 'numeric', month: 'long' } : FULL_DATE_OPTIONS,
  );
  return `${startPartial} – ${endFull}`;
}

// Transformation purement présentationnelle du classement réel, même
// convention que /passeport : "3" -> "3E", "1" -> "1ER".
function formatOrdinal(classement: number): string {
  return classement === 1 ? '1ER' : `${classement}E`;
}

// Même calcul que CompetitionCard (dashboard), mais renvoie `null` plutôt que
// "Aujourd'hui" pour une date passée : contrairement au dashboard (toujours
// la prochaine compétition, donc toujours future), cette page peut afficher
// une compétition déjà passée — même garde que PrimaryGoalPanel (/objectifs)
// pour une situation identique.
function getDaysUntilLabel(dateDebut: string): string | null {
  const targetDate = parseDateOnly(dateDebut);
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const diffDays = Math.round((targetDate.getTime() - startOfToday.getTime()) / 86_400_000);

  if (diffDays < 0) return null;
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return 'J-1';
  return `J-${diffDays}`;
}

// Même logique que isPastParticipation (utils/participationStats.ts), mais à
// partir de la compétition seule : la position du bloc Inscrits (§7) doit
// être déterminée même sans participation, alors que isPastParticipation
// exige une participation.
function isCompetitionPast(competition: CompetitionDetail): boolean {
  const referenceDate = parseDateOnly(competition.dateFin ?? competition.dateDebut);
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return referenceDate < startOfToday;
}

const SOURCE_LABELS: Record<string, string> = {
  fftda: 'FFTDA',
  world_taekwondo: 'World Taekwondo',
  martial_events: 'Martial Events',
};

function formatSourceLabel(source: string): string {
  return SOURCE_LABELS[source] ?? capitalizeFirst(source.replace(/_/g, ' '));
}

// Ticket "Compétitions Athlete V2" §20-21 : une seule fiche par compétition
// canonique, jamais une ligne par source — juste la liste des sources ayant
// contribué, avec lien externe si connu. Aucun id technique affiché.
function SourcesSection({ sources }: { sources: CompetitionDetail['sources'] }) {
  if (sources.length === 0) return null;

  return (
    <section className="mt-10 border-t border-gray-200 pt-8">
      <SectionLabel>Sources des données</SectionLabel>
      <ul className="mt-4 flex flex-col gap-2">
        {sources.map((entry) => (
          <li key={entry.source} className="text-sm text-ekvara-black">
            {entry.sourceUrl ? (
              <a
                href={entry.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-ekvara-black underline decoration-ekvara-black/30 underline-offset-2 hover:decoration-ekvara-black"
              >
                {formatSourceLabel(entry.source)}
                <span className="sr-only"> (ouvre un site externe dans un nouvel onglet)</span>
              </a>
            ) : (
              <span className="font-medium">{formatSourceLabel(entry.source)}</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

// Section éditoriale (§11-17) : distingue les 3 états métier existants —
// future (résultat pas encore disponible), passée avec résultat (le
// classement devient l'information dominante), passée sans résultat. Aucune
// des règles hasCompetitionResult/isPastParticipation/isPodium n'est
// redéfinie ici, uniquement réutilisée.
function ResultSection({
  participation,
  onEdit,
}: {
  participation: ParticipationListItem;
  onEdit: () => void;
}) {
  if (!isPastParticipation(participation)) {
    return (
      <div className="mt-4">
        <p className="font-display text-xl font-bold text-ekvara-black">À venir</p>
        <p className="mt-1 text-sm text-ekvara-muted">Résultat disponible après la compétition.</p>
      </div>
    );
  }

  const withResult = hasCompetitionResult(participation);

  if (!withResult) {
    return (
      <div className="mt-4">
        <p className="text-sm text-ekvara-muted">Résultat non renseigné</p>
        <Button variant="ghost" onClick={onEdit} className="mt-2">
          Renseigner le résultat →
        </Button>
      </div>
    );
  }

  // Un podium est un accomplissement réel confirmé par le backend (classement
  // 1-3 ou médaille non nulle) — jamais déduit/supposé localement.
  const podium = isPodium(participation);
  const hasVictories = participation.victoires !== null && participation.victoires > 0;
  const hasDefeats = participation.defaites !== null && participation.defaites > 0;

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {participation.classement !== null && (
          <div className="flex items-center gap-2">
            {podium && <span className="h-2 w-2 flex-shrink-0 rounded-full bg-ekvara-lime" aria-hidden="true" />}
            <p className="font-display text-5xl font-extrabold leading-none text-ekvara-black">
              {formatOrdinal(participation.classement)}
            </p>
          </div>
        )}

        {participation.medaille !== null && (
          <span className="rounded-full bg-ekvara-lime px-3 py-1 text-sm font-bold uppercase text-ekvara-black">
            {capitalizeFirst(participation.medaille)}
          </span>
        )}
      </div>

      {(hasVictories || hasDefeats) && (
        <p className="mt-3 text-sm font-semibold text-ekvara-black/70">
          {[
            hasVictories && `${participation.victoires} victoire${participation.victoires! > 1 ? 's' : ''}`,
            hasDefeats && `${participation.defaites} défaite${participation.defaites! > 1 ? 's' : ''}`,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      )}

      <Button variant="ghost" onClick={onEdit} className="mt-3">
        Modifier le résultat →
      </Button>
    </div>
  );
}

function CompetitionPage({ competitionId }: CompetitionPageProps) {
  // CompetitionPage n'est rendue que lorsque l'utilisateur est authentifié
  // (garde dans App.tsx) : athlete est donc garanti non-null ici.
  const { athlete } = useAuth();
  const athleteId = athlete!.id;

  const [competition, setCompetition] = useState<CompetitionDetail | null>(null);
  const [competitionLoading, setCompetitionLoading] = useState(true);
  const [competitionError, setCompetitionError] = useState<string | null>(null);

  const [participations, setParticipations] = useState<ParticipationListItem[]>([]);
  const [participationsLoading, setParticipationsLoading] = useState(true);
  const [participationsError, setParticipationsError] = useState<string | null>(null);

  const [resultModalOpen, setResultModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setCompetitionLoading(true);
    setCompetitionError(null);

    getCompetitionById(competitionId)
      .then((data) => {
        if (!cancelled) setCompetition(data);
      })
      .catch((error: Error) => {
        if (!cancelled) {
          console.error('Erreur lors du chargement de la compétition', error);
          // Le 404 backend produit un message propre, sûr à afficher tel quel ;
          // toute autre erreur (réseau, 500...) reste un message générique.
          const message =
            error.message === COMPETITION_NOT_FOUND_MESSAGE
              ? error.message
              : 'Impossible de charger la compétition.';
          setCompetitionError(message);
        }
      })
      .finally(() => {
        if (!cancelled) setCompetitionLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [competitionId]);

  // Réutilisée à la fois par l'effet initial et par le rafraîchissement après
  // sauvegarde d'un résultat — un seul GET /athletes/:id/competitions, jamais
  // window.location.reload().
  function loadParticipations(isCancelled: () => boolean) {
    setParticipationsLoading(true);
    setParticipationsError(null);

    getCompetitions(athleteId)
      .then((data) => {
        if (!isCancelled()) setParticipations(data);
      })
      .catch((error: Error) => {
        if (!isCancelled()) {
          console.error('Erreur lors du chargement des participations', error);
          setParticipationsError(error.message);
        }
      })
      .finally(() => {
        if (!isCancelled()) setParticipationsLoading(false);
      });
  }

  useEffect(() => {
    let cancelled = false;
    loadParticipations(() => cancelled);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [athleteId]);

  // Dérivée d'une liste déjà scopée à l'athlète courant : jamais un nouvel
  // endpoint GET /athletes/:athleteId/competitions/:competitionId pour ça.
  const myParticipation = participations.find((p) => p.competition.id === competitionId) ?? null;

  // Mini profil de participation (§8/§9) : chaque cellule n'existe que si la
  // donnée réelle est présente — jamais de cellule vide ni de valeur inventée
  // (§10). Le statut est toujours affiché (jamais null sur une participation).
  const participationCells: { label: string; value: string }[] = [];
  if (myParticipation) {
    participationCells.push({ label: 'Statut', value: capitalizeFirst(myParticipation.statut) });
    if (myParticipation.categorieAge) {
      participationCells.push({ label: 'Catégorie', value: myParticipation.categorieAge });
    }
    if (myParticipation.categoriePoids) {
      participationCells.push({ label: 'Poids', value: myParticipation.categoriePoids });
    }
  }

  // Même calcul que CompetitionCard, jamais un badge inventé si la date est
  // absente/passée (§4). Niveau + organisateur combinés (§7) sans jamais
  // afficher un "·" flanqué d'une valeur absente.
  const daysUntilLabel = competition ? getDaysUntilLabel(competition.dateDebut) : null;
  const heroMetaLine = competition ? [competition.niveau, competition.organisateur].filter(Boolean).join(' · ') : '';

  // Extrait en variable (jamais dupliqué) car sa position par rapport au bloc
  // Inscrits dépend de isCompetitionPast (§7) — le contenu reste identique,
  // seul l'ordre de rendu change.
  const resultSection = (participationsLoading || participationsError || myParticipation) && (
    <section className="mt-10 border-t border-gray-200 pt-8">
      <SectionLabel>Résultat</SectionLabel>

      {participationsLoading && <p className="mt-4 text-sm text-ekvara-muted">Chargement...</p>}

      {!participationsLoading && participationsError && (
        <p className="mt-4 text-sm text-red-600">Impossible de charger le résultat.</p>
      )}

      {!participationsLoading && !participationsError && myParticipation && (
        <ResultSection participation={myParticipation} onEdit={() => setResultModalOpen(true)} />
      )}
    </section>
  );

  return (
    <div className="min-h-screen bg-ekvara-surface">
      <Header />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="text-sm font-medium text-ekvara-muted hover:text-ekvara-black"
        >
          ← Retour
        </button>

        {competitionLoading && <p className="mt-6 text-sm text-ekvara-muted">Chargement...</p>}

        {!competitionLoading && competitionError && (
          <p className="mt-6 text-sm text-red-600">{competitionError}</p>
        )}

        {!competitionLoading && !competitionError && competition && (
          <>
            {/* Prolonge la hero CompetitionCard du dashboard : même traitement
                noir pour la fiche compétition, seule grande zone sombre de
                cette page — le reste (participation/résultat) reste éditorial. */}
            <div className="mt-6 rounded-lg bg-ekvara-black p-6 sm:p-8">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-white/40">Compétition</p>
                {daysUntilLabel && (
                  <span className="whitespace-nowrap rounded-full bg-ekvara-lime px-3 py-1 font-display text-sm font-extrabold text-ekvara-black">
                    {daysUntilLabel}
                  </span>
                )}
              </div>

              <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
                {competition.nom}
              </h1>

              <p className="mt-4 text-sm font-semibold text-white/70">
                {formatDateRange(competition.dateDebut, competition.dateFin)}
              </p>

              {(competition.ville || competition.pays) && (
                <p className="mt-1 text-sm text-white/60">
                  {[competition.ville, competition.pays].filter(Boolean).join(', ')}
                </p>
              )}

              {heroMetaLine && (
                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-white/40">{heroMetaLine}</p>
              )}

              {(competition.lieu || competition.saison || competition.source) && (
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/30">
                  {competition.lieu && <span>{competition.lieu}</span>}
                  {competition.saison && <span>Saison {competition.saison}</span>}
                  {competition.source && (
                    <span className="capitalize">{competition.source.replace(/_/g, ' ')}</span>
                  )}
                </div>
              )}
            </div>

            <section className="mt-10">
              <SectionLabel>Ma participation</SectionLabel>

              {participationsLoading && <p className="mt-4 text-sm text-ekvara-muted">Chargement...</p>}

              {!participationsLoading && participationsError && (
                <p className="mt-4 text-sm text-red-600">Impossible de charger ta participation.</p>
              )}

              {!participationsLoading && !participationsError && !myParticipation && (
                <p className="mt-4 text-sm text-ekvara-muted">
                  Cette compétition n'est pas ajoutée à ton planning.
                </p>
              )}

              {!participationsLoading && !participationsError && myParticipation && participationCells.length > 0 && (
                <div className="mt-4 grid grid-cols-1 gap-y-4 sm:grid-cols-3 sm:gap-y-0 sm:divide-x sm:divide-gray-200">
                  {participationCells.map((cell) => (
                    <StatValue
                      key={cell.label}
                      value={cell.value}
                      label={cell.label}
                      size="md"
                      className="uppercase sm:px-6 sm:first:pl-0"
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Ordre §7 : pour une compétition future, Inscrits prime sur
                Résultat (résultat pas encore disponible) ; pour une
                compétition passée, Résultat prime sur Inscrits. */}
            {isCompetitionPast(competition) ? (
              <>
                {resultSection}
                <CompetitionEntriesSection
                  competitionId={competitionId}
                  categorieAge={myParticipation?.categorieAge ?? null}
                  categoriePoids={myParticipation?.categoriePoids ?? null}
                />
              </>
            ) : (
              <>
                <CompetitionEntriesSection
                  competitionId={competitionId}
                  categorieAge={myParticipation?.categorieAge ?? null}
                  categoriePoids={myParticipation?.categoriePoids ?? null}
                />
                {resultSection}
              </>
            )}

            <SourcesSection sources={competition.sources} />
          </>
        )}
      </main>

      {resultModalOpen && myParticipation && (
        <CompetitionResultModal
          athleteId={athleteId}
          participation={myParticipation}
          onClose={() => setResultModalOpen(false)}
          onSaved={() => {
            setResultModalOpen(false);
            loadParticipations(() => false);
          }}
        />
      )}
    </div>
  );
}

export default CompetitionPage;
