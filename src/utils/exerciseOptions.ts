export interface FilterOption {
  value: string;
  label: string;
}

// Valeurs réelles côté backend (varchar libre, pas d'enum Prisma) — seuls les
// libellés sont une préoccupation frontend.
export const EXERCISE_TYPE_OPTIONS: FilterOption[] = [
  { value: 'technique', label: 'Technique' },
  { value: 'physique', label: 'Physique' },
  { value: 'mobilite', label: 'Mobilité' },
  { value: 'reaction', label: 'Réaction' },
  { value: 'force', label: 'Force' },
  { value: 'vitesse', label: 'Vitesse' },
];

export const EXERCISE_NIVEAU_OPTIONS: FilterOption[] = [
  { value: 'debutant', label: 'Débutant' },
  { value: 'intermediaire', label: 'Intermédiaire' },
  { value: 'avance', label: 'Avancé' },
  { value: 'elite', label: 'Elite' },
];

export function getExerciseTypeLabel(type: string | null): string | null {
  if (!type) return null;
  return EXERCISE_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type;
}

export function getExerciseNiveauLabel(niveau: string | null): string | null {
  if (!niveau) return null;
  return EXERCISE_NIVEAU_OPTIONS.find((option) => option.value === niveau)?.label ?? niveau;
}
