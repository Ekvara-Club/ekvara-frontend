import type {
  CompetitionCatalogItem,
  CompetitionCatalogScope,
  CoachPreparationItem,
  CompetitionDetail,
  NextCompetitionResponse,
  PaginatedCompetitions,
} from '../types/competition';
import type { CompetitionEntriesResponse } from '../types/competition-entries';
import type { CreateWeightLogPayload, WeightLog, WeightSummaryResponse } from '../types/weight';
import type { ActiveGoalResponse, Goal, GoalStatus, GoalStep } from '../types/goal';
import type { ProgressHighlightsResponse } from '../types/progress';
import type { CreateTrainingPayload, NextTrainingResponse, TrainingItem } from '../types/training';
import type {
  CreateParticipationPayload,
  ParticipationListItem,
  UpdateParticipationResultPayload,
} from '../types/activity';
import type { MetricMeasurement, MetricsOverviewResponse } from '../types/metrics-overview';
import { apiFetch } from './apiClient';

// Exporté pour que l'appelant distingue ce message (sûr à afficher tel quel)
// de tout autre message d'erreur (réseau, 500...), qui doit rester générique.
export const COMPETITION_NOT_FOUND_MESSAGE = 'Compétition introuvable.';

// Fiche compétition (/competitions/:id) : catalogue global, pas scopé
// athlète — distinct de getCompetitions(athleteId) qui renvoie les
// participations de l'athlète courant.
export async function getCompetitionById(competitionId: string): Promise<CompetitionDetail> {
  const response = await apiFetch(`/competitions/${competitionId}`);

  if (response.status === 404) {
    throw new Error(COMPETITION_NOT_FOUND_MESSAGE);
  }

  if (!response.ok) {
    throw new Error(`Impossible de récupérer la compétition (${response.status})`);
  }

  const data: CompetitionDetail = await response.json();
  return data;
}

// Inscrits externes (Martial Events pour l'instant) d'une compétition —
// jamais liés à un athlete EKVARA. Catalogue global comme getCompetitionById,
// pas scopé athlète.
export async function getCompetitionEntries(competitionId: string): Promise<CompetitionEntriesResponse> {
  const response = await apiFetch(`/competitions/${competitionId}/entries`);

  if (!response.ok) {
    throw new Error(`Impossible de récupérer les inscrits (${response.status})`);
  }

  const data: CompetitionEntriesResponse = await response.json();
  return data;
}

export async function getNextCompetition(
  athleteId: string,
): Promise<NextCompetitionResponse | null> {
  const response = await apiFetch(`/athletes/${athleteId}/competitions/next`);

  if (!response.ok) {
    throw new Error(`Impossible de récupérer la prochaine compétition (${response.status})`);
  }

  const data: NextCompetitionResponse | null = await response.json();
  return data;
}

export async function getWeightSummary(athleteId: string): Promise<WeightSummaryResponse> {
  const response = await apiFetch(`/athletes/${athleteId}/weight-summary`);

  if (!response.ok) {
    throw new Error(`Impossible de récupérer le résumé de poids (${response.status})`);
  }

  const data: WeightSummaryResponse = await response.json();
  return data;
}

export async function getWeightLogs(athleteId: string): Promise<WeightLog[]> {
  const response = await apiFetch(`/athletes/${athleteId}/weights`);

  if (!response.ok) {
    throw new Error(`Impossible de récupérer l'historique des pesées (${response.status})`);
  }

  const data: WeightLog[] = await response.json();
  return data;
}

export async function createWeightLog(
  athleteId: string,
  payload: CreateWeightLogPayload,
): Promise<WeightLog> {
  const response = await apiFetch(`/athletes/${athleteId}/weights`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Impossible d'enregistrer la pesée (${response.status})`);
  }

  const data: WeightLog = await response.json();
  return data;
}

