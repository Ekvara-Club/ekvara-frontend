import { useEffect, useMemo, useState } from 'react';
import SectionLabel from '../ui/SectionLabel';
import EntryRow from './EntryRow';
import CategoryDisclosureRow from './CategoryDisclosureRow';
import { getCompetitionEntries } from '../../services/athletes.api';
import { findMyEntryCategory } from '../../utils/competitionEntriesMatch';
import type { CompetitionEntriesResponse, CompetitionEntry } from '../../types/competition-entries';

interface CompetitionEntriesSectionProps {
  competitionId: string;
  // Issues de la participation de l'athlète courant, jamais d'un autre
  // athlete — null si aucune participation ou catégorie non renseignée.
  categorieAge: string | null;
  categoriePoids: string | null;
}

// Même normalisation que ExercisesPage (recherche insensible à la casse et
// aux accents) — dupliquée plutôt qu'extraite en util partagé : un seul
// autre usage existant dans le code, pas encore une abstraction justifiée.
const DIACRITICS_PATTERN = /[\u0300-\u036f]/g;

function normalizeSearchText(value: string): string {
  return value.trim().toLowerCase().normalize('NFD').replace(DIACRITICS_PATTERN, '');
}

// Recherche utile seulement à partir d'un volume réel (§19) — sous ce seuil,
// parcourir les quelques catégories affichées suffit largement.
const SEARCH_MIN_ENTRIES = 20;

function formatEntriesSummary(totalEntries: number, categoryCount: number): string {
  const entriesLabel = totalEntries === 1 ? 'inscrit' : 'inscrits';
  const categoriesLabel = categoryCount === 1 ? 'catégorie' : 'catégories';
  return `${totalEntries} ${entriesLabel} · ${categoryCount} ${categoriesLabel}`;
}

function formatEntryCount(count: number): string {
  return `${count} ${count === 1 ? 'inscrit' : 'inscrits'}`;
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
function CompetitionEntriesSection({ competitionId, categorieAge, categoriePoids }: CompetitionEntriesSectionProps) {
  const [data, setData] = useState<CompetitionEntriesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [expandedRawLabel, setExpandedRawLabel] = useState<string | null>(null);
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

  const otherCategories = useMemo(() => {
    if (!data) return [];
    if (!myCategory) return data.categories;
    return data.categories.filter((category) => category.rawLabel !== myCategory.rawLabel);
  }, [data, myCategory]);

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
      <SectionLabel>Inscrits</SectionLabel>

      {loading && <p className="mt-4 text-sm text-ekvara-muted">Chargement...</p>}

      {!loading && error && (
        <p className="mt-4 text-sm text-red-600">Impossible de charger les inscrits.</p>
      )}

      {!loading && !error && data && (
        <>
          <p className="mt-2 text-sm font-semibold text-ekvara-black/70">
            {formatEntriesSummary(data.totalEntries, data.categories.length)}
          </p>

          {data.totalEntries === 0 && (
            <p className="mt-4 text-sm text-ekvara-muted">Aucun inscrit publié pour le moment.</p>
          )}

          {data.totalEntries > 0 && (
            <>
              {myCategory && (
                <div className="mt-6">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-ekvara-lime" aria-hidden="true" />
                    <p className="text-xs font-semibold uppercase tracking-wide text-ekvara-black/40">
                      Ma catégorie
                    </p>
                  </div>
                  <h3 className="mt-1 font-display text-lg font-bold uppercase tracking-tight text-ekvara-black">
                    {myCategory.rawLabel}
                  </h3>
                  <p className="text-sm text-ekvara-muted">{formatEntryCount(myCategory.entries.length)}</p>

                  <div className="mt-3 divide-y divide-gray-100 border-t border-gray-100">
                    {myCategory.entries.map((entry, index) => (
                      <EntryRow key={entry.id} entry={entry} index={index} />
                    ))}
                  </div>
                </div>
              )}

              {otherCategories.length > 0 && (
                <div className="mt-8">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ekvara-black/40">
                    {myCategory ? 'Autres catégories' : 'Catégories'}
                  </p>

                  {data.totalEntries >= SEARCH_MIN_ENTRIES && (
                    <input
                      type="text"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Rechercher un inscrit..."
                      aria-label="Rechercher un inscrit"
                      className="mt-3 w-full max-w-md rounded-md border border-gray-300 px-4 py-2.5 text-sm"
                    />
                  )}

                  {searchResults ? (
                    <div className="mt-3 divide-y divide-gray-100 border-t border-gray-100">
                      {searchResults.length === 0 && (
                        <p className="py-4 text-sm text-ekvara-muted">Aucun inscrit trouvé.</p>
                      )}
                      {searchResults.map(({ entry, categoryLabel }, index) => (
                        <div key={entry.id}>
                          <EntryRow entry={entry} index={index} />
                          <p className="-mt-1 pb-2 pl-9 text-xs text-ekvara-muted">{categoryLabel}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-3 divide-y divide-gray-100 border-t border-gray-100">
                      {otherCategories.map((category) => (
                        <CategoryDisclosureRow
                          key={category.rawLabel}
                          category={category}
                          expanded={expandedRawLabel === category.rawLabel}
                          onToggle={() =>
                            setExpandedRawLabel((current) =>
                              current === category.rawLabel ? null : category.rawLabel,
                            )
                          }
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}

export default CompetitionEntriesSection;
