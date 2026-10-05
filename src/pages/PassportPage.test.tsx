import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PassportPage from './PassportPage';
import { competition, participation } from '../test/fixtures';
import type { MetricOverviewEntry } from '../types/metrics-overview';

const api = vi.hoisted(() => ({
  getCompetitions: vi.fn(),
  getMetricsOverview: vi.fn(),
  updateCompetitionResult: vi.fn(),
}));

vi.mock('../services/athletes.api', () => api);
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    athlete: { id: 'athlete-1', club: null, grade: null, categorie_age: null, niveau_sportif: null, genre: null },
    user: { prenom: 'Kaïs', nom: 'Dilmi' },
  }),
}));
vi.mock('../components/layout/Header', () => ({ default: () => <header data-testid="header" /> }));

// Aujourd'hui = 21 septembre 2026 (dates "date-only" comparées en local).
const BELGIAN_OPEN = competition({ id: 'comp-belgian', nom: 'Belgian Open', dateDebut: '2026-03-14', ville: 'Lommel', pays: 'Belgique' });
const DUTCH_OPEN = competition({ id: 'comp-dutch', nom: 'Dutch Open', dateDebut: '2026-05-09', ville: 'Eindhoven', pays: 'Pays-Bas' });
const FUTURE = competition({ id: 'comp-future', nom: 'Championnat de France seniors', dateDebut: '2027-03-13' });

function metric(overrides: Partial<MetricOverviewEntry> = {}): MetricOverviewEntry {
  return {
    id: 'm-1', code: 'temps_reaction', name: 'Temps de réaction', unit: 'ms', direction: 'lower',
    currentValue: 380, previousValue: 420, delta: -40, percentage: 9.52, status: 'improved', measuredAt: '2026-09-01T10:00:00.000Z',
    ...overrides,
  };
}

// Valeur affichée au-dessus d'un label de StatValue (ex. "Victoires" -> "03").
function stat(label: string): string | null | undefined {
  return within(record()).getByText(label).previousElementSibling?.textContent;
}
const record = () => screen.getByText('Record').parentElement!;
const palmares = () => screen.getByText('Palmarès').parentElement!;

