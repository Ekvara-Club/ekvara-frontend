import type {
  WtAthleteProfile,
  WtAthleteSearchItem,
  WtCompetitionHistoryItem,
  WtPaginated,
} from '../types/international';
import { apiFetch } from './apiClient';

// Exporté pour que l'appelant distingue ce message (sûr à afficher tel quel)
// de tout autre message d'erreur (réseau, 500...), qui doit rester générique.
export const WT_ATHLETE_NOT_FOUND_MESSAGE = 'Athlète introuvable.';

// Catalogue public World Taekwondo (JwtAuthGuard seul côté backend) : jamais
// scopé sur l'athlète connecté.
// sort 'fights' : combats recensés décroissants puis nom (liste de découverte
// déterministe) ; défaut backend : ordre alphabétique.
export async function searchWtAthletes(params: {
  search?: string;
  page: number;
  limit: number;
  sort?: 'name' | 'fights';
}): Promise<WtPaginated<WtAthleteSearchItem>> {
  const query = new URLSearchParams({ page: String(params.page), limit: String(params.limit) });
  if (params.search) query.set('search', params.search);
  if (params.sort) query.set('sort', params.sort);
  const response = await apiFetch(`/international-athletes?${query.toString()}`);

  if (!response.ok) {
    throw new Error(`Impossible de rechercher les athlètes (${response.status})`);
  }

  const data: WtPaginated<WtAthleteSearchItem> = await response.json();
  return data;
}

export async function getWtAthlete(athleteId: string): Promise<WtAthleteProfile> {
  const response = await apiFetch(`/international-athletes/${encodeURIComponent(athleteId)}`);

  // 400 = identifiant mal formé dans l'URL : même message qu'un 404 pour
  // l'utilisateur (le profil n'existe pas).
  if (response.status === 404 || response.status === 400) {
    throw new Error(WT_ATHLETE_NOT_FOUND_MESSAGE);
  }

  if (!response.ok) {
    throw new Error(`Impossible de récupérer l'athlète (${response.status})`);
  }

  const data: WtAthleteProfile = await response.json();
  return data;
}

// Historique paginé PAR COMPÉTITION (une compétition n'est jamais coupée
// entre deux pages) : les combats arrivent déjà groupés et ordonnés.
export async function getWtAthleteCompetitions(
  athleteId: string,
  params: { page: number; limit: number },
): Promise<WtPaginated<WtCompetitionHistoryItem>> {
  const query = new URLSearchParams({ page: String(params.page), limit: String(params.limit) });
  const response = await apiFetch(
    `/international-athletes/${encodeURIComponent(athleteId)}/competitions?${query.toString()}`,
  );

  if (!response.ok) {
    throw new Error(`Impossible de récupérer l'historique (${response.status})`);
  }

  const data: WtPaginated<WtCompetitionHistoryItem> = await response.json();
  return data;
}
