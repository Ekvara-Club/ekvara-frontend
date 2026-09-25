import { useEffect, useState } from 'react';
import Header from '../components/layout/Header';
import Button from '../components/ui/Button';
import SectionLabel from '../components/ui/SectionLabel';
import StatValue from '../components/ui/StatValue';
import WtCompetitionBlock from '../components/wt/WtCompetitionBlock';
import { getWtAthlete, getWtAthleteCompetitions, WT_ATHLETE_NOT_FOUND_MESSAGE } from '../services/international.api';
import type { WtAthleteProfile, WtCompetitionHistoryItem } from '../types/international';
import { handleNavClick } from '../utils/navigation';
import { competitionYear, formatFightCount } from '../utils/wtFormat';

const COMPETITIONS_PAGE_SIZE = 10;
const WT_RESULTS_SOURCE = 'world_taekwondo_results';

interface WtAthletePageProps {
  athleteId: string;
}

// Regroupe les compétitions (déjà triées de la plus récente à la plus
// ancienne par le backend) par année, sans jamais les réordonner.
function groupByYear(items: WtCompetitionHistoryItem[]): { year: string; items: WtCompetitionHistoryItem[] }[] {
  const groups: { year: string; items: WtCompetitionHistoryItem[] }[] = [];
  for (const item of items) {
    const year = competitionYear(item.competition.dateDebut);
    const last = groups[groups.length - 1];
    if (last && last.year === year) last.items.push(item);
    else groups.push({ year, items: [item] });
  }
  return groups;
}

function formatSyncDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function ProfileHeader({ athlete }: { athlete: WtAthleteProfile }) {
  const wtSource = athlete.sources.find((s) => s.source === WT_RESULTS_SOURCE && s.sourceUrl);
  const { recorded, sourceRecord } = athlete.stats;

  return (
    <>
      <p className="text-xs font-semibold uppercase tracking-wide text-ekvara-muted">
        Profil public World Taekwondo
      </p>
      <h1 className="mt-2 break-words font-display text-3xl font-extrabold uppercase leading-none tracking-tight text-ekvara-black sm:text-5xl">
        {athlete.displayName}
      </h1>
      <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ekvara-black/55">
        <span className="font-semibold text-ekvara-black">{athlete.countryCode ?? 'Pays non renseigné'}</span>
        {wtSource?.sourceUrl && (
          <a
            href={wtSource.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-2 hover:text-ekvara-black hover:underline"
          >
            Voir sur WT Results ↗
          </a>
        )}
      </p>

      <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-6 border-t border-gray-200 pt-6 sm:grid-cols-4">
        <StatValue value={String(recorded.fights)} label="Combats" />
        <StatValue value={String(recorded.wins)} label="Victoires" />
        <StatValue value={String(recorded.losses)} label="Défaites" />
        <StatValue value={recorded.winRate === null ? '—' : `${recorded.winRate}%`} label="Taux de victoire" />
      </div>
      <p className="mt-4 text-xs text-ekvara-black/55">
        {formatFightCount(recorded.fights)} {recorded.fights === 1 ? 'recensé' : 'recensés'} dans EKVARA sur{' '}
        {recorded.competitions}{' '}
        {recorded.competitions === 1 ? 'compétition' : 'compétitions'}
        {recorded.unknown > 0 ? ` · ${recorded.unknown} au résultat inconnu, exclus du taux` : ''}.
        {sourceRecord && (
          <>
            {' '}
            Bilan affiché par WT Results : {sourceRecord.wins} V – {sourceRecord.losses} D
            {sourceRecord.syncedAt ? ` (relevé le ${formatSyncDate(sourceRecord.syncedAt)})` : ''}.
          </>
        )}
      </p>
    </>
  );
}

function WtAthletePage({ athleteId }: WtAthletePageProps) {
  const [athlete, setAthlete] = useState<WtAthleteProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [history, setHistory] = useState<WtCompetitionHistoryItem[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyLoadingMore, setHistoryLoadingMore] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Profil et historique chargés indépendamment : une erreur d'historique
  // n'empêche jamais d'afficher le profil (et inversement).
  useEffect(() => {
    let cancelled = false;
    window.scrollTo(0, 0);

    getWtAthlete(athleteId)
      .then((data) => {
        if (!cancelled) setAthlete(data);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        console.error("Erreur lors du chargement de l'athlète WT", err);
        setProfileError(err.message);
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });

    getWtAthleteCompetitions(athleteId, { page: 1, limit: COMPETITIONS_PAGE_SIZE })
      .then((data) => {
        if (cancelled) return;
        setHistory(data.items);
        setHistoryTotal(data.total);
        setHistoryPage(1);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        console.error("Erreur lors du chargement de l'historique WT", err);
        setHistoryError(err.message);
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [athleteId]);

  function loadMoreHistory() {
    const nextPage = historyPage + 1;
    setHistoryLoadingMore(true);
    getWtAthleteCompetitions(athleteId, { page: nextPage, limit: COMPETITIONS_PAGE_SIZE })
      .then((data) => {
        setHistory((prev) => [...prev, ...data.items]);
        setHistoryTotal(data.total);
        setHistoryPage(nextPage);
      })
      .catch((err: Error) => {
        console.error("Erreur lors du chargement de l'historique WT", err);
        setHistoryError(err.message);
      })
      .finally(() => setHistoryLoadingMore(false));
  }

  const notFound = profileError === WT_ATHLETE_NOT_FOUND_MESSAGE;
  const remaining = historyTotal - history.length;

  return (
    <div className="min-h-screen bg-ekvara-surface">
      <Header />
      <main className="mx-auto max-w-[54rem] px-4 py-8 sm:px-6">
        <a
          href="/athletes-wt"
          onClick={(event) => handleNavClick(event, '/athletes-wt')}
          className="text-sm text-ekvara-muted hover:text-ekvara-black"
        >
          ← Athlètes WT
        </a>

        <div className="mt-6">
          {profileLoading && <p className="text-sm text-ekvara-muted">Chargement du profil...</p>}
          {!profileLoading && notFound && (
            <div>
              <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight text-ekvara-black">
                Athlète introuvable
              </h1>
              <p className="mt-2 text-sm text-ekvara-muted">Ce profil World Taekwondo n'existe pas dans EKVARA.</p>
            </div>
          )}
          {!profileLoading && profileError && !notFound && (
            <p className="text-sm text-red-600">Impossible de charger ce profil. Réessaie dans un instant.</p>
          )}
          {!profileLoading && athlete && <ProfileHeader athlete={athlete} />}
        </div>

        {!notFound && (
          <section className="mt-8">
            <SectionLabel>Parcours</SectionLabel>

            {historyLoading && <p className="mt-4 text-sm text-ekvara-muted">Chargement des combats...</p>}

            {!historyLoading && historyError && history.length === 0 && (
              <p className="mt-4 text-sm text-red-600">Impossible de charger les combats. Réessaie dans un instant.</p>
            )}

            {!historyLoading && !historyError && history.length === 0 && (
              <p className="mt-4 text-sm text-ekvara-muted">Aucun combat recensé pour cet athlète.</p>
            )}

            {history.length > 0 && (
              <>
                {groupByYear(history).map((group) => (
                  <div key={group.year} className="mt-4">
                    <p className="font-display text-4xl font-extrabold leading-none tracking-tight text-ekvara-black/15 sm:text-5xl">
                      {group.year}
                    </p>
                    <div className="mt-4 space-y-8">
                      {group.items.map((item) => (
                        <WtCompetitionBlock key={item.competition.id} item={item} />
                      ))}
                    </div>
                  </div>
                ))}

                {historyError && (
                  <p className="mt-6 text-sm text-red-600">Impossible de charger la suite. Réessaie dans un instant.</p>
                )}

                {remaining > 0 && (
                  <Button variant="ghost" onClick={loadMoreHistory} disabled={historyLoadingMore} className="mt-8">
                    {historyLoadingMore
                      ? 'Chargement...'
                      : `Voir plus (${remaining} ${remaining === 1 ? 'compétition' : 'compétitions'})`}
                  </Button>
                )}
              </>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

export default WtAthletePage;
