import { useEffect, useState, type FormEvent } from 'react';
import Button from '../ui/Button';
import SectionLabel from '../ui/SectionLabel';
import StatValue from '../ui/StatValue';
import WtCompetitionBlock from '../wt/WtCompetitionBlock';
import { getWtProfile, requestWtProfileLink, unlinkWtProfile } from '../../services/athletes.api';
import { getWtAthlete, getWtAthleteCompetitions, searchWtAthletes } from '../../services/international.api';
import type { WtAthleteProfile, WtAthleteSummary, WtCompetitionHistoryItem } from '../../types/international';
import type { WtProfileView } from '../../types/wtLink';
import { handleNavClick } from '../../utils/navigation';

const RECENT_COMPETITIONS = 3;

function profileLabel(athlete: WtAthleteSummary): string {
  return athlete.countryCode ? `${athlete.displayName} (${athlete.countryCode})` : athlete.displayName;
}

// Palmarès international d'un profil CONFIRMÉ : bilan + dernières
// compétitions (mêmes données et même composant que /athletes-wt/:id), avec
// un lien vers le détail complet. Section indépendante : une erreur ici ne
// bloque jamais le reste du Passeport.
function InternationalRecord({ externalId }: { externalId: string }) {
  const [profile, setProfile] = useState<WtAthleteProfile | null>(null);
  const [competitions, setCompetitions] = useState<WtCompetitionHistoryItem[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getWtAthlete(externalId), getWtAthleteCompetitions(externalId, { page: 1, limit: RECENT_COMPETITIONS })])
      .then(([p, c]) => {
        if (cancelled) return;
        setProfile(p);
        setCompetitions(c.items);
      })
      .catch((err: Error) => {
        console.error('Erreur lors du chargement du palmarès international', err);
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [externalId]);

  if (error) return <p className="mt-4 text-sm text-red-600">Impossible de charger le palmarès international pour le moment.</p>;
  if (!profile) return <p className="mt-4 text-sm text-ekvara-muted">Chargement...</p>;

  const { recorded } = profile.stats;
  const href = `/athletes-wt/${externalId}`;
  return (
    <div className="mt-6">
      <div className="grid grid-cols-3 gap-4 sm:max-w-md">
        <StatValue value={String(recorded.competitions)} label={recorded.competitions > 1 ? 'Compétitions' : 'Compétition'} size="md" />
        <StatValue value={String(recorded.wins)} label={recorded.wins > 1 ? 'Victoires' : 'Victoire'} size="md" />
        <StatValue value={String(recorded.losses)} label={recorded.losses > 1 ? 'Défaites' : 'Défaite'} size="md" />
      </div>
      {competitions.length > 0 && (
        <div className="mt-6 flex flex-col gap-5">
          {competitions.map((item) => (
            <WtCompetitionBlock key={item.competition.id} item={item} />
          ))}
        </div>
      )}
      <a href={href} onClick={(event) => handleNavClick(event, href)} className="mt-6 inline-block text-sm font-medium text-ekvara-black hover:underline">
        Voir tout mon palmarès international →
      </a>
    </div>
  );
}

// Section Passeport "Profil World Taekwondo" : sans lien, suggestions (même
// nom) + recherche ; demande en attente de la confirmation du coach ; lien
// confirmé = palmarès international. Jamais relié sans action de l'athlète.
function WtProfileSection({ athleteId }: { athleteId: string }) {
  const [view, setView] = useState<WtProfileView | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<WtAthleteSummary[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getWtProfile(athleteId)
      .then((data) => {
        if (!cancelled) setView(data);
      })
      .catch((err: Error) => {
        console.error('Erreur lors du chargement du profil World Taekwondo', err);
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [athleteId]);

  function run(action: () => Promise<WtProfileView>) {
    setBusy(true);
    setActionError(null);
    action()
      .then((data) => {
        setView(data);
        setResults(null);
        setQuery('');
      })
      .catch((err: Error) => setActionError(err.message))
      .finally(() => setBusy(false));
  }

  function handleSearch(event: FormEvent) {
    event.preventDefault();
    const search = query.trim();
    if (!search) return;
    searchWtAthletes({ search, page: 1, limit: 10 })
      .then((page) => setResults(page.items))
      .catch((err: Error) => {
        console.error('Erreur lors de la recherche World Taekwondo', err);
        setActionError('Recherche impossible pour le moment.');
      });
  }

  const candidateRow = (athlete: WtAthleteSummary) => (
    <li key={athlete.id} className="flex items-center justify-between gap-3 py-3">
      <span className="text-sm font-semibold text-ekvara-black">{profileLabel(athlete)}</span>
      <Button variant="secondary" disabled={busy} onClick={() => run(() => requestWtProfileLink(athleteId, athlete.id))}>
        C'est moi
      </Button>
    </li>
  );

  return (
    <div>
      <SectionLabel>Palmarès international</SectionLabel>

      {loadError && <p className="mt-4 text-sm text-red-600">Impossible de charger ton profil World Taekwondo pour le moment.</p>}
      {!loadError && !view && <p className="mt-4 text-sm text-ekvara-muted">Chargement...</p>}

      {view?.link?.status === 'confirmed' && (
        <>
          <p className="mt-4 text-sm text-ekvara-black/70">
            Profil World Taekwondo : <span className="font-semibold text-ekvara-black">{profileLabel(view.link.externalAthlete)}</span>
          </p>
          <InternationalRecord externalId={view.link.externalAthlete.id} />
          <button
            type="button"
            disabled={busy}
            onClick={() => run(() => unlinkWtProfile(athleteId))}
            className="mt-4 block text-xs text-ekvara-black/60 hover:underline"
          >
            Ce n'est pas moi : retirer ce profil
          </button>
        </>
      )}

      {view?.link?.status === 'pending' && (
        <div className="mt-4">
          <p className="text-sm text-ekvara-black/70">
            Demande envoyée à ton coach pour le profil{' '}
            <span className="font-semibold text-ekvara-black">{profileLabel(view.link.externalAthlete)}</span>. Ton palmarès
            international apparaîtra ici dès qu'il l'aura confirmé.
          </p>
          <Button variant="ghost" className="mt-2" disabled={busy} onClick={() => run(() => unlinkWtProfile(athleteId))}>
            Annuler la demande
          </Button>
        </div>
      )}

      {view && view.link === null && (
        <div className="mt-4">
          <p className="text-sm text-ekvara-black/70">
            Tu as combattu en compétition World Taekwondo ? Relie ton profil pour afficher ton palmarès international. Ton
            coach confirmera que c'est bien toi.
          </p>

          {view.suggestions.length > 0 && (
            <>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-ekvara-muted">On a peut-être trouvé ton profil</p>
              <ul className="mt-1 divide-y divide-gray-200 border-t border-gray-200">{view.suggestions.map(candidateRow)}</ul>
            </>
          )}

          <form onSubmit={handleSearch} className="mt-4 flex max-w-md gap-2">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher mon nom"
              aria-label="Rechercher mon profil World Taekwondo"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <Button type="submit" variant="secondary">
              Rechercher
            </Button>
          </form>
          {results !== null && results.length === 0 && (
            <p className="mt-3 text-sm text-ekvara-muted">Aucun profil World Taekwondo à ce nom.</p>
          )}
          {results !== null && results.length > 0 && (
            <ul className="mt-2 max-w-md divide-y divide-gray-200 border-t border-gray-200">{results.map(candidateRow)}</ul>
          )}
        </div>
      )}

      {actionError && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {actionError}
        </p>
      )}
    </div>
  );
}

export default WtProfileSection;
