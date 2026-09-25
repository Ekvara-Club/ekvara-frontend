import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WtAthletesPage from './WtAthletesPage';

const api = vi.hoisted(() => ({ searchWtAthletes: vi.fn() }));

vi.mock('../services/international.api', () => api);
vi.mock('../components/layout/Header', () => ({ default: () => <header data-testid="header" /> }));

const RESULT = {
  items: [
    {
      id: 'ath-1',
      displayName: 'Kim TAEHUN',
      countryCode: 'KOR',
      sources: [{ source: 'world_taekwondo_results', externalId: 'uuid-1', sourceUrl: null }],
      fightCount: 12,
    },
    {
      id: 'ath-2',
      displayName: 'Kim SANS PAYS',
      countryCode: null,
      sources: [],
      fightCount: 1,
    },
  ],
  total: 2,
  page: 1,
  limit: 20,
};

describe('WtAthletesPage — recherche athlètes WT', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/athletes-wt');
    api.searchWtAthletes.mockResolvedValue(RESULT);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('sans recherche : aide 2 lettres + "Athlètes à découvrir" (tri déterministe backend sort=fights, 6 athlètes), aucune recherche lancée', async () => {
    render(<WtAthletesPage />);

    expect(screen.getByText('Au moins 2 lettres du nom pour lancer la recherche.')).toBeInTheDocument();
    expect(screen.getByText('Athlètes à découvrir')).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: /Kim TAEHUN/ })).toHaveAttribute('href', '/athletes-wt/ath-1');
    expect(api.searchWtAthletes).toHaveBeenCalledTimes(1);
    expect(api.searchWtAthletes).toHaveBeenCalledWith({ page: 1, limit: 6, sort: 'fights' });
    expect(screen.queryByText(/^Résultats/)).not.toBeInTheDocument();
  });

  it('découverte indisponible ⇒ message discret, la recherche reste utilisable', async () => {
    api.searchWtAthletes.mockRejectedValueOnce(new Error('Failed to fetch'));
    render(<WtAthletesPage />);

    expect(await screen.findByText('Suggestions indisponibles pour le moment.')).toBeInTheDocument();
    expect(screen.getByLabelText('Rechercher un athlète')).toBeEnabled();
  });

  it('recherche paginée côté backend ; chaque résultat = nom, NOC, combats, lien vers le profil WT ; ?q= dans l’URL', async () => {
    render(<WtAthletesPage />);
    await userEvent.type(screen.getByLabelText('Rechercher un athlète'), 'kim');

    expect(await screen.findByText('Résultats · 2')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Kim TAEHUN/ })).toHaveAttribute('href', '/athletes-wt/ath-1');
    expect(screen.getByText('KOR · 12 combats')).toBeInTheDocument();
    // Pays absent : jamais inventé (ligne mobile sans NOC, colonne desktop "—").
    expect(screen.getAllByText('1 combat').length).toBeGreaterThan(0);
    expect(screen.queryByText('Athlètes à découvrir')).not.toBeInTheDocument();
    expect(api.searchWtAthletes).toHaveBeenLastCalledWith({ search: 'kim', page: 1, limit: 20 });
    expect(window.location.search).toBe('?q=kim');
  });

  it('reprend la recherche présente dans l’URL (retour depuis un profil)', async () => {
    window.history.replaceState({}, '', '/athletes-wt?q=kim');
    render(<WtAthletesPage />);

    expect(await screen.findByRole('link', { name: /Kim TAEHUN/ })).toBeInTheDocument();
    expect(screen.getByLabelText('Rechercher un athlète')).toHaveValue('kim');
  });

  it('aucun résultat ⇒ message explicite', async () => {
    api.searchWtAthletes.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 });
    render(<WtAthletesPage />);
    await userEvent.type(screen.getByLabelText('Rechercher un athlète'), 'zzz');

    expect(await screen.findByText('Aucun athlète trouvé pour « zzz ».')).toBeInTheDocument();
  });

  it('erreur réseau ⇒ message utilisateur propre (jamais le message technique)', async () => {
    api.searchWtAthletes.mockRejectedValue(new Error('Failed to fetch'));
    render(<WtAthletesPage />);
    await userEvent.type(screen.getByLabelText('Rechercher un athlète'), 'kim');

    expect(await screen.findByText('Impossible de charger les athlètes. Réessaie dans un instant.')).toBeInTheDocument();
    expect(screen.queryByText('Failed to fetch')).not.toBeInTheDocument();
  });

  it('"Voir plus" charge la page suivante', async () => {
    api.searchWtAthletes
      // 1er appel = liste de découverte au montage (aucune recherche active)
      .mockResolvedValueOnce({ ...RESULT, items: [], total: 0 })
      .mockResolvedValueOnce({ ...RESULT, items: [RESULT.items[0]], total: 2 })
      .mockResolvedValueOnce({ ...RESULT, items: [RESULT.items[1]], total: 2, page: 2 });
    render(<WtAthletesPage />);
    await userEvent.type(screen.getByLabelText('Rechercher un athlète'), 'kim');

    await userEvent.click(await screen.findByRole('button', { name: 'Voir plus (1 restants)' }));

    expect(await screen.findByRole('link', { name: /Kim SANS PAYS/ })).toBeInTheDocument();
    expect(api.searchWtAthletes).toHaveBeenLastCalledWith({ search: 'kim', page: 2, limit: 20 });
  });
});
