import { useEffect, useState } from 'react';
import Header from '../components/layout/Header';
import Button from '../components/ui/Button';
import SectionLabel from '../components/ui/SectionLabel';
import { searchWtAthletes } from '../services/international.api';
import type { WtAthleteSearchItem } from '../types/international';
import { handleNavClick } from '../utils/navigation';
import { formatFightCount } from '../utils/wtFormat';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;
const MIN_SEARCH_LENGTH = 2;

function readQueryFromUrl(): string {
  return new URLSearchParams(window.location.search).get('q') ?? '';
}

// La recherche vit dans l'URL (?q=) : revenir d'un profil avec "précédent"
// retrouve la même liste, et le lien est partageable. replaceState seul :
// taper ne crée pas une entrée d'historique par lettre.
function writeQueryToUrl(query: string): void {
  const url = query ? `${window.location.pathname}?q=${encodeURIComponent(query)}` : window.location.pathname;
  window.history.replaceState(window.history.state, '', url);
}

// Ligne éditoriale partagée par "Athlètes à découvrir" et "Résultats" :
// nom, NOC, nombre de combats recensés, flèche. Desktop : colonnes alignées ;
// mobile : le nom peut passer à la ligne, les métadonnées restent dessous.
function WtAthleteRow({ athlete }: { athlete: WtAthleteSearchItem }) {
  const href = `/athletes-wt/${athlete.id}`;
  const fights = formatFightCount(athlete.fightCount);

  return (
    <li>
      <a
        href={href}
        onClick={(event) => handleNavClick(event, href)}
        className="group flex items-center gap-4 py-3.5 transition-colors hover:bg-gray-50"
      >
        <div className="min-w-0 flex-1">
          <p className="break-words font-medium text-ekvara-black">{athlete.displayName}</p>
          <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-ekvara-black/55 sm:hidden">
            {[athlete.countryCode, fights].filter(Boolean).join(' · ')}
          </p>
        </div>
        <span className="hidden w-12 flex-shrink-0 text-xs font-semibold uppercase tracking-wide text-ekvara-black/55 sm:block">
          {athlete.countryCode ?? '—'}
        </span>
        <span className="hidden w-28 flex-shrink-0 text-right text-xs font-semibold uppercase tracking-wide text-ekvara-black/55 sm:block">
          {fights}
        </span>
        <span
          className="flex-shrink-0 text-ekvara-muted transition-colors group-hover:text-ekvara-black"
          aria-hidden="true"
        >
          →
        </span>
      </a>
    </li>
  );
}

// Découverte (aucune recherche active) : athlètes les plus représentés dans
// les combats recensés, ordre déterministe fourni par le backend (sort=fights :
// combats décroissants puis nom). Aucun classement ni score affiché.
const DISCOVERY_SIZE = 6;

function DiscoverySection() {
  const [items, setItems] = useState<WtAthleteSearchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    searchWtAthletes({ page: 1, limit: DISCOVERY_SIZE, sort: 'fights' })
      .then((data) => {
        if (!cancelled) setItems(data.items);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        console.error('Erreur lors du chargement des athlètes à découvrir', err);
        setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="mt-12">
      <SectionLabel>Athlètes à découvrir</SectionLabel>
      {loading && <p className="mt-4 text-sm text-ekvara-muted">Chargement...</p>}
      {!loading && error && (
        <p className="mt-4 text-sm text-ekvara-black/55">Suggestions indisponibles pour le moment.</p>
      )}
      {!loading && !error && items.length > 0 && (
        <ul className="mt-3 divide-y divide-gray-100 border-t border-gray-200">
          {items.map((athlete) => (
            <WtAthleteRow key={athlete.id} athlete={athlete} />
          ))}
        </ul>
      )}
    </section>
  );
}

function WtAthletesPage() {
  const [input, setInput] = useState(readQueryFromUrl);
  const [query, setQuery] = useState(() => readQueryFromUrl().trim());
  const [items, setItems] = useState<WtAthleteSearchItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(input.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [input]);

  useEffect(() => {
    writeQueryToUrl(query);
    setError(null);
    if (query.length < MIN_SEARCH_LENGTH) {
      setItems([]);
      setTotal(0);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    searchWtAthletes({ search: query, page: 1, limit: PAGE_SIZE })
      .then((data) => {
        if (cancelled) return;
        setItems(data.items);
        setTotal(data.total);
        setPage(1);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        console.error('Erreur lors de la recherche des athlètes WT', err);
        setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [query]);

  function loadMore() {
    const nextPage = page + 1;
    setLoadingMore(true);
    searchWtAthletes({ search: query, page: nextPage, limit: PAGE_SIZE })
      .then((data) => {
        setItems((prev) => [...prev, ...data.items]);
        setTotal(data.total);
        setPage(nextPage);
      })
      .catch((err: Error) => {
        console.error('Erreur lors de la recherche des athlètes WT', err);
        setError(err.message);
      })
      .finally(() => setLoadingMore(false));
  }

  const hasMore = items.length < total;
  const tooShort = query.length < MIN_SEARCH_LENGTH;

  return (
    <div className="min-h-screen bg-ekvara-surface">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="font-display text-3xl font-extrabold uppercase tracking-tight text-ekvara-black sm:text-4xl">
          Athlètes WT
        </h1>
        <p className="mt-2 max-w-xl text-sm text-ekvara-black/55">
          Profils publics World Taekwondo et leurs combats recensés dans EKVARA.
        </p>

        <div className="mt-8">
          <label htmlFor="wt-athlete-search" className="sr-only">
            Rechercher un athlète
          </label>
          <input
            id="wt-athlete-search"
            type="search"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Nom de l'athlète"
            autoComplete="off"
            className="w-full border-b border-ekvara-black/20 bg-transparent py-3 text-lg text-ekvara-black placeholder:text-ekvara-muted focus:border-ekvara-black focus:outline-none"
          />
        </div>

        <p className="mt-2 text-xs text-ekvara-black/55">
          {tooShort ? `Au moins ${MIN_SEARCH_LENGTH} lettres du nom pour lancer la recherche.` : '\u00a0'}
        </p>

        {tooShort && <DiscoverySection />}

        {!tooShort && (
          <section className="mt-10">
            <SectionLabel>{!loading && !error ? `Résultats · ${total}` : 'Résultats'}</SectionLabel>

            {loading && <p className="mt-4 text-sm text-ekvara-muted">Recherche...</p>}

            {!loading && error && (
              <p className="mt-4 text-sm text-red-600">Impossible de charger les athlètes. Réessaie dans un instant.</p>
            )}

            {!loading && !error && items.length === 0 && (
              <p className="mt-4 text-sm text-ekvara-black/55">Aucun athlète trouvé pour « {query} ».</p>
            )}

            {!loading && items.length > 0 && (
              <>
                <ul className="mt-3 divide-y divide-gray-100 border-t border-gray-200">
                  {items.map((athlete) => (
                    <WtAthleteRow key={athlete.id} athlete={athlete} />
                  ))}
                </ul>
                {hasMore && (
                  <Button variant="ghost" onClick={loadMore} disabled={loadingMore} className="mt-4">
                    {loadingMore ? 'Chargement...' : `Voir plus (${total - items.length} restants)`}
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

export default WtAthletesPage;
