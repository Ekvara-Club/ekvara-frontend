import { useEffect, useMemo, useState } from 'react';
import SectionLabel from '../ui/SectionLabel';
import StatValue from '../ui/StatValue';
import EntryRow from './EntryRow';
import { getCompetitionEntries } from '../../services/athletes.api';
import { findMyEntryCategory } from '../../utils/competitionEntriesMatch';
import { groupWeightCategories } from '../../utils/wtFormat';
import type { CompetitionEntriesResponse, CompetitionEntry } from '../../types/competition-entries';

interface CompetitionEntriesSectionProps {
  competitionId: string;
  // Issues de la participation de l'athlète courant, jamais d'un autre
  // athlete — null si aucune participation ou catégorie non renseignée.
  categorieAge: string | null;
  categoriePoids: string | null;
  // Aucune section Résultats sur la fiche (aucun combat recensé) : le
  // compteur de combats (0) est affiché ici, comme dans Résultats.
  showMatchCount?: boolean;
}

// Même normalisation que ExercisesPage (recherche insensible à la casse et
// aux accents) — dupliquée plutôt qu'extraite en util partagé : un seul
// autre usage existant dans le code, pas encore une abstraction justifiée.
const DIACRITICS_PATTERN = /[̀-ͯ]/g;

function normalizeSearchText(value: string): string {
  return value.trim().toLowerCase().normalize('NFD').replace(DIACRITICS_PATTERN, '');
}

// Recherche utile seulement à partir d'un volume réel (§19) — sous ce seuil,
// parcourir les quelques catégories affichées suffit largement.
const SEARCH_MIN_ENTRIES = 20;

