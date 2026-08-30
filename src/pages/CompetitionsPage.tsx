import { useEffect, useState } from 'react';
import Header from '../components/layout/Header';
import CompetitionListRow from '../components/activity/CompetitionListRow';
import SectionLabel from '../components/ui/SectionLabel';
import Button from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { getCompetitions, getCompetitionCatalogPaginated } from '../services/athletes.api';
import { navigateTo } from '../utils/navigation';
import type { ParticipationListItem } from '../types/activity';
import type { CompetitionCatalogItem, CompetitionCatalogScope } from '../types/competition';

const EXCLUDED_PARTICIPATION_STATUSES = ['annule', 'retire'];
const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

// Même technique que CompetitionPage/ActivityPage : dateDebut est une DATE
// métier sans heure — jamais new Date() naïf.
function parseDateOnly(dateString: string): Date {
  const [year, month, day] = dateString.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day);
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function getDaysUntilLabel(dateDebut: string): string {
  const targetDate = parseDateOnly(dateDebut);
  const diffDays = Math.round((targetDate.getTime() - startOfToday().getTime()) / 86_400_000);
  if (diffDays <= 0) return "Aujourd'hui";
  if (diffDays === 1) return 'J-1';
  return `J-${diffDays}`;
}

function capitalizeFirst(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

// "Mes compétitions" (§4-5) : lieu + catégorie personnelle, jamais confondu
// avec les métadonnées catalogue (niveau) affichées dans "À venir"/"Passées".
function formatMyCompetitionMeta(p: ParticipationListItem): string | null {
  const location = [p.competition.ville, p.competition.pays].filter(Boolean).join(', ');
  const category = [p.categorieAge, p.categoriePoids].filter(Boolean).join(' · ');
  return [location, category].filter(Boolean).join(' · ') || null;
}

function formatCatalogMeta(item: CompetitionCatalogItem): string | null {
  return [item.ville, item.pays].filter(Boolean).join(', ') || null;
}

interface CatalogState {
  items: CompetitionCatalogItem[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  total: number;
  loadMore: () => void;
}

// Recherche + pagination réellement backend (§6/§8) : chaque section ("À
// venir"/"Passées") gère son propre catalogue paginé indépendamment, jamais
// un chargement client de centaines de lignes à filtrer sur place.
function useCatalogSection(scope: CompetitionCatalogScope, search: string): CatalogState {
  const [items, setItems] = useState<CompetitionCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getCompetitionCatalogPaginated({ page: 1, limit: PAGE_SIZE, scope, search: search || undefined })
      .then((data) => {
        if (cancelled) return;
        setItems(data.items);
        setTotal(data.total);
        setPage(1);
      })
      .catch((err: Error) => {
        if (!cancelled) {
          console.error('Erreur lors du chargement du catalogue', err);
          setError(err.message);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [scope, search]);

  function loadMore() {
    const nextPage = page + 1;
    setLoadingMore(true);
    getCompetitionCatalogPaginated({ page: nextPage, limit: PAGE_SIZE, scope, search: search || undefined })
      .then((data) => {
        setItems((prev) => [...prev, ...data.items]);
        setPage(nextPage);
        setTotal(data.total);
      })
      .catch((err: Error) => {
        console.error('Erreur lors du chargement du catalogue', err);
        setError(err.message);
      })
      .finally(() => setLoadingMore(false));
  }

  return { items, loading, loadingMore, error, total, loadMore };
}

function CatalogSection({ title, state, search }: { title: string; state: CatalogState; search: string }) {
  const hasMore = state.items.length < state.total;

  return (
    <section className="mt-10 border-t border-gray-200 pt-8">
      <SectionLabel>{title}</SectionLabel>

      {state.loading && <p className="mt-4 text-sm text-ekvara-muted">Chargement...</p>}

      {!state.loading && state.error && (
        <p className="mt-4 text-sm text-red-600">Impossible de charger le catalogue.</p>
      )}

      {!state.loading && !state.error && state.items.length === 0 && (
        <p className="mt-4 text-sm text-ekvara-muted">
          {search ? `Aucun résultat pour « ${search} ».` : 'Aucune compétition trouvée.'}
        </p>
      )}

      {!state.loading && !state.error && state.items.length > 0 && (
        <>
          <ul className="mt-4 divide-y divide-gray-100">
            {state.items.map((item) => (
              <CompetitionListRow
                key={item.id}
                dateDebut={item.date_debut}
                nom={item.nom}
                metaLine={formatCatalogMeta(item)}
                rightLabel={item.niveau ? capitalizeFirst(item.niveau) : null}
                onClick={() => navigateTo(`/competitions/${item.id}`)}
              />
            ))}
          </ul>

          {hasMore && (
            <Button variant="ghost" onClick={state.loadMore} disabled={state.loadingMore} className="mt-4">
              {state.loadingMore ? 'Chargement...' : `Voir plus (${state.total - state.items.length} restantes)`}
            </Button>
          )}
        </>
      )}
    </section>
  );
}

function CompetitionsPage() {
  // CompetitionsPage n'est rendue que lorsque l'utilisateur est authentifié
  // (garde dans App.tsx) : athlete est donc garanti non-null ici.
  const { athlete } = useAuth();
  const athleteId = athlete!.id;

  const [myCompetitions, setMyCompetitions] = useState<ParticipationListItem[]>([]);
  const [myCompetitionsLoading, setMyCompetitionsLoading] = useState(true);
  const [myCompetitionsError, setMyCompetitionsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCompetitions(athleteId)
      .then((data) => {
        if (!cancelled) setMyCompetitions(data);
      })
      .catch((error: Error) => {
        if (!cancelled) {
          console.error('Erreur lors du chargement des compétitions', error);
          setMyCompetitionsError(error.message);
        }
      })
      .finally(() => {
        if (!cancelled) setMyCompetitionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [athleteId]);

  // Teaser volontairement limité aux échéances à venir (§4) : le suivi complet
  // upcoming+past des participations personnelles vit déjà sur /activite,
  // jamais dupliqué ici.
  const today = startOfToday();
  const myUpcoming = myCompetitions
    .filter((p) => !EXCLUDED_PARTICIPATION_STATUSES.includes(p.statut))
    .filter((p) => parseDateOnly(p.competition.dateDebut) >= today)
    .sort((a, b) => a.competition.dateDebut.localeCompare(b.competition.dateDebut));

  // Recherche catalogue (§6) : debounce, jamais un filtrage client sur des
  // centaines de lignes — chaque frappe finit par déclencher une nouvelle
  // requête backend paginée pour les deux sections catalogue.
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const upcoming = useCatalogSection('upcoming', search);
  const past = useCatalogSection('past', search);

  return (
    <div className="min-h-screen bg-ekvara-surface">
      <Header />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <h1 className="font-display text-3xl font-extrabold uppercase tracking-tight text-ekvara-black sm:text-4xl">
          Compétitions
        </h1>
        <p className="mt-2 text-sm text-ekvara-muted">
          Trouve tes prochaines échéances et explore le calendrier.
        </p>

        <div className="mt-6">
          <label htmlFor="competition-search" className="sr-only">
            Rechercher une compétition par nom, ville ou pays
          </label>
          <input
            id="competition-search"
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Nom, ville ou pays..."
            className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-sm text-ekvara-black placeholder:text-ekvara-muted focus:border-ekvara-black focus:outline-none focus:ring-1 focus:ring-ekvara-black sm:max-w-sm"
          />
        </div>

        {/* Mes compétitions masqué pendant une recherche active : sinon une
            liste figée (non filtrée) resterait affichée à côté d'un catalogue
            filtré, un décalage confus (§5 : bien distinguer mes compétitions
            du catalogue). */}
        {!search && (
          <section className="mt-10">
            <SectionLabel>Mes compétitions</SectionLabel>

            {myCompetitionsLoading && <p className="mt-4 text-sm text-ekvara-muted">Chargement...</p>}

            {!myCompetitionsLoading && myCompetitionsError && (
              <p className="mt-4 text-sm text-red-600">Impossible de charger tes compétitions.</p>
            )}

            {!myCompetitionsLoading && !myCompetitionsError && myUpcoming.length === 0 && (
              <p className="mt-4 text-sm text-ekvara-muted">
                Tu n'as aucune compétition prévue pour le moment.
              </p>
            )}

            {!myCompetitionsLoading && !myCompetitionsError && myUpcoming.length > 0 && (
              <ul className="mt-4 divide-y divide-gray-100">
                {myUpcoming.map((p) => (
                  <CompetitionListRow
                    key={p.id}
                    dateDebut={p.competition.dateDebut}
                    nom={p.competition.nom}
                    metaLine={formatMyCompetitionMeta(p)}
                    rightLabel={getDaysUntilLabel(p.competition.dateDebut)}
                    onClick={() => navigateTo(`/competitions/${p.competition.id}`)}
                  />
                ))}
              </ul>
            )}
          </section>
        )}

        <CatalogSection title="À venir" state={upcoming} search={search} />
        <CatalogSection title="Passées" state={past} search={search} />
      </main>
    </div>
  );
}

export default CompetitionsPage;