export async function getActiveGoal(athleteId: string): Promise<ActiveGoalResponse | null> {
  const response = await apiFetch(`/athletes/${athleteId}/goals/active`);

  if (!response.ok) {
    throw new Error(`Impossible de récupérer l'objectif actif (${response.status})`);
  }

  const data: ActiveGoalResponse | null = await response.json();
  return data;
}

export async function getGoals(athleteId: string): Promise<Goal[]> {
  const response = await apiFetch(`/athletes/${athleteId}/goals`);

  if (!response.ok) {
    throw new Error(`Impossible de récupérer les objectifs (${response.status})`);
  }

  const data: Goal[] = await response.json();
  return data;
}

export async function updateGoalStatus(
  athleteId: string,
  goalId: string,
  statut: GoalStatus,
): Promise<Goal> {
  const response = await apiFetch(`/athletes/${athleteId}/goals/${goalId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ statut }),
  });

  if (!response.ok) {
    throw new Error(`Impossible de mettre à jour le statut de l'objectif (${response.status})`);
  }

  const data: Goal = await response.json();
  return data;
}

export async function updateGoalStep(
  athleteId: string,
  goalId: string,
  stepId: string,
  completed: boolean,
): Promise<GoalStep> {
  const response = await apiFetch(`/athletes/${athleteId}/goals/${goalId}/steps/${stepId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed }),
  });

  if (!response.ok) {
    throw new Error(`Impossible de mettre à jour l'étape (${response.status})`);
  }

  const data: GoalStep = await response.json();
  return data;
}

export async function getProgressHighlights(athleteId: string): Promise<ProgressHighlightsResponse> {
  const response = await apiFetch(`/athletes/${athleteId}/progress/highlights`);

  if (!response.ok) {
    throw new Error(`Impossible de récupérer la progression (${response.status})`);
  }

  const data: ProgressHighlightsResponse = await response.json();
  return data;
}

// Contrairement à getProgressHighlights (uniquement les améliorations),
// renvoie l'état de toutes les capacités connues, y compris celles sans
// aucune mesure pour cet athlète — utilisé par le Passeport sportif.
export async function getMetricsOverview(athleteId: string): Promise<MetricsOverviewResponse> {
  const response = await apiFetch(`/athletes/${athleteId}/metrics/overview`);

  if (!response.ok) {
    throw new Error(`Impossible de récupérer la progression (${response.status})`);
  }

  const data: MetricsOverviewResponse = await response.json();
  return data;
}

// Historique complet d'une seule capacité (utilisé par la page /progression) :
// distinct de l'overview, jamais utilisé pour la vue globale.
export async function getMetricMeasurements(
  athleteId: string,
  metricTypeId: string,
): Promise<MetricMeasurement[]> {
  const response = await apiFetch(`/athletes/${athleteId}/metrics/${metricTypeId}/measurements`);

  if (!response.ok) {
    throw new Error(`Impossible de récupérer l'historique de cette capacité (${response.status})`);
  }

  const data: MetricMeasurement[] = await response.json();
  return data;
}

export async function getNextTraining(athleteId: string): Promise<NextTrainingResponse | null> {
  const response = await apiFetch(`/athletes/${athleteId}/trainings/next`);

  if (!response.ok) {
    throw new Error(`Impossible de récupérer le prochain entraînement (${response.status})`);
  }

  const data: NextTrainingResponse | null = await response.json();
  return data;
}

