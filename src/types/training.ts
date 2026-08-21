export interface NextTrainingResponse {
  id: string;
  title: string;
  type: string | null;
  subType: string | null;
  startAt: string;
  endAt: string | null;
  location: string | null;
  level: string | null;
  description: string | null;
  status: string;
}

// GET /athletes/:athleteId/trainings renvoie exactement la même forme
// d'objet (un par séance) que GET .../trainings/next.
export type TrainingItem = NextTrainingResponse;

export interface CreateTrainingPayload {
  title: string;
  type?: string;
  subType?: string;
  startAt: string;
  endAt?: string;
  location?: string;
  level?: string;
  description?: string;
}
