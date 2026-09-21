import type { Exercise } from '../types/exercise';
import { apiFetch } from './apiClient';

export async function getExercises(): Promise<Exercise[]> {
  const response = await apiFetch('/exercises');

  if (!response.ok) {
    throw new Error(`Impossible de récupérer les exercices (${response.status})`);
  }

  const data: Exercise[] = await response.json();
  return data;
}

export async function getExercise(id: string): Promise<Exercise> {
  const response = await apiFetch(`/exercises/${id}`);

  if (!response.ok) {
    throw new Error(`Impossible de récupérer l'exercice (${response.status})`);
  }

  const data: Exercise = await response.json();
  return data;
}
