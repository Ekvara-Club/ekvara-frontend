export interface WeightTarget {
  weight: number;
  targetDate: string | null;
  competitionId: string | null;
}

export interface WeightSummaryResponse {
  currentWeight: number | null;
  measuredAt: string | null;
  target: WeightTarget | null;
  differenceToTarget: number | null;
  weeklyChange: number | null;
}

// GET /athletes/:athleteId/weights : une pesée telle que renvoyée par le
// backend (triées measuredAt DESC — le tri chronologique ASC pour le
// graphique/historique se fait côté frontend).
export interface WeightLog {
  id: string;
  weight: number;
  measuredAt: string;
  note: string | null;
}

// Correspond exactement à CreateWeightLogDto côté backend : seul weight est
// requis, measuredAt absent -> le backend utilise l'heure courante.
export interface CreateWeightLogPayload {
  weight: number;
  measuredAt?: string;
  note?: string;
}