describe('PassportPage — statistiques carrière, palmarès, saisie résultat', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 21));
    api.getCompetitions.mockResolvedValue([]);
    api.getMetricsOverview.mockResolvedValue({ metrics: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('stats calculées uniquement sur les compétitions passées avec un signal de résultat ; futures exclues du palmarès', async () => {
    api.getCompetitions.mockResolvedValue([
      participation({ id: 'p-belgian', competition: BELGIAN_OPEN, classement: 3, medaille: 'bronze', victoires: 3, defaites: 1 }),
      // Passée mais sans aucun signal (victoires/défaites à 0) : jamais "disputée".
      participation({ id: 'p-dutch', competition: DUTCH_OPEN, victoires: 0, defaites: 0 }),
      // Future avec des chiffres : jamais comptée.
      participation({ id: 'p-future', competition: FUTURE, victoires: 5 }),
    ]);
    render(<PassportPage />);

    expect(await within(palmares()).findByText('Belgian Open')).toBeInTheDocument();
    expect(stat('Compétition disputée')).toBe('01');
    expect(stat('Victoires')).toBe('03');
    expect(stat('Défaite')).toBe('01');
    expect(stat('Podium')).toBe('01');

    expect(within(palmares()).getByText('3E')).toBeInTheDocument();
    expect(within(palmares()).getByText('Bronze')).toBeInTheDocument();
    expect(within(palmares()).getByText('Dutch Open')).toBeInTheDocument();
    expect(within(palmares()).getByText('Résultat non renseigné')).toBeInTheDocument();
    expect(within(palmares()).queryByText('Championnat de France seniors')).not.toBeInTheDocument();
  });

  it('progression en erreur : profil, stats et palmarès restent utilisables', async () => {
    api.getCompetitions.mockResolvedValue([participation({ competition: BELGIAN_OPEN, classement: 1 })]);
    api.getMetricsOverview.mockRejectedValue(new Error('Failed to fetch'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<PassportPage />);

    expect(await screen.findByText('Impossible de charger la progression pour le moment.')).toBeInTheDocument();
    expect(screen.queryByText('Failed to fetch')).not.toBeInTheDocument();
    expect(screen.getByText('Kaïs Dilmi')).toBeInTheDocument();
    expect(await within(palmares()).findByText('1ER')).toBeInTheDocument();
  });

  it('compétitions en erreur : la progression s\'affiche quand même (amélioration jamais déduite du signe du delta)', async () => {
    api.getCompetitions.mockRejectedValue(new Error('500'));
    api.getMetricsOverview.mockResolvedValue({ metrics: [metric()] });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<PassportPage />);

    expect(await screen.findByText('Impossible de charger les statistiques pour le moment.')).toBeInTheDocument();
    expect(screen.getByText('Impossible de charger le palmarès pour le moment.')).toBeInTheDocument();
    expect(screen.getByText('Temps de réaction')).toBeInTheDocument();
    expect(screen.getByText(/En progression/)).toBeInTheDocument();
  });

  it('renseigner un résultat : PATCH avec victoires/défaites à 0 conservés, puis stats et palmarès recalculés sans reload', async () => {
    const before = participation({ competition: DUTCH_OPEN, victoires: 0, defaites: 0 });
    const after = { ...before, classement: 1, medaille: 'or' };
    api.getCompetitions.mockResolvedValueOnce([before]).mockResolvedValueOnce([after]);
    api.updateCompetitionResult.mockResolvedValue(after);
    render(<PassportPage />);

    await userEvent.click(await within(palmares()).findByRole('button', { name: /Renseigner le résultat/ }));
    const dialog = screen.getByRole('dialog', { name: 'Renseigner le résultat' });
    await userEvent.type(within(dialog).getByLabelText('Classement'), '1');
    await userEvent.selectOptions(within(dialog).getByLabelText('Médaille'), 'or');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Enregistrer' }));

    expect(api.updateCompetitionResult).toHaveBeenCalledWith('athlete-1', 'comp-dutch', {
      classement: 1,
      medaille: 'or',
      victoires: 0,
      defaites: 0,
    });
    expect(await within(palmares()).findByText('1ER')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(api.getCompetitions).toHaveBeenCalledTimes(2);
    expect(stat('Podium')).toBe('01');
  });

  it('choisir "Aucune" sur une médaille existante envoie medaille: null (retrait explicite, jamais omis)', async () => {
    const withMedal = participation({ competition: BELGIAN_OPEN, classement: 3, medaille: 'bronze', victoires: 3, defaites: 1 });
    api.getCompetitions.mockResolvedValue([withMedal]);
    api.updateCompetitionResult.mockResolvedValue({ ...withMedal, medaille: null });
    render(<PassportPage />);

    await userEvent.click(await within(palmares()).findByRole('button', { name: /Modifier le résultat/ }));
    const dialog = screen.getByRole('dialog', { name: 'Modifier le résultat' });
    await userEvent.selectOptions(within(dialog).getByLabelText('Médaille'), '');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Enregistrer' }));

    const payload = api.updateCompetitionResult.mock.calls[0][2];
    expect(payload).toHaveProperty('medaille', null);
  });

  it('PATCH en échec : message affiché, formulaire conservé, pas de rechargement', async () => {
    api.getCompetitions.mockResolvedValue([participation({ competition: DUTCH_OPEN })]);
    api.updateCompetitionResult.mockRejectedValue(new Error('La compétition n\'est pas encore terminée.'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<PassportPage />);

    await userEvent.click(await within(palmares()).findByRole('button', { name: /Renseigner le résultat/ }));
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Classement'), '2');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Enregistrer' }));

    expect(await within(dialog).findByText("La compétition n'est pas encore terminée.")).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Classement')).toHaveValue(2);
    expect(api.getCompetitions).toHaveBeenCalledTimes(1);
  });
});
