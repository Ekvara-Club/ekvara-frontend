import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import WtAthletePage from './WtAthletePage';
import type { WtAthleteFight, WtAthleteProfile, WtCompetitionHistoryItem } from '../types/international';

const api = vi.hoisted(() => ({
  WT_ATHLETE_NOT_FOUND_MESSAGE: 'Athlète introuvable.',
  getWtAthlete: vi.fn(),
  getWtAthleteCompetitions: vi.fn(),
}));

vi.mock('../services/international.api', () => api);
vi.mock('../components/layout/Header', () => ({ default: () => <header data-testid="header" /> }));

function profile(overrides: Partial<WtAthleteProfile> = {}): WtAthleteProfile {
  return {
    id: 'ath-1',
    displayName: 'Alice EXEMPLE',
    countryCode: 'FRA',
    imageUrl: null,
    sources: [{ source: 'world_taekwondo_results', externalId: 'uuid-1', sourceUrl: 'https://results.worldtaekwondo.org/profile/uuid-1' }],
    stats: {
      sourceRecord: null,
      recorded: { fights: 5, wins: 3, losses: 1, unknown: 1, competitions: 2, winRate: 75 },
    },
    ...overrides,
  };
}

function fight(overrides: Partial<WtAthleteFight> = {}): WtAthleteFight {
  return {
    id: 'm1',
    competitionId: 'comp-1',
    category: 'Women -49kg',
    stage: 'QF',
    contestNumber: 12,
    side: 'B',
    opponent: { id: 'ath-2', displayName: 'Bruna ADVERSAIRE', countryCode: 'KOR' },
    result: { outcome: 'WIN', athleteScore: 2, opponentScore: 1, method: 'PTF' },
    sources: [],
    ...overrides,
  };
}

function competitionItem(overrides: Partial<WtCompetitionHistoryItem> = {}): WtCompetitionHistoryItem {
  return {
    competition: {
      id: 'comp-1',
      name: 'European Senior Championships',
      dateDebut: '2026-05-11T00:00:00.000Z',
      dateFin: '2026-05-14T00:00:00.000Z',
      lieu: null,
      ville: 'Munich',
      pays: 'Germany',
    },
    categories: ['Women -49kg'],
    fights: 2,
    wins: 1,
    losses: 1,
    unknown: 0,
    matches: [
      fight(),
      fight({
        id: 'm2',
        stage: 'SF',
        opponent: { id: 'ath-3', displayName: 'Chloe TROISIEME', countryCode: null },
        result: { outcome: 'LOSS', athleteScore: 0, opponentScore: 2, method: 'RSC' },
      }),
    ],
    ...overrides,
  };
}

