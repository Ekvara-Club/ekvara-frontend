import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProgressPage from './ProgressPage';
import type { MetricMeasurement, MetricOverviewEntry } from '../types/metrics-overview';

const api = vi.hoisted(() => ({
  getMetricsOverview: vi.fn(),
  getMetricMeasurements: vi.fn(),
}));

vi.mock('../services/athletes.api', () => api);
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ athlete: { id: 'athlete-1' } }) }));
vi.mock('../components/layout/Header', () => ({ default: () => <header data-testid="header" /> }));
// Recharts ne se dessine pas dans jsdom : sonde qui expose ce que la page lui transmet.
vi.mock('../components/progress/MetricHistoryChart', () => ({
  default: ({ measurements, positive }: { measurements: MetricMeasurement[]; positive: boolean }) => (
    <p data-testid="chart">
      {measurements.length} mesures · {positive ? 'positif' : 'neutre'}
    </p>
  ),
}));

function metric(overrides: Partial<MetricOverviewEntry> = {}): MetricOverviewEntry {
  return {
    id: 'm-endurance', code: 'endurance', name: 'Endurance', unit: null, direction: 'higher',
    currentValue: null, previousValue: null, delta: null, percentage: null, status: 'unknown', measuredAt: null,
    ...overrides,
  };
}

// Première de la liste SANS mesure : l'auto-sélection doit la sauter.
const ENDURANCE = metric();
const REACTION = metric({
  id: 'm-reaction', code: 'temps_reaction', name: 'Temps de réaction', unit: 'ms', direction: 'lower',
  currentValue: 380, previousValue: 420, delta: -40, percentage: 9.52, status: 'improved', measuredAt: '2026-09-01T10:00:00.000Z',
});
const SOUPLESSE = metric({
  id: 'm-souplesse', code: 'souplesse', name: 'Souplesse', unit: 'cm', direction: 'higher',
  currentValue: 30, previousValue: 32, delta: -2, percentage: -6.25, status: 'regressed', measuredAt: '2026-08-15T10:00:00.000Z',
});

const REACTION_MEASURES: MetricMeasurement[] = [
  { id: 'mm-2', value: 380, measuredAt: '2026-09-01T10:00:00.000Z', coachUserId: 'coach-1', comment: 'Test au club' },
  { id: 'mm-1', value: 420, measuredAt: '2026-06-01T10:00:00.000Z', coachUserId: null, comment: null },
];

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

describe('ProgressPage — capacités et historique', () => {
  beforeEach(() => {
    api.getMetricsOverview.mockResolvedValue({ metrics: [ENDURANCE, REACTION, SOUPLESSE] });
    api.getMetricMeasurements.mockResolvedValue(REACTION_MEASURES);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('auto-sélection de la première capacité mesurée ; "lower" en baisse = progression (jamais déduit du delta)', async () => {
    render(<ProgressPage />);

    // Attendre l'historique, pas le détail : le détail est brièvement rendu
    // avant que l'effet de chargement de l'historique ne démarre.
    expect(await screen.findByTestId('chart')).toHaveTextContent('2 mesures · positif');
    expect(api.getMetricMeasurements).toHaveBeenCalledWith('athlete-1', 'm-reaction');
    expect(screen.getByRole('button', { name: /Temps de réaction/ })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByText('Une valeur plus basse indique une progression.')).toBeInTheDocument();
    expect(screen.getByText('+9,52 % — En progression')).toBeInTheDocument();
    expect(screen.getByText('Précédente : 420 ms')).toBeInTheDocument();
    expect(screen.getByText('Test au club')).toBeInTheDocument();
    expect(screen.getAllByText('Mesure encadrée')).toHaveLength(1);
  });

  it('changer de capacité : nouvel historique ; une réponse tardive de l\'ancienne sélection est ignorée', async () => {
    const slow = deferred<MetricMeasurement[]>();
    api.getMetricMeasurements.mockReturnValueOnce(slow.promise).mockResolvedValueOnce([
      { id: 'ms-1', value: 30, measuredAt: '2026-08-15T10:00:00.000Z', coachUserId: null, comment: 'Grand écart' },
    ]);
    render(<ProgressPage />);

    await userEvent.click(await screen.findByRole('button', { name: /Souplesse/ }));
    expect(await screen.findByText('Grand écart')).toBeInTheDocument();
    expect(api.getMetricMeasurements).toHaveBeenLastCalledWith('athlete-1', 'm-souplesse');

    await act(async () => slow.resolve(REACTION_MEASURES));
    expect(screen.queryByText('Test au club')).not.toBeInTheDocument();
    expect(screen.getByTestId('chart')).toHaveTextContent('1 mesures · neutre');
    expect(screen.getByText('-6,25 % — En baisse')).toBeInTheDocument();
  });

  it('capacité sans mesure : état vide, pas de graphique', async () => {
    api.getMetricMeasurements.mockResolvedValue([]);
    render(<ProgressPage />);

    await userEvent.click(await screen.findByRole('button', { name: /Endurance/ }));

    expect(await screen.findByText('Aucune mesure enregistrée pour cette capacité.')).toBeInTheDocument();
    expect(screen.queryByTestId('chart')).not.toBeInTheDocument();
  });

  it('vue d\'ensemble en erreur : message propre, aucun historique demandé', async () => {
    api.getMetricsOverview.mockRejectedValue(new Error('Failed to fetch'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<ProgressPage />);

    expect(await screen.findByText('Impossible de charger la progression.')).toBeInTheDocument();
    expect(screen.queryByText('Failed to fetch')).not.toBeInTheDocument();
    expect(api.getMetricMeasurements).not.toHaveBeenCalled();
  });

  it('historique en erreur : la liste des capacités reste utilisable', async () => {
    api.getMetricMeasurements.mockRejectedValue(new Error('500'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<ProgressPage />);

    expect(await screen.findByText("Impossible de charger l'historique de cette capacité.")).toBeInTheDocument();
    const capacites = within(screen.getByText('Capacités').parentElement!);
    expect(capacites.getAllByRole('button')).toHaveLength(3);
  });
});
