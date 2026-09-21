import type { ParticipationListItem } from '../types/activity';
import type { CoachPreparationItem, CompetitionSummary, NextCompetitionResponse } from '../types/competition';

export function competition(overrides: Partial<CompetitionSummary> = {}): CompetitionSummary {
  return {
    id: 'comp-champ',
    nom: 'Championnat de France seniors',
    dateDebut: '2027-03-13T00:00:00.000Z',
    dateFin: null,
    lieu: 'Athletica',
    ville: 'Eaubonne',
    pays: 'France',
    niveau: 'national',
    source: 'fftda',
    ...overrides,
  };
}

export function preparation(overrides: Partial<CoachPreparationItem> = {}): CoachPreparationItem {
  const comp = overrides.competition ?? competition();
  return {
    competitionId: comp.id,
    source: 'coach_preparation',
    status: 'pret',
    categorieAgePrevue: 'Senior',
    categoriePoidsPrevue: '-68kg',
    competition: comp,
    ...overrides,
  };
}

export function participation(overrides: Partial<ParticipationListItem> = {}): ParticipationListItem {
  return {
    id: 'part-1',
    statut: 'inscrit',
    categoriePoids: '-74 kg',
    categorieAge: 'Cadet',
    classement: null,
    medaille: null,
    victoires: 0,
    defaites: 0,
    pointsGagnes: 0,
    competition: competition(),
    ...overrides,
  };
}

export function nextFromPreparation(overrides: Partial<NextCompetitionResponse> = {}): NextCompetitionResponse {
  return {
    source: 'coach_preparation',
    participationId: null,
    statut: null,
    categoriePoids: null,
    categorieAge: null,
    competition: competition(),
    preparation: { status: 'pret', categorieAgePrevue: 'Senior', categoriePoidsPrevue: '-68kg' },
    ...overrides,
  };
}

export function nextFromParticipation(overrides: Partial<NextCompetitionResponse> = {}): NextCompetitionResponse {
  return {
    source: 'participation',
    participationId: 'part-1',
    statut: 'inscrit',
    categoriePoids: '-74 kg',
    categorieAge: 'Cadet',
    competition: competition(),
    preparation: null,
    ...overrides,
  };
}