describe('WtAthletePage — profil public World Taekwondo', () => {
  beforeEach(() => {
    window.scrollTo = vi.fn();
    api.getWtAthlete.mockResolvedValue(profile());
    api.getWtAthleteCompetitions.mockResolvedValue({ items: [competitionItem()], total: 1, page: 1, limit: 10 });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('affiche identité, NOC, lien source et bilan recensé (combats, victoires, défaites, taux)', async () => {
    render(<WtAthletePage athleteId="ath-1" />);

    expect(await screen.findByRole('heading', { level: 1, name: 'Alice EXEMPLE' })).toBeInTheDocument();
    expect(screen.getByText('FRA')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voir sur WT Results ↗' })).toHaveAttribute(
      'href',
      'https://results.worldtaekwondo.org/profile/uuid-1',
    );
    expect(screen.getByText('Combats').previousSibling).toHaveTextContent('5');
    expect(screen.getByText('Victoires').previousSibling).toHaveTextContent('3');
    expect(screen.getByText('Défaites').previousSibling).toHaveTextContent('1');
    expect(screen.getByText('Taux de victoire').previousSibling).toHaveTextContent('75%');
    expect(screen.getByText(/1 au résultat inconnu, exclus du taux/)).toBeInTheDocument();
    expect(api.getWtAthlete).toHaveBeenCalledWith('ath-1');
    expect(api.getWtAthleteCompetitions).toHaveBeenCalledWith('ath-1', { page: 1, limit: 10 });
  });

  it('taux de victoire inconnu ⇒ "—" (jamais 0 % inventé) ; record source affiché séparément avec sa date', async () => {
    api.getWtAthlete.mockResolvedValue(
      profile({
        stats: {
          sourceRecord: { wins: 25, losses: 10, source: 'world_taekwondo_results', syncedAt: '2026-09-20T10:00:00.000Z' },
          recorded: { fights: 1, wins: 0, losses: 0, unknown: 1, competitions: 1, winRate: null },
        },
      }),
    );
    render(<WtAthletePage athleteId="ath-1" />);

    expect(await screen.findByText('Taux de victoire')).toBeInTheDocument();
    expect(screen.getByText('Taux de victoire').previousSibling).toHaveTextContent('—');
    expect(screen.getByText(/Bilan affiché par WT Results : 25 V – 10 D/)).toBeInTheDocument();
  });

  it('parcours : année, compétition liée à sa fiche existante, date · lieu, catégorie, résultats tels que fournis', async () => {
    render(<WtAthletePage athleteId="ath-1" />);

    expect(await screen.findByText('2026')).toBeInTheDocument();
    const competitionLink = screen.getByRole('link', { name: 'European Senior Championships' });
    expect(competitionLink).toHaveAttribute('href', '/competitions/comp-1');
    expect(screen.getByText('11–14 mai 2026 · Munich, Germany')).toBeInTheDocument();
    expect(screen.getByText('Women -49kg')).toBeInTheDocument();
    expect(screen.getByText('2 combats · 1 V · 1 D')).toBeInTheDocument();

    const rows = screen.getAllByRole('listitem');
    expect(within(rows[0]).getByText('Victoire')).toBeInTheDocument();
    expect(within(rows[0]).getByText('Quart de finale')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Demi-finale')).toBeInTheDocument();
    expect(within(rows[0]).getByText('2 — 1')).toBeInTheDocument();
    expect(within(rows[0]).getByText('PTF')).toBeInTheDocument();
    // Défaite avec score de l'athlète en premier, jamais réordonnée par le front.
    expect(within(rows[1]).getByText('Défaite')).toBeInTheDocument();
    expect(within(rows[1]).getByText('0 — 2')).toBeInTheDocument();
    expect(within(rows[1]).getByText('RSC')).toBeInTheDocument();
  });

  it("l'adversaire est un lien vers son propre profil WT (jamais un profil athlète EKVARA)", async () => {
    render(<WtAthletePage athleteId="ath-1" />);

    expect(await screen.findByRole('link', { name: 'Bruna ADVERSAIRE' })).toHaveAttribute('href', '/athletes-wt/ath-2');
    expect(screen.getByRole('link', { name: 'Chloe TROISIEME' })).toHaveAttribute('href', '/athletes-wt/ath-3');
  });

  it('résultat inconnu, tour et score absents : affichés comme inconnus, jamais inventés', async () => {
    api.getWtAthleteCompetitions.mockResolvedValue({
      items: [
        competitionItem({
          matches: [fight({ stage: null, result: { outcome: 'UNKNOWN', athleteScore: null, opponentScore: null, method: null } })],
        }),
      ],
      total: 1,
      page: 1,
      limit: 10,
    });
    render(<WtAthletePage athleteId="ath-1" />);

    const row = (await screen.findAllByRole('listitem'))[0];
    expect(within(row).getByText('Inconnu')).toBeInTheDocument();
    expect(within(row).getByText('Tour —')).toBeInTheDocument();
    expect(within(row).queryByText('Victoire')).not.toBeInTheDocument();
  });

  it('tours : libellés français pour les codes compris, code stocké affiché tel quel sinon (jamais inventé)', async () => {
    api.getWtAthleteCompetitions.mockResolvedValue({
      items: [
        competitionItem({
          matches: [
            fight({ id: 'a', stage: 'R32' }),
            fight({ id: 'b', stage: 'R16' }),
            fight({ id: 'c', stage: 'F' }),
            fight({ id: 'd', stage: 'BMC' }),
            fight({ id: 'e', stage: 'XYZ' }),
          ],
        }),
      ],
      total: 1,
      page: 1,
      limit: 10,
    });
    render(<WtAthletePage athleteId="ath-1" />);

    expect(await screen.findByText('1/16 de finale')).toBeInTheDocument();
    expect(screen.getByText('1/8 de finale')).toBeInTheDocument();
    expect(screen.getByText('Finale')).toBeInTheDocument();
    expect(screen.getByText('Combat pour le bronze')).toBeInTheDocument();
    expect(screen.getByText('XYZ')).toBeInTheDocument();
  });

  it('404 ⇒ "Athlète introuvable", sans section parcours', async () => {
    api.getWtAthlete.mockRejectedValue(new Error('Athlète introuvable.'));
    render(<WtAthletePage athleteId="inconnu" />);

    expect(await screen.findByRole('heading', { name: 'Athlète introuvable' })).toBeInTheDocument();
    expect(screen.queryByText('Parcours')).not.toBeInTheDocument();
  });

  it('athlète sans combat ⇒ état vide explicite', async () => {
    api.getWtAthleteCompetitions.mockResolvedValue({ items: [], total: 0, page: 1, limit: 10 });
    render(<WtAthletePage athleteId="ath-1" />);

    expect(await screen.findByText('Aucun combat recensé pour cet athlète.')).toBeInTheDocument();
  });

  it("erreur réseau de l'historique ⇒ message local, le profil reste affiché", async () => {
    api.getWtAthleteCompetitions.mockRejectedValue(new Error('Failed to fetch'));
    render(<WtAthletePage athleteId="ath-1" />);

    expect(await screen.findByText('Impossible de charger les combats. Réessaie dans un instant.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Alice EXEMPLE' })).toBeInTheDocument();
    expect(screen.queryByText('Failed to fetch')).not.toBeInTheDocument();
  });

  it('pagination par compétition : "Voir plus" charge la page suivante', async () => {
    api.getWtAthleteCompetitions
      .mockResolvedValueOnce({ items: [competitionItem()], total: 2, page: 1, limit: 10 })
      .mockResolvedValueOnce({
        items: [
          competitionItem({
            competition: { ...competitionItem().competition, id: 'comp-0', name: 'Belgian Open', dateDebut: '2025-03-15', dateFin: null },
          }),
        ],
        total: 2,
        page: 2,
        limit: 10,
      });
    render(<WtAthletePage athleteId="ath-1" />);

    (await screen.findByRole('button', { name: 'Voir plus (1 compétition)' })).click();

    expect(await screen.findByRole('link', { name: 'Belgian Open' })).toBeInTheDocument();
    expect(screen.getByText('2025')).toBeInTheDocument();
    expect(api.getWtAthleteCompetitions).toHaveBeenLastCalledWith('ath-1', { page: 2, limit: 10 });
  });

  it('chargement : états de chargement du profil et des combats', () => {
    api.getWtAthlete.mockReturnValue(new Promise(() => {}));
    api.getWtAthleteCompetitions.mockReturnValue(new Promise(() => {}));
    render(<WtAthletePage athleteId="ath-1" />);

    expect(screen.getByText('Chargement du profil...')).toBeInTheDocument();
    expect(screen.getByText('Chargement des combats...')).toBeInTheDocument();
  });
});
