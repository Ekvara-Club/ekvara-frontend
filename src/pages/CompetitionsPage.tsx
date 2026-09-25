import { useEffect, useState } from 'react';
import Header from '../components/layout/Header';
import CompetitionListRow from '../components/activity/CompetitionListRow';
import SectionLabel from '../components/ui/SectionLabel';
import Button from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import {
  getCoachPreparations,
  getCompetitions,
  getCompetitionCatalogPaginated,
  getCompetitionYears,
} from '../services/athletes.api';
import { navigateTo } from '../utils/navigation';
import { buildMyUpcomingCompetitions } from '../utils/coachPreparation';
import type { MyCompetitionRow } from '../utils/coachPreparation';
import type { ParticipationListItem } from '../types/activity';
import type { CoachPreparationItem, CompetitionCatalogItem, CompetitionCatalogScope } from '../types/competition';

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
// Une compétition simplement préparée par le coach est signalée comme telle
// (jamais présentée comme une inscription).
function formatMyCompetitionMeta(row: MyCompetitionRow): string | null {
  const location = [row.competition.ville, row.competition.pays].filter(Boolean).join(', ');
  const category = [row.categorieAge, row.categoriePoids].filter(Boolean).join(' · ');
  const plannedByCoach = row.source === 'coach_preparation' ? 'Prévue par ton coach' : null;
  return [location, category, plannedByCoach].filter(Boolean).join(' · ') || null;
}

function formatCatalogMeta(item: CompetitionCatalogItem): string | null {
  return [item.ville, item.pays].filter(Boolean).join(', ') || null;
}

// Filtres de l'explorateur (ticket #18), portés par l'URL :
// /competitions?status=upcoming|past&year=2026. Valeur absente ou invalide ⇒
// défaut (toutes / toutes les années) — jamais d'erreur affichée pour une URL
// modifiée à la main.
type StatusFilter = 'all' | CompetitionCatalogScope;

interface CatalogFilters {
  status: StatusFilter;
  year: number | null;
}

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Toutes' },
  { value: 'upcoming', label: 'À venir' },
  { value: 'past', label: 'Passées' },
];

function readFiltersFromUrl(): CatalogFilters {
  const params = new URLSearchParams(window.location.search);
  const rawStatus = params.get('status');
  const status: StatusFilter = rawStatus === 'upcoming' || rawStatus === 'past' ? rawStatus : 'all';
  const rawYear = params.get('year');
  const year = rawYear !== null && /^\d{4}$/.test(rawYear) ? Number(rawYear) : null;
  return { status, year };
}

