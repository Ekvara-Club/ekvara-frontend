export interface GoalStep {
  id: string;
  titre: string;
  ordre: number;
  completed: boolean;
}

export interface GoalProgress {
  completed: number;
  total: number;
  percentage: number | null;
}

export type GoalStatus = 'en_cours' | 'atteint' | 'abandonne';

export interface ActiveGoalResponse {
  id: string;
  type: string | null;
  titre: string;
  description: string | null;
  dateCible: string | null;
  statut: GoalStatus;
  progress: GoalProgress;
  steps: GoalStep[];
}

// GET /athletes/:athleteId/goals renvoie une liste d'objets de cette même
// forme (un par objectif, actif ou non) — pas une deuxième représentation.
export type Goal = ActiveGoalResponse;

// Correspond exactement à UpdateGoalStatusDto côté backend.
export interface UpdateGoalStatusPayload {
  statut: GoalStatus;
}