function formatCount(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function matchesQuery(entry: CompetitionEntry, normalizedQuery: string): boolean {
  return (
    normalizeSearchText(entry.name).includes(normalizedQuery) ||
    (entry.club !== null && normalizeSearchText(entry.club).includes(normalizedQuery))
  );
}

// Section autonome (§6) : possède son propre loading/error, jamais couplée au
// chargement de la compétition ou de la participation — un échec ici
// n'affecte jamais le hero, "Ma participation" ou "Résultat".
// Même présentation que la section Résultats : chiffres clés, catégories
// regroupées par préfixe (Men / Women…), puis les athlètes de la catégorie
// choisie — même quand aucun combat n'est recensé.
function CompetitionEntriesSection({ competitionId, categorieAge, categoriePoids, showMatchCount = false }: CompetitionEntriesSectionProps) {
  const [data, setData] = useState<CompetitionEntriesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    getCompetitionEntries(competitionId)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err: Error) => {
        if (!cancelled) {
          console.error('Erreur lors du chargement des inscrits', err);
          setError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [competitionId]);

  // Correspondance UNIQUE uniquement (§10) : jamais de choix arbitraire entre
  // plusieurs candidates, jamais une catégorie mise en avant sans certitude.
  const myCategory = useMemo(
    () => (data ? findMyEntryCategory(data.categories, categorieAge, categoriePoids) : null),
    [data, categorieAge, categoriePoids],
  );

  // Catégorie ouverte : celle choisie, sinon "ma catégorie", sinon la
  // première (ordre backend) — jamais une catégorie inventée.
  const selectedCategory =
    data?.categories.find((c) => c.rawLabel === selected) ?? myCategory ?? data?.categories[0] ?? null;

  const normalizedQuery = normalizeSearchText(query);
  const searchResults = useMemo(() => {
    if (!data || !normalizedQuery) return null;
    return data.categories.flatMap((category) =>
      category.entries
        .filter((entry) => matchesQuery(entry, normalizedQuery))
        .map((entry) => ({ entry, categoryLabel: category.rawLabel })),
    );
  }, [data, normalizedQuery]);

  return (
    <section className="mt-10 border-t border-gray-200 pt-8">
      <SectionLabel>Participants</SectionLabel>

      {loading && <p className="mt-4 text-sm text-ekvara-muted">Chargement...</p>}

      {!loading && error && (
        <p className="mt-4 text-sm text-red-600">Impossible de charger les inscrits.</p>
      )}

      {!loading && !error && data && (
        <>
          <div className="mt-5 grid max-w-md grid-cols-3 gap-x-6">
            {showMatchCount && <StatValue value="0" label="Combats" size="md" />}
            <StatValue value={String(data.totalEntries)} label={data.totalEntries === 1 ? 'Athlète' : 'Athlètes'} size="md" />
            <StatValue
              value={String(data.categories.length)}
              label={data.categories.length === 1 ? 'Catégorie' : 'Catégories'}
              size="md"
            />
          </div>

          {data.totalEntries === 0 && (
            <p className="mt-4 text-sm text-ekvara-muted">Aucun inscrit publié pour le moment.</p>
          )}

          {data.totalEntries > 0 && (
            <>
              <nav aria-label="Catégories des participants" className="mt-8 space-y-4">
                {groupWeightCategories(data.categories, (c) => c.rawLabel).map((group) => (
                  <div key={group.name ?? '__autres'} className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:gap-6">
                    <p className="w-24 flex-shrink-0 text-xs font-semibold uppercase tracking-wide text-ekvara-black/55">
                      {group.name ?? 'Autres'}
                    </p>
                    <div className="flex flex-wrap gap-x-5 gap-y-2">
                      {group.items.map(({ item: category, shortLabel }) => {
                        const isSelected = category.rawLabel === selectedCategory?.rawLabel;
                        const isMine = category.rawLabel === myCategory?.rawLabel;
                        return (
                          <button
                            key={category.rawLabel}
                            type="button"
                            onClick={() => {
                              setSelected(category.rawLabel);
                              setQuery('');
                            }}
                            aria-pressed={isSelected}
                            aria-label={isMine ? `${category.rawLabel} (ma catégorie)` : category.rawLabel}
                            className={`flex items-center gap-1.5 border-b-2 pb-0.5 font-display text-base font-bold uppercase tracking-tight transition-colors ${
                              isSelected
                                ? 'border-ekvara-lime text-ekvara-black'
                                : 'border-transparent text-ekvara-black/45 hover:text-ekvara-black'
                            }`}
                          >
                            {isMine && <span className="h-1.5 w-1.5 rounded-full bg-ekvara-lime" aria-hidden="true" />}
                            {shortLabel}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </nav>

              {data.totalEntries >= SEARCH_MIN_ENTRIES && (
                <input
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Rechercher un inscrit..."
                  aria-label="Rechercher un inscrit"
                  className="mt-8 w-full max-w-md rounded-md border border-gray-300 px-4 py-2.5 text-sm"
                />
              )}

              {searchResults ? (
                <div className="mt-6 divide-y divide-gray-100 border-t border-gray-100">
                  {searchResults.length === 0 && <p className="py-4 text-sm text-ekvara-muted">Aucun inscrit trouvé.</p>}
                  {searchResults.map(({ entry, categoryLabel }, index) => (
                    <div key={entry.id}>
                      <EntryRow entry={entry} index={index} />
                      <p className="-mt-1 pb-2 pl-9 text-xs text-ekvara-muted">{categoryLabel}</p>
                    </div>
                  ))}
                </div>
              ) : (
                selectedCategory && (
                  <div className="mt-10">
                    {selectedCategory.rawLabel === myCategory?.rawLabel && (
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-ekvara-lime" aria-hidden="true" />
                        <p className="text-xs font-semibold uppercase tracking-wide text-ekvara-black/40">Ma catégorie</p>
                      </div>
                    )}
                    <h3 className="font-display text-2xl font-extrabold uppercase leading-tight tracking-tight text-ekvara-black sm:text-3xl">
                      {selectedCategory.rawLabel}
                    </h3>
                    <p className="mt-1 text-sm text-ekvara-black/55">
                      {formatCount(selectedCategory.entries.length, 'athlète', 'athlètes')}
                    </p>
                    <div className="mt-6 divide-y divide-gray-100 border-t border-gray-100">
                      {selectedCategory.entries.map((entry, index) => (
                        <EntryRow key={entry.id} entry={entry} index={index} />
                      ))}
                    </div>
                  </div>
                )
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}

export default CompetitionEntriesSection;
