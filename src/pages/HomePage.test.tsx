import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
// Modales d'ajout déjà testées sur /poids et /activite : sondes qui simulent
// un ajout réussi ou une fermeture.
function modalProbe(name: string, savedProp: 'onSaved' | 'onCreated') {
  return {
    default: (props: Record<string, () => void>) => (
      <div role="dialog" aria-label={name}>
        <button onClick={() => props[savedProp]()}>{`${name} : enregistrer`}</button>
        <button onClick={() => props.onClose()}>{`${name} : fermer`}</button>
      </div>
    ),
  };
}
vi.mock('../components/weight/AddWeightLogModal', () => modalProbe('pesée', 'onSaved'));
vi.mock('../components/activity/AddTrainingModal', () => modalProbe('entraînement', 'onCreated'));
vi.mock('../components/activity/AddCompetitionModal', () => modalProbe('compétition', 'onCreated'));

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

  it('cards vides : ajout direct (pesée, entraînement, compétition) ; seule la card concernée se recharge', async () => {
    render(<HomePage />);

    await userEvent.click(await screen.findByRole('button', { name: '+ Ajouter une pesée' }));
    await userEvent.click(screen.getByRole('button', { name: 'pesée : enregistrer' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await vi.waitFor(() => expect(api.getWeightSummary).toHaveBeenCalledTimes(2));

    await userEvent.click(await screen.findByRole('button', { name: '+ Ajouter un entraînement' }));
    await userEvent.click(screen.getByRole('button', { name: 'entraînement : enregistrer' }));
    await vi.waitFor(() => expect(api.getNextTraining).toHaveBeenCalledTimes(2));

    await userEvent.click(await screen.findByRole('button', { name: '+ Ajouter une compétition' }));
    await userEvent.click(screen.getByRole('button', { name: 'compétition : enregistrer' }));
    await vi.waitFor(() => expect(api.getNextCompetition).toHaveBeenCalledTimes(2));

    expect(api.getActiveGoal).toHaveBeenCalledTimes(1);
    expect(api.getProgressHighlights).toHaveBeenCalledTimes(1);
  });

  it('fermer sans ajouter : rien n\'est rechargé', async () => {
    render(<HomePage />);

    await userEvent.click(await screen.findByRole('button', { name: '+ Ajouter une pesée' }));
    await userEvent.click(screen.getByRole('button', { name: 'pesée : fermer' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(api.getWeightSummary).toHaveBeenCalledTimes(1);
  });

  it('cards remplies : pas de bouton d\'ajout ; objectif vide : jamais « Ajoute un objectif » (créé par le coach)', async () => {
    api.getWeightSummary.mockResolvedValue({ ...EMPTY_WEIGHT, currentWeight: 74.5, measuredAt: '2026-09-20T07:30:00.000Z' });
    render(<HomePage />);

    expect(await screen.findByText('74,5')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '+ Ajouter une pesée' })).not.toBeInTheDocument();
    expect(await screen.findByText(/Ton coach peut te fixer un objectif/)).toBeInTheDocument();
  });
});
