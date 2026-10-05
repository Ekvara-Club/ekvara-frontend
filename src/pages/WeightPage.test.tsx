import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WeightPage from './WeightPage';
import type { WeightLog, WeightSummaryResponse } from '../types/weight';

const api = vi.hoisted(() => ({
  getWeightSummary: vi.fn(),
  getWeightLogs: vi.fn(),
  createWeightLog: vi.fn(),
}));

vi.mock('../services/athletes.api', () => api);
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ athlete: { id: 'athlete-1' } }) }));
vi.mock('../components/layout/Header', () => ({ default: () => <header data-testid="header" /> }));
// Recharts ne se dessine pas dans jsdom : sonde qui expose ce que la page lui transmet.
vi.mock('../components/weight/WeightChart', () => ({
  default: ({ logs, target }: { logs: WeightLog[]; target: { weight: number } | null }) => (
    <p data-testid="chart">
      {logs.length} pesées · cible {target?.weight ?? 'aucune'}
    </p>
  ),
}));

function summary(overrides: Partial<WeightSummaryResponse> = {}): WeightSummaryResponse {
  return {
    currentWeight: 74.5,
    measuredAt: '2026-09-20T07:30:00.000Z',
    target: { weight: 72, targetDate: null, competitionId: null },
    differenceToTarget: 2.5,
    weeklyChange: -0.8,
    ...overrides,
  };
}

const LOGS: WeightLog[] = [
  { id: 'w-2', weight: 74.5, measuredAt: '2026-09-20T07:30:00.000Z', note: 'À jeun' },
  { id: 'w-1', weight: 75.3, measuredAt: '2026-09-12T07:30:00.000Z', note: null },
];

const synthese = () => screen.getByText('Synthèse').parentElement!;
const historique = () => screen.getByText('Historique').parentElement!;

describe('WeightPage — synthèse, historique, ajout de pesée', () => {
  beforeEach(() => {
    api.getWeightSummary.mockResolvedValue(summary());
    api.getWeightLogs.mockResolvedValue(LOGS);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('synthèse : poids actuel, objectif, écart et évolution hebdo ; graphique et historique avec variations', async () => {
    render(<WeightPage />);

    expect(await within(synthese()).findByText('74,5')).toBeInTheDocument();
    expect(within(synthese()).getByText('72 kg')).toBeInTheDocument();
    expect(within(synthese()).getByText('+2,5 kg')).toBeInTheDocument();
    expect(within(synthese()).getByText('Cette semaine')).toBeInTheDocument();
    expect(within(synthese()).getByText(/0,8 kg/)).toBeInTheDocument();

    expect(await screen.findByTestId('chart')).toHaveTextContent('2 pesées · cible 72');
    expect(within(historique()).getByText('À jeun')).toBeInTheDocument();
    // Variation calculée en ordre chronologique : 75,3 -> 74,5.
    expect(within(historique()).getByText(/0,8 kg/)).toBeInTheDocument();
  });

  it('weeklyChange null : "Cette semaine" absent (jamais 0 inventé) ; sans objectif : ni Objectif ni Écart', async () => {
    api.getWeightSummary.mockResolvedValue(summary({ weeklyChange: null, target: null, differenceToTarget: null }));
    render(<WeightPage />);

    expect(await within(synthese()).findByText('74,5')).toBeInTheDocument();
    expect(within(synthese()).queryByText('Cette semaine')).not.toBeInTheDocument();
    expect(within(synthese()).queryByText('Objectif')).not.toBeInTheDocument();
    expect(within(synthese()).queryByText('Écart')).not.toBeInTheDocument();
  });

  it('weeklyChange = 0 est une vraie valeur : affichée "0 kg"', async () => {
    api.getWeightSummary.mockResolvedValue(summary({ weeklyChange: 0 }));
    render(<WeightPage />);

    expect(await within(synthese()).findByText('Cette semaine')).toBeInTheDocument();
    expect(within(synthese()).getByText('0 kg')).toBeInTheDocument();
  });

  it('résumé en erreur : l\'historique et le graphique restent affichés', async () => {
    api.getWeightSummary.mockRejectedValue(new Error('Failed to fetch'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<WeightPage />);

    expect(await screen.findByText('Impossible de charger le résumé de poids pour le moment.')).toBeInTheDocument();
    expect(screen.queryByText('Failed to fetch')).not.toBeInTheDocument();
    expect(await screen.findByTestId('chart')).toBeInTheDocument();
    expect(within(historique()).getByText('À jeun')).toBeInTheDocument();
  });

  it('historique en erreur : la synthèse reste affichée', async () => {
    api.getWeightLogs.mockRejectedValue(new Error('500'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<WeightPage />);

    expect(await within(synthese()).findByText('74,5')).toBeInTheDocument();
    expect(await within(historique()).findByText("Impossible de charger l'historique des pesées.")).toBeInTheDocument();
    expect(screen.queryByTestId('chart')).not.toBeInTheDocument();
  });

  it('aucune pesée : états vides, pas de graphique', async () => {
    api.getWeightSummary.mockResolvedValue(summary({ currentWeight: null, measuredAt: null, weeklyChange: null, target: null, differenceToTarget: null }));
    api.getWeightLogs.mockResolvedValue([]);
    render(<WeightPage />);

    expect(await screen.findByText('Ajoute une première pesée pour commencer ton suivi.')).toBeInTheDocument();
    expect(within(historique()).getByText('Aucune pesée enregistrée.')).toBeInTheDocument();
    expect(screen.queryByTestId('chart')).not.toBeInTheDocument();
  });

  it('ajouter une pesée : POST minimal, modale fermée, synthèse et historique rechargés (sans reload)', async () => {
    const created: WeightLog = { id: 'w-3', weight: 73.9, measuredAt: '2026-09-21T07:00:00.000Z', note: null };
    api.createWeightLog.mockResolvedValue(created);
    render(<WeightPage />);
    await within(synthese()).findByText('74,5');

    api.getWeightSummary.mockResolvedValue(summary({ currentWeight: 73.9 }));
    api.getWeightLogs.mockResolvedValue([created, ...LOGS]);

    await userEvent.click(screen.getAllByRole('button', { name: '+ Ajouter une pesée' })[0]);
    const dialog = screen.getByRole('dialog', { name: 'Ajouter une pesée' });
    await userEvent.type(within(dialog).getByLabelText('Poids (kg) *'), '73.9');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Ajouter' }));

    // Date/heure/note vides : rien d'autre n'est envoyé (le backend prend l'heure courante).
    expect(api.createWeightLog).toHaveBeenCalledWith('athlete-1', { weight: 73.9 });
    expect(await within(synthese()).findByText('73,9')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(api.getWeightSummary).toHaveBeenCalledTimes(2);
    expect(api.getWeightLogs).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('chart')).toHaveTextContent('3 pesées');
  });

  // min=0.01 sur l'input bloque déjà la soumission native ; on soumet le
  // formulaire directement pour vérifier le garde-fou JS qui la double.
  it('poids invalide : message de validation, aucun appel API', async () => {
    render(<WeightPage />);
    await within(synthese()).findByText('74,5');

    await userEvent.click(screen.getAllByRole('button', { name: '+ Ajouter une pesée' })[0]);
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Poids (kg) *'), '0');
    fireEvent.submit(within(dialog).getByRole('button', { name: 'Ajouter' }).closest('form')!);

    expect(within(dialog).getByText('Le poids doit être un nombre positif.')).toBeInTheDocument();
    expect(api.createWeightLog).not.toHaveBeenCalled();
  });
});
