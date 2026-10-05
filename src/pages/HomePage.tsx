import { useEffect, useState } from 'react';
import Header from '../components/layout/Header';
import CompetitionCard from '../components/dashboard/CompetitionCard';
import WeightCard from '../components/dashboard/WeightCard';
import GoalCard from '../components/dashboard/GoalCard';
import ProgressCard from '../components/dashboard/ProgressCard';
import NextTrainingCard from '../components/dashboard/NextTrainingCard';
import AddWeightLogModal from '../components/weight/AddWeightLogModal';
import AddTrainingModal from '../components/activity/AddTrainingModal';
import AddCompetitionModal from '../components/activity/AddCompetitionModal';
import { useAuth } from '../contexts/AuthContext';
import {
  getNextCompetition,
  getWeightSummary,
  getActiveGoal,
  getProgressHighlights,
  getNextTraining,
} from '../services/athletes.api';
import type { NextCompetitionResponse } from '../types/competition';
import type { WeightSummaryResponse } from '../types/weight';
import type { ActiveGoalResponse } from '../types/goal';
import type { ProgressHighlightsResponse } from '../types/progress';
import type { NextTrainingResponse } from '../types/training';

function HomePage() {
  // HomePage n'est rendue que lorsque l'utilisateur est authentifié (garde
  // dans App.tsx) : athlete est donc garanti non-null ici.
  const { athlete, user } = useAuth();
  const athleteId = athlete!.id;
  const athleteName = user?.prenom || 'Athlète';

  const [nextCompetition, setNextCompetition] = useState<NextCompetitionResponse | null>(null);
  const [competitionLoading, setCompetitionLoading] = useState(true);
  const [competitionError, setCompetitionError] = useState<string | null>(null);

  const [weightSummary, setWeightSummary] = useState<WeightSummaryResponse | null>(null);
  const [weightLoading, setWeightLoading] = useState(true);
  const [weightError, setWeightError] = useState<string | null>(null);

  const [activeGoal, setActiveGoal] = useState<ActiveGoalResponse | null>(null);
  const [goalLoading, setGoalLoading] = useState(true);
  const [goalError, setGoalError] = useState<string | null>(null);

  const [progress, setProgress] = useState<ProgressHighlightsResponse | null>(null);
  const [progressLoading, setProgressLoading] = useState(true);
  const [progressError, setProgressError] = useState<string | null>(null);

  // Ajout direct depuis une card vide (mêmes modales que /poids et
  // /activite). Après création, seule la card concernée se recharge (son
  // effet dépend de ce compteur) — jamais window.location.reload().
  const [addModal, setAddModal] = useState<'weight' | 'training' | 'competition' | null>(null);
  const [competitionVersion, setCompetitionVersion] = useState(0);
  const [weightVersion, setWeightVersion] = useState(0);
  const [trainingVersion, setTrainingVersion] = useState(0);

  const [nextTraining, setNextTraining] = useState<NextTrainingResponse | null>(null);
  const [trainingLoading, setTrainingLoading] = useState(true);
  const [trainingError, setTrainingError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setCompetitionLoading(true);
    setCompetitionError(null);

    getNextCompetition(athleteId)
      .then((competition) => {
        if (!cancelled) setNextCompetition(competition);
      })
      .catch((error: Error) => {
        if (!cancelled) {
          console.error('Erreur lors du chargement de la prochaine compétition', error);
          setCompetitionError(error.message);
        }
      })
      .finally(() => {
        if (!cancelled) setCompetitionLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [competitionVersion]);

  useEffect(() => {
    let cancelled = false;

    setWeightLoading(true);
    setWeightError(null);

    getWeightSummary(athleteId)
      .then((summary) => {
        if (!cancelled) setWeightSummary(summary);
      })
      .catch((error: Error) => {
        if (!cancelled) {
          console.error('Erreur lors du chargement du résumé de poids', error);
          setWeightError(error.message);
        }
      })
      .finally(() => {
        if (!cancelled) setWeightLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [weightVersion]);

  useEffect(() => {
    let cancelled = false;

    setGoalLoading(true);
    setGoalError(null);

    getActiveGoal(athleteId)
      .then((goal) => {
        if (!cancelled) setActiveGoal(goal);
      })
      .catch((error: Error) => {
        if (!cancelled) {
          console.error("Erreur lors du chargement de l'objectif actif", error);
          setGoalError(error.message);
        }
      })
      .finally(() => {
        if (!cancelled) setGoalLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    setProgressLoading(true);
    setProgressError(null);

    getProgressHighlights(athleteId)
      .then((highlights) => {
        if (!cancelled) setProgress(highlights);
      })
      .catch((error: Error) => {
        if (!cancelled) {
          console.error('Erreur lors du chargement de la progression', error);
          setProgressError(error.message);
        }
      })
      .finally(() => {
        if (!cancelled) setProgressLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    setTrainingLoading(true);
    setTrainingError(null);

    getNextTraining(athleteId)
      .then((training) => {
        if (!cancelled) setNextTraining(training);
      })
      .catch((error: Error) => {
        if (!cancelled) {
          console.error('Erreur lors du chargement du prochain entraînement', error);
          setTrainingError(error.message);
        }
      })
      .finally(() => {
        if (!cancelled) setTrainingLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [trainingVersion]);

  return (
    <div className="min-h-screen bg-ekvara-surface">
      <Header />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <section className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-ekvara-muted">
            Bon retour
          </p>
          <h1 className="mt-1 font-display text-4xl font-extrabold tracking-tight text-ekvara-black sm:text-5xl">
            Bonjour {athleteName}.
          </h1>
        </section>

        {/* Prochaine compétition (hero) / Prochain entraînement */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr]">
          <CompetitionCard
            competition={nextCompetition}
            loading={competitionLoading}
            error={competitionError}
            onAdd={() => setAddModal('competition')}
          />
          <NextTrainingCard
            training={nextTraining}
            loading={trainingLoading}
            error={trainingError}
            onAdd={() => setAddModal('training')}
          />
        </section>

        {/* Poids / Objectif / Progression : couche "performance personnelle" */}
        <section className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
          <WeightCard
            summary={weightSummary}
            loading={weightLoading}
            error={weightError}
            onAdd={() => setAddModal('weight')}
          />
          <GoalCard goal={activeGoal} loading={goalLoading} error={goalError} />
          <ProgressCard data={progress} loading={progressLoading} error={progressError} />
        </section>
      </main>

      {addModal === 'weight' && (
        <AddWeightLogModal
          athleteId={athleteId}
          onClose={() => setAddModal(null)}
          onSaved={() => {
            setAddModal(null);
            setWeightVersion((v) => v + 1);
          }}
        />
      )}
      {addModal === 'training' && (
        <AddTrainingModal
          athleteId={athleteId}
          onClose={() => setAddModal(null)}
          onCreated={() => {
            setAddModal(null);
            setTrainingVersion((v) => v + 1);
          }}
        />
      )}
      {addModal === 'competition' && (
        <AddCompetitionModal
          athleteId={athleteId}
          // L'accueil ne charge pas la liste des participations : le 409 du
          // backend reste le filet de sécurité contre un doublon (CLAUDE.md §16).
          existingCompetitionIds={[]}
          onClose={() => setAddModal(null)}
          onCreated={() => {
            setAddModal(null);
            setCompetitionVersion((v) => v + 1);
          }}
        />
      )}
    </div>
  );
}

export default HomePage;
