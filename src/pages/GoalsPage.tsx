import { useEffect, useState } from 'react';
import Header from '../components/layout/Header';
import PrimaryGoalPanel from '../components/goals/PrimaryGoalPanel';
import GoalSummaryCard from '../components/goals/GoalSummaryCard';
import SectionLabel from '../components/ui/SectionLabel';
import { useAuth } from '../contexts/AuthContext';
import { getGoals, updateGoalStatus } from '../services/athletes.api';
import type { Goal } from '../types/goal';

function GoalsPage() {
  // GoalsPage n'est rendue que lorsque l'utilisateur est authentifié (garde
  // dans App.tsx) : athlete est donc garanti non-null ici.
  const { athlete } = useAuth();
  const athleteId = athlete!.id;

  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [reactivatingId, setReactivatingId] = useState<string | null>(null);
  const [reactivateError, setReactivateError] = useState<string | null>(null);

  // Réutilisée à la fois par l'effet initial et par le rafraîchissement après
  // un toggle d'étape ou un changement de statut — un seul GET /goals, jamais
  // window.location.reload().
  function loadGoals(isCancelled: () => boolean) {
    setLoading(true);
    setError(null);

    getGoals(athleteId)
      .then((data) => {
        if (!isCancelled()) setGoals(data);
      })
      .catch((error: Error) => {
        if (!isCancelled()) {
          console.error('Erreur lors du chargement des objectifs', error);
          setError(error.message);
        }
      })
      .finally(() => {
        if (!isCancelled()) setLoading(false);
      });
  }

  useEffect(() => {
    let cancelled = false;
    loadGoals(() => cancelled);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [athleteId]);

  // Dérivé côté frontend à partir d'un seul GET /goals — jamais d'appel
  // supplémentaire par section.
  const principal = goals.find((g) => g.statut === 'en_cours') ?? null;
  const autresActifs = goals.filter((g) => g.statut === 'en_cours' && g.id !== principal?.id);
  const atteints = goals.filter((g) => g.statut === 'atteint');
  const abandonnes = goals.filter((g) => g.statut === 'abandonne');

  function handleReactivate(goalId: string) {
    setReactivateError(null);
    setReactivatingId(goalId);

    updateGoalStatus(athleteId, goalId, 'en_cours')
      .then(() => {
        loadGoals(() => false);
      })
      .catch((error: Error) => {
        console.error("Erreur lors de la réactivation de l'objectif", error);
        setReactivateError('Impossible de réactiver cet objectif pour le moment.');
      })
      .finally(() => {
        setReactivatingId(null);
      });
  }

  return (
    <div className="min-h-screen bg-ekvara-surface">
      <Header />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ekvara-black">
          Mes objectifs
        </h1>
        <p className="mt-1 text-ekvara-muted">Suis les étapes qui te rapprochent de tes objectifs.</p>

        {loading && <p className="mt-6 text-sm text-ekvara-muted">Chargement...</p>}

        {!loading && error && (
          <p className="mt-6 text-sm text-red-600">Impossible de charger les objectifs.</p>
        )}

        {!loading && !error && goals.length === 0 && (
          <p className="mt-6 text-sm text-ekvara-muted">Tu n'as pas encore d'objectif.</p>
        )}

        {!loading && !error && goals.length > 0 && (
          <div className="mt-8 flex flex-col gap-10">
            {principal && (
              <PrimaryGoalPanel
                athleteId={athleteId}
                goal={principal}
                onChanged={() => loadGoals(() => false)}
              />
            )}

            {autresActifs.length > 0 && (
              <section className="border-t border-gray-200 pt-8">
                <SectionLabel>Autres objectifs actifs</SectionLabel>
                <ul className="mt-4 divide-y divide-gray-200 border-t border-gray-200">
                  {autresActifs.map((g) => (
                    <GoalSummaryCard key={g.id} goal={g} />
                  ))}
                </ul>
              </section>
            )}

            {atteints.length > 0 && (
              <section className="border-t border-gray-200 pt-8">
                <SectionLabel>Objectifs atteints</SectionLabel>
                <ul className="mt-4 divide-y divide-gray-200 border-t border-gray-200">
                  {atteints.map((g) => (
                    <GoalSummaryCard
                      key={g.id}
                      goal={g}
                      badge={{ label: 'Atteint', className: 'bg-ekvara-lime text-ekvara-black' }}
                      onReactivate={() => handleReactivate(g.id)}
                      reactivating={reactivatingId === g.id}
                    />
                  ))}
                </ul>
                {reactivateError && <p className="mt-2 text-sm text-red-600">{reactivateError}</p>}
              </section>
            )}

            {abandonnes.length > 0 && (
              <section className="border-t border-gray-200 pt-8">
                <SectionLabel>Objectifs abandonnés</SectionLabel>
                <ul className="mt-4 divide-y divide-gray-200 border-t border-gray-200">
                  {abandonnes.map((g) => (
                    <GoalSummaryCard
                      key={g.id}
                      goal={g}
                      badge={{ label: 'Abandonné', className: 'bg-gray-200 text-ekvara-black/70' }}
                      onReactivate={() => handleReactivate(g.id)}
                      reactivating={reactivatingId === g.id}
                    />
                  ))}
                </ul>
                {reactivateError && <p className="mt-2 text-sm text-red-600">{reactivateError}</p>}
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default GoalsPage;