export async function getTrainings(athleteId: string, from: Date, to: Date): Promise<TrainingItem[]> {
  const params = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });
  const response = await apiFetch(`/athletes/${athleteId}/trainings?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`Impossible de récupérer les entraînements (${response.status})`);
  }

  const data: TrainingItem[] = await response.json();
  return data;
}

export async function getCompetitions(athleteId: string): Promise<ParticipationListItem[]> {
  const response = await apiFetch(`/athletes/${athleteId}/competitions`);

  if (!response.ok) {
    throw new Error(`Impossible de récupérer les compétitions (${response.status})`);
  }

  const data: ParticipationListItem[] = await response.json();
  return data;
}

// Préparations coach visibles par l'athlète (vue Athlete-safe). Distinct de
// getCompetitions() qui reste PARTICIPATION-ONLY : palmarès, stats et
// activité ne doivent jamais recevoir une préparation comme une participation.
export async function getCoachPreparations(athleteId: string): Promise<CoachPreparationItem[]> {
  const response = await apiFetch(`/athletes/${athleteId}/competitions/preparations`);

  if (!response.ok) {
    throw new Error(`Impossible de récupérer les préparations (${response.status})`);
  }

  const data: CoachPreparationItem[] = await response.json();
  return data;
}

export async function createTraining(
  athleteId: string,
  payload: CreateTrainingPayload,
): Promise<TrainingItem> {
  const response = await apiFetch(`/athletes/${athleteId}/trainings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Impossible de créer l'entraînement (${response.status})`);
  }

  const data: TrainingItem = await response.json();
  return data;
}

export async function getCompetitionCatalog(): Promise<CompetitionCatalogItem[]> {
  const response = await apiFetch('/competitions');

  if (!response.ok) {
    throw new Error(`Impossible de récupérer le catalogue des compétitions (${response.status})`);
  }

  const data: CompetitionCatalogItem[] = await response.json();
  return data;
}

// Ticket "Compétitions Athlete V2" §6/§8 : recherche + pagination réelles
// pour l'explorateur — jamais appelé par AddCompetitionModal (qui continue
// d'utiliser getCompetitionCatalog() ci-dessus, comportement inchangé).
export async function getCompetitionCatalogPaginated(params: {
  page: number;
  limit: number;
  scope?: CompetitionCatalogScope;
  search?: string;
}): Promise<PaginatedCompetitions> {
  const query = new URLSearchParams({ page: String(params.page), limit: String(params.limit) });
  if (params.scope) query.set('scope', params.scope);
  if (params.search) query.set('search', params.search);

  const response = await apiFetch(`/competitions?${query.toString()}`);

  if (!response.ok) {
    throw new Error(`Impossible de récupérer le catalogue des compétitions (${response.status})`);
  }

  const data: PaginatedCompetitions = await response.json();
  return data;
}

// Exporté pour que l'appelant puisse distinguer ce message (sûr à afficher
// tel quel) de tout autre message d'erreur (réseau, 500...), qui doit rester
// générique côté UI.
export const PARTICIPATION_CONFLICT_MESSAGE = 'Cette compétition est déjà ajoutée.';

export async function participateInCompetition(
  athleteId: string,
  competitionId: string,
  payload: CreateParticipationPayload,
): Promise<ParticipationListItem> {
  const response = await apiFetch(`/athletes/${athleteId}/competitions/${competitionId}/participate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (response.status === 409) {
    throw new Error(PARTICIPATION_CONFLICT_MESSAGE);
  }

  if (!response.ok) {
    throw new Error(`Impossible de rejoindre cette compétition (${response.status})`);
  }

  const data: ParticipationListItem = await response.json();
  return data;
}

// Le backend renvoie un message propre (BadRequestException) pour les deux
// seuls cas de validation possibles à ce stade (compétition non terminée,
// body entièrement vide) : sûr à afficher tel quel, contrairement à toute
// autre erreur (réseau, 500...) qui reste un message générique.
export async function updateCompetitionResult(
  athleteId: string,
  competitionId: string,
  payload: UpdateParticipationResultPayload,
): Promise<ParticipationListItem> {
  const response = await apiFetch(`/athletes/${athleteId}/competitions/${competitionId}/result`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (response.status === 400) {
    const body: { message?: unknown } | null = await response.json().catch(() => null);
    const message = typeof body?.message === 'string' ? body.message : 'Résultat invalide.';
    throw new Error(message);
  }

  if (!response.ok) {
    throw new Error(`Impossible de mettre à jour le résultat (${response.status})`);
  }

  const data: ParticipationListItem = await response.json();
  return data;
}
