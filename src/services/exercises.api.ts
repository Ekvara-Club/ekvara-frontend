import type { Exercise } from '../types/exercise';
import { notifyUnauthorized } from './session';

const API_URL = import.meta.env.VITE_API_URL;

// Même mécanisme que athletes.api.ts : `credentials: 'include'` systématique
// et signalement centralisé (session.ts) d'un 401, sans dupliquer cette
// logique de session.
async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(`${API_URL}${path}`, { ...init, credentials: 'include' });
  if (response.status === 401) {
    notifyUnauthorized();
  }
  return response;
}

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
