import { useEffect, useMemo, useState } from 'react';
import Header from '../components/layout/Header';
import ExerciseListItem from '../components/exercises/ExerciseListItem';
import ExerciseDetailModal from '../components/exercises/ExerciseDetailModal';
import Button from '../components/ui/Button';
import { getExercises } from '../services/exercises.api';
import type { Exercise } from '../types/exercise';
import { EXERCISE_NIVEAU_OPTIONS, EXERCISE_TYPE_OPTIONS } from '../utils/exerciseOptions';

const ALL_FILTER_VALUE = 'tous';

const DIACRITICS_PATTERN = /[\u0300-\u036f]/g;

function normalizeSearchText(value: string): string {
  return value.trim().toLowerCase().normalize('NFD').replace(DIACRITICS_PATTERN, '');
}

function ExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState(ALL_FILTER_VALUE);
  const [niveauFilter, setNiveauFilter] = useState(ALL_FILTER_VALUE);

  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    getExercises()
      .then((data) => {
        if (!cancelled) setExercises(data);
      })
      .catch((error: Error) => {
        if (!cancelled) {
          console.error('Erreur lors du chargement des exercices', error);
          setError(error.message);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Recherche + filtres uniquement côté frontend, sur les données déjà
  // chargées : aucun appel backend supplémentaire pendant la saisie.
  // Les accents sont retirés avant comparaison ("reaction" doit trouver
  // "réaction").
  const filteredExercises = useMemo(() => {
    const normalizedQuery = normalizeSearchText(query);

    return exercises.filter((exercise) => {
      if (typeFilter !== ALL_FILTER_VALUE && exercise.type_exercice !== typeFilter) return false;
      if (niveauFilter !== ALL_FILTER_VALUE && exercise.niveau !== niveauFilter) return false;

      if (!normalizedQuery) return true;
      return [exercise.titre, exercise.description, exercise.panel_technique].some((field) =>
        field ? normalizeSearchText(field).includes(normalizedQuery) : false,
      );
    });
  }, [exercises, query, typeFilter, niveauFilter]);

  const hasActiveFilters = query.trim() !== '' || typeFilter !== ALL_FILTER_VALUE || niveauFilter !== ALL_FILTER_VALUE;

  function resetFilters() {
    setQuery('');
    setTypeFilter(ALL_FILTER_VALUE);
    setNiveauFilter(ALL_FILTER_VALUE);
  }

  return (
    <div className="min-h-screen bg-ekvara-surface">
      <Header />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <section className="mb-8">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ekvara-black">
            Exercices
          </h1>
          <p className="mt-1 text-ekvara-muted">Découvre des exercices pour progresser dans ta préparation.</p>
        </section>

        <section className="mt-2 flex flex-col gap-4">
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher un exercice..."
            aria-label="Rechercher un exercice"
            className="w-full max-w-md rounded-md border border-gray-300 px-4 py-2.5 text-sm"
          />

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ekvara-muted">Type</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setTypeFilter(ALL_FILTER_VALUE)}
                aria-pressed={typeFilter === ALL_FILTER_VALUE}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  typeFilter === ALL_FILTER_VALUE
                    ? 'bg-ekvara-black text-ekvara-surface'
                    : 'border border-gray-300 bg-transparent text-ekvara-black/70 hover:bg-gray-100'
                }`}
              >
                Tous
              </button>
              {EXERCISE_TYPE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTypeFilter(option.value)}
                  aria-pressed={typeFilter === option.value}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    typeFilter === option.value
                      ? 'bg-ekvara-black text-ekvara-surface'
                      : 'border border-gray-300 bg-transparent text-ekvara-black/70 hover:bg-gray-100'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ekvara-muted">Niveau</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setNiveauFilter(ALL_FILTER_VALUE)}
                aria-pressed={niveauFilter === ALL_FILTER_VALUE}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  niveauFilter === ALL_FILTER_VALUE
                    ? 'bg-ekvara-black text-ekvara-surface'
                    : 'border border-gray-300 bg-transparent text-ekvara-black/70 hover:bg-gray-100'
                }`}
              >
                Tous
              </button>
              {EXERCISE_NIVEAU_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setNiveauFilter(option.value)}
                  aria-pressed={niveauFilter === option.value}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    niveauFilter === option.value
                      ? 'bg-ekvara-black text-ekvara-surface'
                      : 'border border-gray-300 bg-transparent text-ekvara-black/70 hover:bg-gray-100'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 border-t border-gray-200 pt-8">
          {loading && <p className="text-sm text-ekvara-muted">Chargement...</p>}

          {!loading && error && (
            <p className="text-sm text-red-600">Impossible de charger les exercices pour le moment.</p>
          )}

          {!loading && !error && exercises.length === 0 && (
            <p className="text-sm text-ekvara-muted">Aucun exercice disponible pour le moment.</p>
          )}

          {!loading && !error && exercises.length > 0 && filteredExercises.length === 0 && (
            <div className="flex flex-col items-start gap-3 py-16">
              <p className="text-sm text-ekvara-muted">Aucun exercice ne correspond à ta recherche.</p>
              {hasActiveFilters && (
                <Button variant="secondary" onClick={resetFilters}>
                  Réinitialiser les filtres
                </Button>
              )}
            </div>
          )}

          {!loading && !error && filteredExercises.length > 0 && (
            <>
              {/* Compteur dérivé du tableau déjà filtré (§6) : aucun état
                  métier supplémentaire, aucun appel réseau. */}
              <p className="text-xs font-semibold uppercase tracking-wide text-ekvara-muted">
                {filteredExercises.length} exercice{filteredExercises.length > 1 ? 's' : ''}
              </p>

              <div className="mt-4 grid grid-cols-1 gap-x-8 border-t border-gray-200 sm:grid-cols-2">
                {filteredExercises.map((exercise, index) => (
                  <ExerciseListItem
                    key={exercise.id}
                    exercise={exercise}
                    index={index}
                    onSelect={setSelectedExercise}
                  />
                ))}
              </div>
            </>
          )}
        </section>
      </main>

      {selectedExercise && (
        <ExerciseDetailModal exercise={selectedExercise} onClose={() => setSelectedExercise(null)} />
      )}
    </div>
  );
}

export default ExercisesPage;
