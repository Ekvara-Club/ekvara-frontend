import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CompetitionsPage from './CompetitionsPage';
import { participation, preparation } from '../test/fixtures';

const api = vi.hoisted(() => ({
  getCompetitions: vi.fn(),
  getCoachPreparations: vi.fn(),
  getCompetitionCatalogPaginated: vi.fn(),
  getCompetitionYears: vi.fn(),
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
    api.getCompetitionYears.mockResolvedValue([2026, 2025]);
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

function catalogItem(id: string, nom: string, date: string) {
  return { id, nom, date_debut: `${date}T00:00:00.000Z`, date_fin: null, ville: 'Paris', pays: 'France', niveau: 'international' };
}

describe('CompetitionsPage — filtres statut et année (#18)', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/competitions');
    api.getCompetitions.mockResolvedValue([]);
    api.getCoachPreparations.mockResolvedValue([]);
    api.getCompetitionYears.mockResolvedValue([2026, 2025]);
    api.getCompetitionCatalogPaginated.mockImplementation((params: { scope: string }) =>
      Promise.resolve({
        items: [params.scope === 'upcoming' ? catalogItem('u1', 'Open à venir', '2026-10-01') : catalogItem('p1', 'Open passé', '2025-03-01')],
        total: 1,
        page: 1,
        limit: 20,
      }),
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const lastCall = (scope: string) =>
    [...api.getCompetitionCatalogPaginated.mock.calls].reverse().find(([p]) => p.scope === scope)?.[0];

  it('par défaut : Toutes + Toutes les années, les deux sections et "Mes compétitions" (comportement existant préservé)', async () => {
    render(<CompetitionsPage />);

    expect(await screen.findByText('Open à venir')).toBeInTheDocument();
    expect(await screen.findByText('Open passé')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Toutes' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('combobox')).toHaveValue('');
    expect(screen.getByText('Mes compétitions')).toBeInTheDocument();
    expect(lastCall('upcoming')).toEqual({ page: 1, limit: 20, scope: 'upcoming', search: undefined, year: undefined });
    // Années venues du backend, jamais codées en dur.
    expect(await screen.findByRole('option', { name: '2026' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '2025' })).toBeInTheDocument();
  });

  it('"À venir" : seule la section à venir, requête scope=upcoming, URL ?status=upcoming', async () => {
    render(<CompetitionsPage />);
    await screen.findByText('Open passé');

    await userEvent.click(screen.getByRole('button', { name: 'À venir' }));

    expect(screen.queryByText('Open passé')).not.toBeInTheDocument();
    expect(screen.getByText('Open à venir')).toBeInTheDocument();
    expect(window.location.search).toBe('?status=upcoming');
    expect(screen.queryByText('Mes compétitions')).not.toBeInTheDocument();
  });

  it('"Passées" + année 2025 : filtres combinés dans la requête (page 1) et dans l’URL', async () => {
    render(<CompetitionsPage />);
    await screen.findByText('Open passé');

    await userEvent.click(screen.getByRole('button', { name: 'Passées' }));
    await userEvent.selectOptions(screen.getByRole('combobox'), '2025');

    await waitFor(() => expect(lastCall('past')).toEqual({ page: 1, limit: 20, scope: 'past', search: undefined, year: 2025 }));
    expect(screen.queryByText('Open à venir')).not.toBeInTheDocument();
    expect(new URLSearchParams(window.location.search).get('status')).toBe('past');
    expect(new URLSearchParams(window.location.search).get('year')).toBe('2025');
  });

  it('URL directe / rechargement : ?status=upcoming&year=2026 appliqués dès le chargement', async () => {
    window.history.replaceState({}, '', '/competitions?status=upcoming&year=2026');
    render(<CompetitionsPage />);

    expect(await screen.findByText('Open à venir')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'À venir' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('combobox')).toHaveValue('2026');
    expect(lastCall('upcoming')).toMatchObject({ scope: 'upcoming', year: 2026 });
    expect(api.getCompetitionCatalogPaginated).not.toHaveBeenCalledWith(expect.objectContaining({ scope: 'past' }));
  });

  it('valeurs invalides dans l’URL ⇒ défauts sûrs (aucune erreur, aucun filtre appliqué)', async () => {
    window.history.replaceState({}, '', '/competitions?status=bientot&year=abc');
    render(<CompetitionsPage />);

    expect(await screen.findByText('Open passé')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Toutes' })).toHaveAttribute('aria-pressed', 'true');
    expect(lastCall('past')).toMatchObject({ year: undefined });
  });

  it('précédent / suivant rejouent les filtres (popstate)', async () => {
    render(<CompetitionsPage />);
    await screen.findByText('Open passé');
    await userEvent.click(screen.getByRole('button', { name: 'Passées' }));
    expect(screen.queryByText('Open à venir')).not.toBeInTheDocument();

    window.history.replaceState({}, '', '/competitions');
    window.dispatchEvent(new PopStateEvent('popstate'));

    expect(await screen.findByText('Open à venir')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Toutes' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('changer d’année remet la pagination à la page 1', async () => {
    api.getCompetitionCatalogPaginated.mockImplementation((params: { scope: string; page: number }) =>
      Promise.resolve({ items: [catalogItem(`${params.scope}-${params.page}`, `${params.scope} p${params.page}`, '2026-10-01')], total: 3, page: params.page, limit: 20 }),
    );
    window.history.replaceState({}, '', '/competitions?status=upcoming');
    render(<CompetitionsPage />);

    await userEvent.click(await screen.findByRole('button', { name: /Voir plus/ }));
    expect(await screen.findByText('upcoming p2')).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByRole('combobox'), '2026');

    await waitFor(() => expect(lastCall('upcoming')).toMatchObject({ page: 1, year: 2026 }));
    await waitFor(() => expect(screen.queryByText('upcoming p2')).not.toBeInTheDocument());
  });

  it('liste vide filtrée : message qui reflète les filtres + retour à toutes les compétitions', async () => {
    api.getCompetitionCatalogPaginated.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 });
    window.history.replaceState({}, '', '/competitions?status=past&year=2025');
    render(<CompetitionsPage />);

    expect(await screen.findByText('Aucune compétition passée en 2025.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Voir toutes les compétitions →' }));

    expect(window.location.search).toBe('');
    expect(await screen.findByText('Aucune compétition à venir.')).toBeInTheDocument();
  });

  it('années indisponibles : le sélecteur garde "Toutes les années", l’explorateur reste utilisable', async () => {
    api.getCompetitionYears.mockRejectedValue(new Error('Failed to fetch'));
    render(<CompetitionsPage />);

    expect(await screen.findByText('Open passé')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Toutes les années' })).toBeInTheDocument();
  });
});
