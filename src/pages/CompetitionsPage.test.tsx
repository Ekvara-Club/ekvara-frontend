import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CompetitionsPage from './CompetitionsPage';
import { participation, preparation } from '../test/fixtures';

const api = vi.hoisted(() => ({
  getCompetitions: vi.fn(),
  getCoachPreparations: vi.fn(),
  getCompetitionCatalogPaginated: vi.fn(),
}));
const nav = vi.hoisted(() => ({ navigateTo: vi.fn() }));

vi.mock('../services/athletes.api', () => api);
vi.mock('../utils/navigation', () => nav);
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ athlete: { id: 'athlete-1' } }) }));
vi.mock('../components/layout/Header', () => ({ default: () => <header data-testid="header" /> }));

function myCompetitions() {
  return within(screen.getByText('Mes compétitions').closest('section')!);
}

describe('CompetitionsPage — Mes compétitions', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 21));
    api.getCompetitions.mockResolvedValue([]);
    api.getCoachPreparations.mockResolvedValue([]);
    api.getCompetitionCatalogPaginated.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('une préparation coach apparaît dans "Mes compétitions" avec lieu, catégorie et mention coach', async () => {
    api.getCoachPreparations.mockResolvedValue([preparation()]);

    render(<CompetitionsPage />);

    await waitFor(() => expect(myCompetitions().getByText('Championnat de France seniors')).toBeInTheDocument());
    expect(myCompetitions().getByText('Eaubonne, France · Senior · -68kg · Prévue par ton coach')).toBeInTheDocument();
    expect(myCompetitions().queryByText('Tu n\'as aucune compétition prévue pour le moment.')).not.toBeInTheDocument();
  });

  it('naviguer vers le détail depuis la ligne préparée', async () => {
    api.getCoachPreparations.mockResolvedValue([preparation()]);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    render(<CompetitionsPage />);
    await user.click(await myCompetitions().findByText('Championnat de France seniors'));

    expect(nav.navigateTo).toHaveBeenCalledWith('/competitions/comp-champ');
  });

  it('participation + préparation sur la même compétition -> une seule ligne', async () => {
    api.getCompetitions.mockResolvedValue([participation()]);
    api.getCoachPreparations.mockResolvedValue([preparation()]);

    render(<CompetitionsPage />);

    await waitFor(() => expect(myCompetitions().getAllByText('Championnat de France seniors')).toHaveLength(1));
    // Catégories officielles, sans mention "prévue par ton coach" (c'est une inscription).
    expect(myCompetitions().getByText('Eaubonne, France · Cadet · -74 kg')).toBeInTheDocument();
  });

  it('préparation forfait -> absente de "Mes compétitions"', async () => {
    api.getCoachPreparations.mockResolvedValue([preparation({ status: 'forfait' })]);

    render(<CompetitionsPage />);

    await waitFor(() =>
      expect(myCompetitions().getByText('Tu n\'as aucune compétition prévue pour le moment.')).toBeInTheDocument(),
    );
  });

  it('les préparations indisponibles ne cassent pas la liste des participations', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    api.getCompetitions.mockResolvedValue([participation()]);
    api.getCoachPreparations.mockRejectedValue(new Error('boom'));

    render(<CompetitionsPage />);

    await waitFor(() => expect(myCompetitions().getByText('Championnat de France seniors')).toBeInTheDocument());
    expect(myCompetitions().queryByText(/Impossible de charger/)).not.toBeInTheDocument();
    consoleError.mockRestore();
  });

  it('la recherche et le catalogue existants sont préservés (recherche -> requête catalogue, Mes compétitions masqué)', async () => {
    api.getCoachPreparations.mockResolvedValue([preparation()]);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    render(<CompetitionsPage />);
    await myCompetitions().findByText('Championnat de France seniors');
    expect(api.getCompetitionCatalogPaginated).toHaveBeenCalledWith(
      expect.objectContaining({ scope: 'upcoming', page: 1, limit: 20 }),
    );

    await user.type(screen.getByLabelText(/Rechercher une compétition/), 'Paris');
    await waitFor(() =>
      expect(api.getCompetitionCatalogPaginated).toHaveBeenCalledWith(
        expect.objectContaining({ scope: 'upcoming', search: 'Paris' }),
      ),
      { timeout: 2000 },
    );
    expect(screen.queryByText('Mes compétitions')).not.toBeInTheDocument();
  });
});
