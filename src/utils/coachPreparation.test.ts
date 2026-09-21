import { describe, expect, it } from 'vitest';
import { buildMyUpcomingCompetitions, formatPlannedCategory, formatPreparationStatus } from './coachPreparation';
import { competition, participation, preparation } from '../test/fixtures';

const TODAY = new Date(2026, 8, 21);
const FUTURE = competition({ id: 'future', nom: 'Future', dateDebut: '2027-03-13' });
const NEAR = competition({ id: 'near', nom: 'Near', dateDebut: '2026-11-01' });
const PAST = competition({ id: 'past', nom: 'Past', dateDebut: '2026-01-10' });

describe('formatPreparationStatus', () => {
  it('traduit les statuts internes connus, sans jamais écrire "Inscrit"', () => {
    expect(formatPreparationStatus('pret')).toBe('Prêt');
    expect(formatPreparationStatus('selectionne')).toBe('Sélectionnée');
    expect(formatPreparationStatus('envisage')).toBe('Envisagée');
    expect(formatPreparationStatus('forfait')).toBe('Forfait');
  });

  it('retombe sur une capitalisation pour un statut inconnu', () => {
    expect(formatPreparationStatus('autre')).toBe('Autre');
  });
});

describe('formatPlannedCategory', () => {
  it('joint âge et poids, sans séparateur orphelin', () => {
    expect(formatPlannedCategory('Senior', '-68kg')).toBe('Senior · -68kg');
    expect(formatPlannedCategory('Senior', null)).toBe('Senior');
    expect(formatPlannedCategory(null, '-68kg')).toBe('-68kg');
    expect(formatPlannedCategory(null, null)).toBeNull();
  });
});

describe('buildMyUpcomingCompetitions', () => {
  it('préparation seule -> une ligne coach_preparation avec catégories prévues', () => {
    const rows = buildMyUpcomingCompetitions([], [preparation({ competition: FUTURE, competitionId: 'future' })], TODAY);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      source: 'coach_preparation',
      categorieAge: 'Senior',
      categoriePoids: '-68kg',
      competition: { id: 'future' },
    });
  });

  it('participation seule -> une ligne participation', () => {
    const rows = buildMyUpcomingCompetitions([participation({ competition: FUTURE })], [], TODAY);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ source: 'participation', categorieAge: 'Cadet', categoriePoids: '-74 kg' });
  });

  it('participation + préparation sur la même compétition -> UNE ligne, catégories officielles prioritaires', () => {
    const rows = buildMyUpcomingCompetitions(
      [participation({ competition: FUTURE })],
      [preparation({ competition: FUTURE, competitionId: 'future' })],
      TODAY,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ source: 'participation', categorieAge: 'Cadet', categoriePoids: '-74 kg' });
  });

  it('participation sans catégorie officielle -> repli sur la catégorie prévue (affichage seulement)', () => {
    const rows = buildMyUpcomingCompetitions(
      [participation({ competition: FUTURE, categorieAge: null, categoriePoids: null })],
      [preparation({ competition: FUTURE, competitionId: 'future' })],
      TODAY,
    );

    expect(rows[0]).toMatchObject({ source: 'participation', categorieAge: 'Senior', categoriePoids: '-68kg' });
  });

  it('préparation forfait exclue', () => {
    const rows = buildMyUpcomingCompetitions(
      [],
      [preparation({ competition: FUTURE, competitionId: 'future', status: 'forfait' })],
      TODAY,
    );

    expect(rows).toEqual([]);
  });

  it('préparation d\'une compétition passée exclue', () => {
    const rows = buildMyUpcomingCompetitions([], [preparation({ competition: PAST, competitionId: 'past' })], TODAY);

    expect(rows).toEqual([]);
  });

  it('participation annulée/retirée exclue et masque la préparation de la même compétition', () => {
    const rows = buildMyUpcomingCompetitions(
      [participation({ competition: FUTURE, statut: 'retire' })],
      [preparation({ competition: FUTURE, competitionId: 'future' })],
      TODAY,
    );

    expect(rows).toEqual([]);
  });

  it('trie participations et préparations ensemble par date croissante', () => {
    const rows = buildMyUpcomingCompetitions(
      [participation({ id: 'p-far', competition: FUTURE })],
      [preparation({ competition: NEAR, competitionId: 'near' })],
      TODAY,
    );

    expect(rows.map((r) => r.competition.id)).toEqual(['near', 'future']);
  });

  it('compétition aujourd\'hui reste éligible', () => {
    const today = competition({ id: 'today', dateDebut: '2026-09-21' });
    const rows = buildMyUpcomingCompetitions([], [preparation({ competition: today, competitionId: 'today' })], TODAY);

    expect(rows).toHaveLength(1);
  });
});
