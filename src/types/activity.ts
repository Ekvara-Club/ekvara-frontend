import type { CompetitionSummary } from './competition';

// GET /athletes/:athleteId/competitions (liste complète, pas /next) : forme
// différente de NextCompetitionResponse — id au lieu de participationId, plus
// les champs de résultat (classement, medaille, victoires, defaites).
export interface ParticipationListItem {
  id: string;
  statut: string;
  categoriePoids: string | null;
  categorieAge: string | null;
  classement: number | null;
  medaille: string | null;
  victoires: number | null;
  defaites: number | null;
  pointsGagnes: number | null;
  competition: CompetitionSummary;
}

// Correspond exactement à CreateParticipationDto côté backend : les deux
// champs sont optionnels.
export interface CreateParticipationPayload {
  categoriePoids?: string;
  categorieAge?: string;
}

// Correspond exactement à UpdateParticipationResultDto côté backend : tous les
// champs sont optionnels, mais le backend refuse un body entièrement vide.
// medaille absente (undefined) -> ne touche pas à la médaille ; `null`
// explicite -> retire une médaille déjà enregistrée ; une des 3 valeurs ->
// l'enregistre. Ne jamais confondre `null` et `undefined` ici.
export interface UpdateParticipationResultPayload {
  classement?: number;
  medaille?: 'or' | 'argent' | 'bronze' | null;
  victoires?: number;
  defaites?: number;
}
