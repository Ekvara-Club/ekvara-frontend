import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GoalsPage from './GoalsPage';
import type { Goal } from '../types/goal';

const api = vi.hoisted(() => ({
  getGoals: vi.fn(),
  updateGoalStatus: vi.fn(),
  updateGoalStep: vi.fn(),
}));

vi.mock('../services/athletes.api', () => api);
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ athlete: { id: 'athlete-1' } }) }));
vi.mock('../components/layout/Header', () => ({ default: () => <header data-testid="header" /> }));

function goal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'g-main',
    type: 'long_terme',
    titre: 'Podium au Championnat de France',
    description: null,
    dateCible: '2026-10-01',
    statut: 'en_cours',
    progress: { completed: 1, total: 2, percentage: 50 },
    steps: [
      { id: 's-1', titre: 'Valider la catégorie -68kg', ordre: 1, completed: true },
      { id: 's-2', titre: 'Deux compétitions de préparation', ordre: 2, completed: false },
    ],
    ...overrides,
  };
}

const MAIN = goal();
const OTHER = goal({ id: 'g-other', titre: 'Améliorer le temps de réaction', type: null, dateCible: null, progress: { completed: 0, total: 0, percentage: null }, steps: [] });
const REACHED = goal({ id: 'g-reached', titre: 'Ceinture noire 2e dan', statut: 'atteint', dateCible: '2026-01-10' });
const DROPPED = goal({ id: 'g-dropped', titre: 'Passer en -63kg', statut: 'abandonne', dateCible: null });

const section = (label: string) => screen.getByText(label).closest('section')!;
const principal = () => screen.getByText('Objectif principal').parentElement!;
const loaded = () => screen.findByRole('heading', { name: 'Podium au Championnat de France' });

describe('GoalsPage — objectif principal, sections, actions', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 21));
    api.getGoals.mockResolvedValue([MAIN, OTHER, REACHED, DROPPED]);
    api.updateGoalStatus.mockResolvedValue({});
    api.updateGoalStep.mockResolvedValue({});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('un seul GET : principal (J-10, progression, roadmap) puis autres actifs, atteints, abandonnés', async () => {
    render(<GoalsPage />);

    expect(await loaded()).toBeInTheDocument();
    expect(within(principal()).getByText('long terme')).toBeInTheDocument();
    expect(within(principal()).getByText('J-10')).toBeInTheDocument();
    expect(within(principal()).getByText('50%')).toBeInTheDocument();
    expect(within(principal()).getByText('1 / 2 étapes')).toBeInTheDocument();

    expect(within(section('Autres objectifs actifs')).getByText('Améliorer le temps de réaction')).toBeInTheDocument();
    expect(within(section('Autres objectifs actifs')).getByText('Aucune étape définie')).toBeInTheDocument();
    expect(within(section('Objectifs atteints')).getByText('Ceinture noire 2e dan')).toBeInTheDocument();
    expect(within(section('Objectifs atteints')).getByText('Atteint')).toBeInTheDocument();
    expect(within(section('Objectifs abandonnés')).getByText('Passer en -63kg')).toBeInTheDocument();
    expect(api.getGoals).toHaveBeenCalledTimes(1);
  });

  it('date cible passée : aucun compte à rebours (jamais "J--N")', async () => {
    render(<GoalsPage />);
    await loaded();

    const reached = within(section('Objectifs atteints'));
    expect(reached.getByText('10 janvier 2026')).toBeInTheDocument();
    expect(reached.queryByText(/^J-/)).not.toBeInTheDocument();
  });

  it('aucun objectif : message vide ; erreur : message propre sans détail technique', async () => {
    api.getGoals.mockResolvedValueOnce([]);
    const { unmount } = render(<GoalsPage />);
    expect(await screen.findByText("Tu n'as pas encore d'objectif.")).toBeInTheDocument();
    unmount();

    api.getGoals.mockRejectedValueOnce(new Error('Failed to fetch'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<GoalsPage />);
    expect(await screen.findByText('Impossible de charger les objectifs.')).toBeInTheDocument();
    expect(screen.queryByText('Failed to fetch')).not.toBeInTheDocument();
  });

  it('cocher une étape : PATCH de l\'étape inversée puis rechargement de la liste', async () => {
    render(<GoalsPage />);

    await userEvent.click(await screen.findByRole('button', { name: 'Marquer "Deux compétitions de préparation" comme terminée' }));

    expect(api.updateGoalStep).toHaveBeenCalledWith('athlete-1', 'g-main', 's-2', true);
    await vi.waitFor(() => expect(api.getGoals).toHaveBeenCalledTimes(2));
  });

  it('abandon : demande une confirmation avant tout appel', async () => {
    render(<GoalsPage />);

    await userEvent.click(await screen.findByRole('button', { name: "Actions sur l'objectif" }));
    await userEvent.click(screen.getByRole('button', { name: "Abandonner l'objectif" }));
    expect(screen.getByText("Confirmer l'abandon de cet objectif ?")).toBeInTheDocument();
    expect(api.updateGoalStatus).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Oui, abandonner' }));
    expect(api.updateGoalStatus).toHaveBeenCalledWith('athlete-1', 'g-main', 'abandonne');
    await vi.waitFor(() => expect(api.getGoals).toHaveBeenCalledTimes(2));
  });

  it('menu ⋯ : état annoncé (aria-expanded), Échap ferme et annule la confirmation en attente', async () => {
    render(<GoalsPage />);
    const trigger = await screen.findByRole('button', { name: "Actions sur l'objectif" });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(screen.getByRole('button', { name: "Abandonner l'objectif" }));
    await userEvent.keyboard('{Escape}');

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText("Confirmer l'abandon de cet objectif ?")).not.toBeInTheDocument();
    await userEvent.click(trigger);
    expect(screen.getByRole('button', { name: "Abandonner l'objectif" })).toBeInTheDocument();
    expect(api.updateGoalStatus).not.toHaveBeenCalled();
  });

  it('réactiver un objectif atteint : statut en_cours puis rechargement ; échec ⇒ message propre', async () => {
    render(<GoalsPage />);
    await loaded();

    await userEvent.click(within(section('Objectifs atteints')).getByRole('button', { name: 'Réactiver' }));
    expect(api.updateGoalStatus).toHaveBeenCalledWith('athlete-1', 'g-reached', 'en_cours');
    await vi.waitFor(() => expect(api.getGoals).toHaveBeenCalledTimes(2));

    api.updateGoalStatus.mockRejectedValueOnce(new Error('500'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await userEvent.click(await within(section('Objectifs abandonnés')).findByRole('button', { name: 'Réactiver' }));
    expect(await within(section('Objectifs abandonnés')).findByText('Impossible de réactiver cet objectif pour le moment.')).toBeInTheDocument();
  });
});
