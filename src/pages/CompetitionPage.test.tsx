import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import CompetitionPage from './CompetitionPage';
import { competition, participation, preparation } from '../test/fixtures';

const api = vi.hoisted(() => ({
  COMPETITION_NOT_FOUND_MESSAGE: 'Compétition introuvable',
  getCompetitionById: vi.fn(),
  getCompetitions: vi.fn(),
  getCoachPreparations: vi.fn(),
  getCompetitionEntries: vi.fn(),
}));

vi.mock('../services/athletes.api', () => api);
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ athlete: { id: 'athlete-1' } }) }));
vi.mock('../components/layout/Header', () => ({ default: () => <header data-testid="header" /> }));
vi.mock('../components/competition/CompetitionEntriesSection', () => ({ default: () => null }));
vi.mock('../components/passport/CompetitionResultModal', () => ({ default: () => null }));

const DETAIL = {
  ...competition(),
  organisateur: 'FFTDA',
  sourceExternalId: null,
  saison: '2026-2027',
  sources: [],
};

describe('CompetitionPage — détail athlète', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 21));
    api.getCompetitionById.mockResolvedValue(DETAIL);
    api.getCompetitions.mockResolvedValue([]);
    api.getCoachPreparations.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('préparation coach sans participation : catégorie prévue, statut, "Prévue par mon coach", inscription non confirmée', async () => {
    api.getCoachPreparations.mockResolvedValue([preparation()]);

    render(<CompetitionPage competitionId="comp-champ" />);

    expect(await screen.findByText('Ma préparation')).toBeInTheDocument();
    expect(screen.getByText('Prévue par mon coach')).toBeInTheDocument();
    expect(screen.getByText('Prêt')).toBeInTheDocument();
    expect(screen.getByText('Senior')).toBeInTheDocument();
    expect(screen.getByText('-68kg')).toBeInTheDocument();
    expect(screen.getByText('Inscription officielle')).toBeInTheDocument();
    expect(screen.getByText('Non confirmée')).toBeInTheDocument();
    // Le faux message "pas ajoutée à ton planning" ne doit pas contredire la préparation.
    expect(screen.queryByText("Cette compétition n'est pas ajoutée à ton planning.")).not.toBeInTheDocument();
    expect(screen.queryByText('Ma participation')).not.toBeInTheDocument();
  });

  it('participation + préparation : les deux sections, jamais "Non confirmée"', async () => {
    api.getCompetitions.mockResolvedValue([participation()]);
    api.getCoachPreparations.mockResolvedValue([preparation()]);

    render(<CompetitionPage competitionId="comp-champ" />);

    expect(await screen.findByText('Ma préparation')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Ma participation')).toBeInTheDocument());
    expect(screen.getByText('Inscrit')).toBeInTheDocument();
    expect(screen.queryByText('Non confirmée')).not.toBeInTheDocument();
  });

  it('participation seule : comportement historique inchangé (pas de section préparation)', async () => {
    api.getCompetitions.mockResolvedValue([participation()]);

    render(<CompetitionPage competitionId="comp-champ" />);

    await waitFor(() => expect(screen.getByText('Ma participation')).toBeInTheDocument());
    expect(screen.queryByText('Ma préparation')).not.toBeInTheDocument();
  });

  it('ni participation ni préparation : "pas ajoutée à ton planning" comme avant', async () => {
    render(<CompetitionPage competitionId="comp-champ" />);

    expect(await screen.findByText("Cette compétition n'est pas ajoutée à ton planning.")).toBeInTheDocument();
    expect(screen.queryByText('Ma préparation')).not.toBeInTheDocument();
  });

  it("préparation d'une autre compétition : ignorée sur cette fiche", async () => {
    api.getCoachPreparations.mockResolvedValue([
      preparation({ competition: competition({ id: 'autre', nom: 'Autre' }) }),
    ]);

    render(<CompetitionPage competitionId="comp-champ" />);

    expect(await screen.findByText("Cette compétition n'est pas ajoutée à ton planning.")).toBeInTheDocument();
    expect(screen.queryByText('Ma préparation')).not.toBeInTheDocument();
  });

  it('forfait affiché avec son statut dans le détail', async () => {
    api.getCoachPreparations.mockResolvedValue([preparation({ status: 'forfait' })]);

    render(<CompetitionPage competitionId="comp-champ" />);

    expect(await screen.findByText('Forfait')).toBeInTheDocument();
  });

  it('aucune note coach rendue, même si la réponse réseau en contenait une par erreur', async () => {
    const leaky = { ...preparation(), note_coach: 'NOTE-SECRETE', coachNote: 'NOTE-SECRETE', objectif: 'OBJ-SECRET' };
    api.getCoachPreparations.mockResolvedValue([leaky]);

    const { container } = render(<CompetitionPage competitionId="comp-champ" />);
    await screen.findByText('Ma préparation');

    expect(container.textContent).not.toContain('NOTE-SECRETE');
    expect(container.textContent).not.toContain('OBJ-SECRET');
  });

  it('préparations indisponibles : la fiche reste utilisable', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    api.getCoachPreparations.mockRejectedValue(new Error('boom'));

    render(<CompetitionPage competitionId="comp-champ" />);

    expect(await screen.findByText('Championnat de France seniors')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText("Cette compétition n'est pas ajoutée à ton planning.")).toBeInTheDocument(),
    );
    consoleError.mockRestore();
  });
});