// pushState : chaque changement de filtre est une entrée d'historique, que
// précédent/suivant rejouent (écoute popstate ci-dessous). Les paramètres
// par défaut sont retirés de l'URL.
function writeFiltersToUrl(filters: CatalogFilters): void {
  const params = new URLSearchParams(window.location.search);
  if (filters.status === 'all') params.delete('status');
  else params.set('status', filters.status);
  if (filters.year === null) params.delete('year');
  else params.set('year', String(filters.year));
  const query = params.toString();
  window.history.pushState(window.history.state, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
}

function useUrlFilters(): [CatalogFilters, (next: CatalogFilters) => void] {
  const [filters, setFilters] = useState<CatalogFilters>(readFiltersFromUrl);

  useEffect(() => {
    const onPopState = () => setFilters(readFiltersFromUrl());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  function update(next: CatalogFilters) {
    writeFiltersToUrl(next);
    setFilters(next);
  }

  return [filters, update];
}

// Message vide qui reflète les filtres actifs (jamais un "Aucune compétition"
// trompeur quand c'est le filtre qui vide la liste).
function emptyMessage(scope: CompetitionCatalogScope, year: number | null, search: string): string {
  const base = scope === 'upcoming' ? 'Aucune compétition à venir' : 'Aucune compétition passée';
  return `${base}${year !== null ? ` en ${year}` : ''}${search ? ` pour « ${search} »` : ''}.`;
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
function useCatalogSection(scope: CompetitionCatalogScope, search: string, year: number | null, enabled: boolean): CatalogState {
  const [items, setItems] = useState<CompetitionCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Tout changement de filtre (recherche, année) recharge la page 1 : la
  // pagination repart toujours de zéro. Section masquée (statut) : aucun appel.
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    getCompetitionCatalogPaginated({ page: 1, limit: PAGE_SIZE, scope, search: search || undefined, year: year ?? undefined })
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
  }, [scope, search, year, enabled]);

  function loadMore() {
    const nextPage = page + 1;
    setLoadingMore(true);
    getCompetitionCatalogPaginated({ page: nextPage, limit: PAGE_SIZE, scope, search: search || undefined, year: year ?? undefined })
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

function CatalogSection({
  title,
  scope,
  state,
  search,
  year,
  onReset,
}: {
  title: string;
  scope: CompetitionCatalogScope;
  state: CatalogState;
  search: string;
  year: number | null;
  onReset: (() => void) | null;
}) {
  const hasMore = state.items.length < state.total;

  return (
    <section className="mt-10 border-t border-gray-200 pt-8">
      <SectionLabel>{title}</SectionLabel>

      {state.loading && <p className="mt-4 text-sm text-ekvara-muted">Chargement...</p>}

      {!state.loading && state.error && (
        <p className="mt-4 text-sm text-red-600">Impossible de charger le catalogue.</p>
      )}

      {!state.loading && !state.error && state.items.length === 0 && (
        <div className="mt-4">
          <p className="text-sm text-ekvara-muted">{emptyMessage(scope, year, search)}</p>
          {onReset && (
            <Button variant="ghost" onClick={onReset} className="mt-2">
              Voir toutes les compétitions →
            </Button>
          )}
        </div>
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

  const [myParticipations, setMyParticipations] = useState<ParticipationListItem[]>([]);
  const [myPreparations, setMyPreparations] = useState<CoachPreparationItem[]>([]);
  const [myCompetitionsLoading, setMyCompetitionsLoading] = useState(true);
  const [myCompetitionsError, setMyCompetitionsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Les préparations coach enrichissent "Mes compétitions" mais ne doivent
    // jamais la faire échouer : si elles sont indisponibles, les participations
    // restent affichées telles quelles.
    Promise.all([
      getCompetitions(athleteId),
      getCoachPreparations(athleteId).catch((error: Error) => {
        console.error('Erreur lors du chargement des préparations coach', error);
        return [] as CoachPreparationItem[];
      }),
    ])
      .then(([participations, preparations]) => {
        if (cancelled) return;
        setMyParticipations(participations);
        setMyPreparations(preparations);
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
  // jamais dupliqué ici. Participations actives + compétitions préparées par
  // le coach, sans doublon par compétition (voir buildMyUpcomingCompetitions).
  const myUpcoming = buildMyUpcomingCompetitions(myParticipations, myPreparations, startOfToday());

  // Recherche catalogue (§6) : debounce, jamais un filtrage client sur des
  // centaines de lignes — chaque frappe finit par déclencher une nouvelle
  // requête backend paginée pour les deux sections catalogue.
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const [filters, setFilters] = useUrlFilters();
  const showUpcoming = filters.status !== 'past';
  const showPast = filters.status !== 'upcoming';
  const upcoming = useCatalogSection('upcoming', search, filters.year, showUpcoming);
  const past = useCatalogSection('past', search, filters.year, showPast);

  // Années du catalogue : si indisponibles, le sélecteur n'offre que "Toutes
  // les années" (et l'année éventuellement présente dans l'URL) — le reste de
  // l'explorateur fonctionne normalement.
  const [years, setYears] = useState<number[]>([]);
  useEffect(() => {
    let cancelled = false;
    getCompetitionYears()
      .then((data) => {
        if (!cancelled) setYears(data);
      })
      .catch((error: Error) => console.error('Erreur lors du chargement des années', error));
    return () => {
      cancelled = true;
    };
  }, []);
  const yearOptions =
    filters.year !== null && !years.includes(filters.year) ? [...years, filters.year].sort((a, b) => b - a) : years;

  const filtersActive = filters.status !== 'all' || filters.year !== null;
  const resetFilters = filtersActive ? () => setFilters({ status: 'all', year: null }) : null;

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

        {/* Filtres (ticket #18) : statut toujours visible, année en sélecteur
            compact ; les deux composent avec la recherche. */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <div role="group" aria-label="Statut" className="flex items-center gap-5">
            {STATUS_OPTIONS.map((option) => {
              const active = filters.status === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    if (!active) setFilters({ ...filters, status: option.value });
                  }}
                  className={`border-b-2 pb-0.5 text-sm transition-colors ${
                    active
                      ? 'border-ekvara-lime font-semibold text-ekvara-black'
                      : 'border-transparent font-medium text-ekvara-black/50 hover:text-ekvara-black'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <label className="flex items-center gap-2 text-sm">
            <span className="sr-only">Année</span>
            <select
              value={filters.year === null ? '' : String(filters.year)}
              onChange={(event) =>
                setFilters({ ...filters, year: event.target.value === '' ? null : Number(event.target.value) })
              }
              className="border-b border-ekvara-black/20 bg-transparent py-1 pr-1 text-sm font-medium text-ekvara-black focus:border-ekvara-black focus:outline-none"
            >
              <option value="">Toutes les années</option>
              {yearOptions.map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Mes compétitions masqué pendant une recherche ou un filtre actif :
            sinon une liste figée (non filtrée) resterait affichée à côté d'un
            catalogue filtré, un décalage confus (§5 : bien distinguer mes
            compétitions du catalogue). */}
        {!search && !filtersActive && (
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
                {myUpcoming.map((row) => (
                  <CompetitionListRow
                    key={row.key}
                    dateDebut={row.competition.dateDebut}
                    nom={row.competition.nom}
                    metaLine={formatMyCompetitionMeta(row)}
                    rightLabel={getDaysUntilLabel(row.competition.dateDebut)}
                    onClick={() => navigateTo(`/competitions/${row.competition.id}`)}
                  />
                ))}
              </ul>
            )}
          </section>
        )}

        {showUpcoming && (
          <CatalogSection
            title="À venir"
            scope="upcoming"
            state={upcoming}
            search={search}
            year={filters.year}
            onReset={resetFilters}
          />
        )}
        {showPast && (
          <CatalogSection
            title="Passées"
            scope="past"
            state={past}
            search={search}
            year={filters.year}
            onReset={resetFilters}
          />
        )}
      </main>
    </div>
  );
}

export default CompetitionsPage;
