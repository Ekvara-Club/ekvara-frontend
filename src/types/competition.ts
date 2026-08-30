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
export interface CompetitionSourceRef {
  source: string;
  sourceUrl: string | null;
}

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
  // Ticket "Compétitions Athlete V2" §20 : liste complète des sources
  // (nom + lien externe si connu) — source/sourceExternalId ci-dessus
  // restent la source primaire historique, jamais retirés.
  sources: CompetitionSourceRef[];
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

// GET /competitions?page=&limit=(&scope=&search=) (ticket "Compétitions
// Athlete V2" §8) : forme distincte du tableau brut ci-dessus retourné par
// getCompetitionCatalog() sans ces paramètres — jamais confondues.
export interface PaginatedCompetitions {
  items: CompetitionCatalogItem[];
  total: number;
  page: number;
  limit: number;
}

export type CompetitionCatalogScope = 'upcoming' | 'past';
