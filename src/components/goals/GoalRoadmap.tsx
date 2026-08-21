import { useState } from 'react';
import { updateGoalStep } from '../../services/athletes.api';
import type { GoalStep } from '../../types/goal';

interface GoalRoadmapProps {
  athleteId: string;
  goalId: string;
  steps: GoalStep[];
  finalLabel: string;
  onChanged: () => void;
}

// Roadmap volontairement verticale sur desktop comme sur mobile : cohérent
// avec le langage visuel déjà en place dans le reste de l'app (PalmaresList,
// WeightHistoryList, étapes de GoalCard), plutôt que d'introduire un nouveau
// layout horizontal à maintenir séparément.
// Identité EKVARA : étape complétée = lime, étape à venir = neutre, objectif
// final = marqueur noir distinct (ni "fait" ni "à faire", la destination).
function GoalRoadmap({ athleteId, goalId, steps, finalLabel, onChanged }: GoalRoadmapProps) {
  const [togglingStepId, setTogglingStepId] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);

  function handleToggle(step: GoalStep) {
    setToggleError(null);
    setTogglingStepId(step.id);

    updateGoalStep(athleteId, goalId, step.id, !step.completed)
      .then(() => {
        onChanged();
      })
      .catch((error: Error) => {
        console.error("Erreur lors de la mise à jour de l'étape", error);
        setToggleError('Impossible de mettre à jour cette étape pour le moment.');
      })
      .finally(() => {
        setTogglingStepId(null);
      });
  }

  return (
    <div>
      <ul className="flex flex-col">
        {steps.map((step) => (
          <li key={step.id} className="relative pb-10 pl-9">
            <span className="absolute left-[11px] top-6 h-[calc(100%-1.5rem)] w-px bg-gray-200" aria-hidden="true" />
            <button
              type="button"
              onClick={() => handleToggle(step)}
              disabled={togglingStepId === step.id}
              aria-label={
                step.completed
                  ? `Marquer "${step.titre}" comme non terminée`
                  : `Marquer "${step.titre}" comme terminée`
              }
              className={`absolute left-0 top-0 flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-60 ${
                step.completed
                  ? 'border-ekvara-lime bg-ekvara-lime text-ekvara-black'
                  : 'border-gray-300 bg-white text-transparent hover:border-gray-400'
              }`}
            >
              ✓
            </button>
            <p className="text-sm font-semibold text-ekvara-black">{step.titre}</p>
            <p className="mt-0.5 text-xs uppercase tracking-wide text-ekvara-muted">
              {step.completed ? 'Terminé' : 'À venir'}
            </p>
          </li>
        ))}

        <li className="relative pl-9">
          <span className="absolute left-0 top-0 flex h-6 w-6 items-center justify-center rounded-full border-2 border-ekvara-black bg-ekvara-black text-xs font-bold text-ekvara-surface">
            ◎
          </span>
          <p className="font-display text-base font-bold text-ekvara-black">{finalLabel}</p>
          <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-ekvara-muted">Objectif final</p>
        </li>
      </ul>

      {toggleError && <p className="mt-2 text-sm text-red-600">{toggleError}</p>}
    </div>
  );
}

export default GoalRoadmap;
