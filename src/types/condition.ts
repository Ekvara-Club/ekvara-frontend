// État de forme déclaré par l'athlète (PUT /athletes/:id/condition), visible
// par ses coachs. Valeurs backend non accentuées (convention varchar du
// projet) — seuls les libellés sont une préoccupation frontend.
export type AthleteConditionStatus = 'actif' | 'malade' | 'blesse' | 'absent';

export const ATHLETE_CONDITION_OPTIONS: { value: AthleteConditionStatus; label: string; hint: string }[] = [
  { value: 'actif', label: 'Actif', hint: "Je m'entraîne normalement" },
  { value: 'malade', label: 'Malade', hint: 'Grippe, fièvre…' },
  { value: 'blesse', label: 'Blessé', hint: 'Entorse, douleur…' },
  { value: 'absent', label: 'Absent', hint: 'Examens, voyage…' },
];

export function conditionLabel(status: string): string {
  return ATHLETE_CONDITION_OPTIONS.find((o) => o.value === status)?.label ?? status;
}

// Réponse du PUT (forme camelCase, expectedReturn = date métier YYYY-MM-DD).
export interface AthleteConditionView {
  status: AthleteConditionStatus;
  note: string | null;
  expectedReturn: string | null;
  updatedAt: string | null;
}

export interface UpdateAthleteConditionPayload {
  status: AthleteConditionStatus;
  note?: string;
  expectedReturn?: string;
}
