export interface CompetitionSummary {
  id: string;
  nom: string;
  dateDebut: string;
  dateFin: string | null;
  lieu: string | null;
  ville: string | null;
  pays: string | null;
  niveau: string | null;
  source: string | null;
}

export interface NextCompetitionResponse {
  participationId: string;
  statut: string;
  categoriePoids: string | null;
  categorieAge: string | null;
  competition: CompetitionSummary;
}

// GET /competitions/:competitionId (fiche compétition) : vue mappée
// camelCase dédiée, distincte de CompetitionSummary (qui n'expose pas
// organisateur/sourceExternalId/saison, inutiles aux vues participation-scoped).
export interface CompetitionDetail {
  id: string;
  nom: string;
  organisateur: string | null;
  source: string | null;
  sourceExternalId: string | null;
  dateDebut: string;
  dateFin: string | null;
  lieu: string | null;
  ville: string | null;
  pays: string | null;
  niveau: string | null;
  saison: string | null;
}

// GET /competitions (catalogue global, pas scopé athlète) : réponse vérifiée
// réellement — ce sont les lignes Prisma brutes (snake_case), une forme
// différente de CompetitionSummary qui est une vue mappée camelCase.
export interface CompetitionCatalogItem {
  id: string;
  nom: string;
  organisateur: string | null;
  source: string | null;
  source_external_id: string | null;
  date_debut: string;
  date_fin: string | null;
  lieu: string | null;
  ville: string | null;
  pays: string | null;
  niveau: string | null;
  saison: string | null;
  created_at: string;
  updated_at: string;
}
