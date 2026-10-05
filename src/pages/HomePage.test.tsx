import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import HomePage from './HomePage';

const api = vi.hoisted(() => ({
  getNextCompetition: vi.fn(),
  getWeightSummary: vi.fn(),
  getActiveGoal: vi.fn(),
  getProgressHighlights: vi.fn(),
  getNextTraining: vi.fn(),
}));
const auth = vi.hoisted(() => ({ prenom: 'Kaïs' as string | null }));

vi.mock('../services/athletes.api', () => api);
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ athlete: { id: 'athlete-1' }, user: { prenom: auth.prenom, nom: 'Dilmi' } }),
}));
vi.mock('../components/layout/Header', () => ({ default: () => <header data-testid="header" /> }));

const EMPTY_WEIGHT = { currentWeight: null, measuredAt: null, target: null, differenceToTarget: null, weeklyChange: null };

describe('HomePage — dashboard', () => {
  beforeEach(() => {
    auth.prenom = 'Kaïs';
    api.getNextCompetition.mockResolvedValue(null);
    api.getWeightSummary.mockResolvedValue(EMPTY_WEIGHT);
    api.getActiveGoal.mockResolvedValue(null);
    api.getProgressHighlights.mockResolvedValue({ improvedCount: 0, highlights: [] });
    api.getNextTraining.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('chaque card charge son domaine (une fois, pour l\'athlète courant) et affiche son état vide', async () => {
    render(<HomePage />);

    expect(screen.getByRole('heading', { name: 'Bonjour Kaïs.' })).toBeInTheDocument();
    expect(await screen.findByText('Aucune compétition à venir')).toBeInTheDocument();
    expect(await screen.findByText('Aucun entraînement à venir')).toBeInTheDocument();
    expect(await screen.findByText('Aucune pesée enregistrée')).toBeInTheDocument();
    expect(await screen.findByText('Aucun objectif en cours')).toBeInTheDocument();
    expect(await screen.findByText('Prochain bilan')).toBeInTheDocument();

    for (const fn of Object.values(api)) {
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith('athlete-1');
    }
  });

  it('prénom absent : salutation générique, jamais "undefined"', () => {
    auth.prenom = null;
    render(<HomePage />);

    expect(screen.getByRole('heading', { name: 'Bonjour Athlète.' })).toBeInTheDocument();
  });

  it('une card en erreur ne casse pas les autres (message propre, jamais l\'erreur technique)', async () => {
    api.getNextCompetition.mockRejectedValue(new Error('Failed to fetch'));
    api.getWeightSummary.mockRejectedValue(new Error('Internal server error'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<HomePage />);

    expect(await screen.findByText('Impossible de charger la prochaine compétition.')).toBeInTheDocument();
    expect(await screen.findByText('Impossible de charger les données de poids.')).toBeInTheDocument();
    expect(await screen.findByText('Aucun entraînement à venir')).toBeInTheDocument();
    expect(await screen.findByText('Aucun objectif en cours')).toBeInTheDocument();
    expect(await screen.findByText('Prochain bilan')).toBeInTheDocument();
    expect(screen.queryByText(/Failed to fetch|Internal server error/)).not.toBeInTheDocument();
  });
});
