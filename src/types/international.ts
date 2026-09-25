// Athlètes PUBLICS World Taekwondo (external_athlete côté backend) : identité
// externe, jamais un compte athlète EKVARA. Formes calquées sur les réponses
// réelles de /international-athletes (camelCase côté backend).

export interface WtSourceRef {
  source: string;
  externalId: string;
  sourceUrl: string | null;
}

export interface WtAthleteSummary {
  id: string;
  displayName: string;
  countryCode: string | null;
}

export interface WtAthleteSearchItem extends WtAthleteSummary {
  sources: WtSourceRef[];
  fightCount: number;
}

export interface WtPaginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

// Bilan calculé par le backend sur les combats RECENSÉS dans EKVARA (jeu
// partiel). winRate : pourcentage entier, null sans combat au résultat connu.
export interface WtRecordedStats {
  fights: number;
  wins: number;
  losses: number;
  unknown: number;
  competitions: number;
  winRate: number | null;
}

// Record V/D AFFICHÉ par la source (snapshot daté), distinct du bilan recensé.
export interface WtSourceRecord {
  wins: number;
  losses: number;
  source: string;
  syncedAt: string | null;
}

export interface WtAthleteProfile extends WtAthleteSummary {
  imageUrl: string | null;
  sources: WtSourceRef[];
  stats: {
    sourceRecord: WtSourceRecord | null;
    recorded: WtRecordedStats;
  };
}

// Résultat interprété UNE fois par le backend (vainqueur enregistré) : le
// frontend l'affiche tel quel, sans jamais le recalculer depuis les scores.
export type WtFightOutcome = 'WIN' | 'LOSS' | 'UNKNOWN';

export interface WtAthleteFight {
  id: string;
  competitionId: string;
  category: string | null;
  stage: string | null;
  contestNumber: number | null;
  side: 'A' | 'B';
  opponent: WtAthleteSummary;
  result: {
    outcome: WtFightOutcome;
    athleteScore: number | null;
    opponentScore: number | null;
    method: string | null;
  };
  sources: WtSourceRef[];
}

export interface WtCompetitionRef {
  id: string;
  name: string;
  dateDebut: string;
  dateFin: string | null;
  lieu: string | null;
  ville: string | null;
  pays: string | null;
}

export interface WtCompetitionHistoryItem {
  competition: WtCompetitionRef;
  categories: string[];
  fights: number;
  wins: number;
  losses: number;
  unknown: number;
  matches: WtAthleteFight[];
}
