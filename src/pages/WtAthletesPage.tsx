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

function WtAthleteRow({ athlete }: { athlete: WtAthleteSearchItem }) {
  const href = `/athletes-wt/${athlete.id}`;
  const meta = [athlete.countryCode, formatFightCount(athlete.fightCount)].filter(Boolean).join(' · ');

  return (
    <li>
      <a
        href={href}
        onClick={(event) => handleNavClick(event, href)}
        className="flex items-center justify-between gap-4 py-3.5 transition-colors hover:bg-gray-50"
      >
        <div className="min-w-0">
          <p className="break-words font-medium text-ekvara-black">{athlete.displayName}</p>
          <p className="mt-0.5 text-sm text-ekvara-muted">{meta}</p>
        </div>
        <span className="flex-shrink-0 text-ekvara-muted" aria-hidden="true">
          →
        </span>
      </a>
    </li>
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
        <p className="mt-2 max-w-xl text-sm text-ekvara-muted">
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

        <section className="mt-8">
          {!tooShort && !loading && !error && (
            <SectionLabel>
              {total} {total === 1 ? 'athlète' : 'athlètes'}
            </SectionLabel>
          )}

          {tooShort && (
            <p className="text-sm text-ekvara-muted">Saisis au moins {MIN_SEARCH_LENGTH} lettres du nom.</p>
          )}

          {!tooShort && loading && <p className="text-sm text-ekvara-muted">Recherche...</p>}

          {!tooShort && !loading && error && (
            <p className="text-sm text-red-600">Impossible de charger les athlètes. Réessaie dans un instant.</p>
          )}

          {!tooShort && !loading && !error && items.length === 0 && (
            <p className="mt-4 text-sm text-ekvara-muted">Aucun athlète trouvé pour « {query} ».</p>
          )}

          {!tooShort && !loading && items.length > 0 && (
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
      </main>
    </div>
  );
}

export default WtAthletesPage;
