import { describe, expect, it } from 'vitest';
import { buildMyCompetitions, buildMyUpcomingCompetitions, formatPlannedCategory, formatPreparationStatus } from './coachPreparation';
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

describe('buildMyCompetitions — règle unique de "Mes compétitions" (#20)', () => {
  const RUNNING = competition({ id: 'running', nom: 'En cours', dateDebut: '2026-09-20', dateFin: '2026-09-22' });
  const ONE_DAY_TODAY = competition({ id: 'today', nom: "Aujourd'hui", dateDebut: '2026-09-21', dateFin: null });
  const ENDED_YESTERDAY = competition({ id: 'ended', nom: 'Finie hier', dateDebut: '2026-09-18', dateFin: '2026-09-20' });
  const OLDER = competition({ id: 'older', nom: 'Plus ancienne', dateDebut: '2025-05-01' });

  it('préparation coach seule (cas réel Kaïs) : visible dans "à venir", source coach_preparation, jamais une participation', () => {
    const { upcoming, past } = buildMyCompetitions([], [preparation({ competition: FUTURE, competitionId: FUTURE.id })], TODAY);
    expect(upcoming).toHaveLength(1);
    expect(upcoming[0]).toMatchObject({ source: 'coach_preparation', participation: null, categorieAge: 'Senior', categoriePoids: '-68kg' });
    expect(upcoming[0].competition.id).toBe(FUTURE.id);
    expect(past).toEqual([]);
  });

  it('participation + préparation sur la même compétition : UNE ligne, la participation (catégorie officielle d’abord)', () => {
    const { upcoming } = buildMyCompetitions(
      [participation({ competition: FUTURE })],
      [preparation({ competition: FUTURE, competitionId: FUTURE.id })],
      TODAY,
    );
    expect(upcoming).toHaveLength(1);
    expect(upcoming[0]).toMatchObject({ source: 'participation', categorieAge: 'Cadet', categoriePoids: '-74 kg' });
    expect(upcoming[0].participation?.id).toBe('part-1');
  });

  it('participation annulée : exclue ET masque la préparation de la même compétition ; préparation forfait exclue', () => {
    const { upcoming, past } = buildMyCompetitions(
      [participation({ statut: 'annule', competition: FUTURE })],
      [preparation({ competition: FUTURE, competitionId: FUTURE.id }), preparation({ competition: NEAR, competitionId: NEAR.id, status: 'forfait' })],
      TODAY,
    );
    expect(upcoming).toEqual([]);
    expect(past).toEqual([]);
  });

  it('fin effective : multi-jours en cours et un jour aujourd’hui ⇒ à venir ; finie hier ⇒ passée', () => {
    const { upcoming, past } = buildMyCompetitions(
      [
        participation({ id: 'r', competition: RUNNING }),
        participation({ id: 't', competition: ONE_DAY_TODAY }),
        participation({ id: 'e', competition: ENDED_YESTERDAY }),
      ],
      [],
      TODAY,
    );
    expect(upcoming.map((r) => r.competition.id)).toEqual(['running', 'today']);
    expect(past.map((r) => r.competition.id)).toEqual(['ended']);
  });

  it('ordres : à venir la plus proche d’abord ; passées la plus récente d’abord (préparations passées incluses)', () => {
    const { upcoming, past } = buildMyCompetitions(
      [participation({ id: 'f', competition: FUTURE }), participation({ id: 'o', competition: OLDER })],
      [preparation({ competition: NEAR, competitionId: NEAR.id }), preparation({ competition: PAST, competitionId: PAST.id })],
      TODAY,
    );
    expect(upcoming.map((r) => r.competition.id)).toEqual(['near', 'future']);
    expect(past.map((r) => r.competition.id)).toEqual(['past', 'older']);
    expect(past[0].source).toBe('coach_preparation');
  });

  it('buildMyUpcomingCompetitions = la partie "à venir" de la même règle', () => {
    const participations = [participation({ id: 'r', competition: RUNNING })];
    expect(buildMyUpcomingCompetitions(participations, [], TODAY)).toEqual(buildMyCompetitions(participations, [], TODAY).upcoming);
  });
});
