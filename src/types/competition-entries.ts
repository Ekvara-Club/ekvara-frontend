// Forme exacte de GET /competitions/:competitionId/entries — jamais de
// participant_id/athlete_id ici : ces entries ne sont jamais liées à un
// athlete EKVARA (voir CompetitionEntriesSection).
export interface CompetitionEntry {
  id: string;
  name: string;
  club: string | null;
  league: string | null;
  country: string | null;
}

export interface CompetitionEntryCategory {
  rawLabel: string;
  ageCategory: string | null;
  gender: 'male' | 'female' | null;
  weightCategory: string | null;
  entries: CompetitionEntry[];
}

export interface CompetitionEntriesResponse {
  competitionId: string;
  categories: CompetitionEntryCategory[];
  totalEntries: number;
}
