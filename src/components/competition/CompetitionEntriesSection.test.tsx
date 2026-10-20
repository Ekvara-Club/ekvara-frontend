import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CompetitionEntriesSection from './CompetitionEntriesSection';
import type { CompetitionEntriesResponse, CompetitionEntryCategory } from '../../types/competition-entries';

const api = vi.hoisted(() => ({ getCompetitionEntries: vi.fn() }));

vi.mock('../../services/athletes.api', () => api);

function category(rawLabel: string, weightCategory: string | null, names: string[]): CompetitionEntryCategory {
  return {
    rawLabel,
    ageCategory: null,
    gender: null,
    weightCategory,
    entries: names.map((name, i) => ({ id: `${rawLabel}-${i}`, name, club: null, league: null, country: 'FRA' })),
  };
}

const ENTRIES: CompetitionEntriesResponse = {
  competitionId: 'comp-1',
  totalEntries: 4,
  categories: [
    category('Men -68kg', '-68kg', ['Hugo PETIT', 'Noa LEROY']),
    category('Women -57kg', '-57kg', ['Lina MARTIN']),
    category('Seniors Masculins -80 kg', null, ['Paul DURAND']),
  ],
};

describe('CompetitionEntriesSection', () => {
  beforeEach(() => {
    api.getCompetitionEntries.mockResolvedValue(ENTRIES);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('sans combat : chiffres (0 combat), catégories groupées par préfixe, athlètes de la première catégorie', async () => {
    render(<CompetitionEntriesSection competitionId="comp-1" categorieAge={null} categoriePoids={null} showMatchCount />);

    expect(await screen.findByText('Combats')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();

    const nav = screen.getByRole('navigation', { name: 'Catégories des participants' });
    expect(within(nav).getByText('Men')).toBeInTheDocument();
    expect(within(nav).getByText('Women')).toBeInTheDocument();
    expect(within(nav).getByText('Autres')).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: 'Men -68kg' })).toHaveTextContent('-68 kg');
    expect(within(nav).getByRole('button', { name: 'Men -68kg' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(nav).getByRole('button', { name: 'Seniors Masculins -80 kg' })).toHaveTextContent('Seniors Masculins -80 kg');

    expect(screen.getByRole('heading', { name: 'Men -68kg' })).toBeInTheDocument();
    expect(screen.getByText('2 athlètes')).toBeInTheDocument();
    expect(screen.getByText('Hugo PETIT')).toBeInTheDocument();
    expect(screen.queryByText('Lina MARTIN')).not.toBeInTheDocument();
  });

  it('changer de catégorie affiche ses athlètes', async () => {
    const user = userEvent.setup();
    render(<CompetitionEntriesSection competitionId="comp-1" categorieAge={null} categoriePoids={null} />);

    await user.click(await screen.findByRole('button', { name: 'Women -57kg' }));
    expect(screen.getByRole('heading', { name: 'Women -57kg' })).toBeInTheDocument();
    expect(screen.getByText('1 athlète')).toBeInTheDocument();
    expect(screen.getByText('Lina MARTIN')).toBeInTheDocument();
    expect(screen.queryByText('Hugo PETIT')).not.toBeInTheDocument();
  });

  it('section Résultats présente : pas de compteur de combats ici', async () => {
    render(<CompetitionEntriesSection competitionId="comp-1" categorieAge={null} categoriePoids={null} />);
    expect(await screen.findByText('Athlètes')).toBeInTheDocument();
    expect(screen.queryByText('Combats')).not.toBeInTheDocument();
  });

  it('ma catégorie (correspondance unique) ouverte par défaut et signalée', async () => {
    render(<CompetitionEntriesSection competitionId="comp-1" categorieAge={null} categoriePoids="-57kg" />);

    expect(await screen.findByRole('button', { name: 'Women -57kg (ma catégorie)' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Ma catégorie')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Women -57kg' })).toBeInTheDocument();
  });

  it('aucun inscrit : message, aucune catégorie inventée', async () => {
    api.getCompetitionEntries.mockResolvedValue({ competitionId: 'comp-1', totalEntries: 0, categories: [] });
    render(<CompetitionEntriesSection competitionId="comp-1" categorieAge={null} categoriePoids={null} showMatchCount />);

    expect(await screen.findByText('Aucun inscrit publié pour le moment.')).toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  it('recherche à partir de 20 inscrits : résultats toutes catégories, avec la catégorie de chacun', async () => {
    const user = userEvent.setup();
    const many = Array.from({ length: 19 }, (_, i) => `Athlète ${i + 1}`);
    api.getCompetitionEntries.mockResolvedValue({
      competitionId: 'comp-1',
      totalEntries: 21,
      categories: [category('Men -68kg', '-68kg', many), category('Women -57kg', '-57kg', ['Lina MARTIN', 'Emma DUBOIS'])],
    });
    render(<CompetitionEntriesSection competitionId="comp-1" categorieAge={null} categoriePoids={null} />);

    await user.type(await screen.findByLabelText('Rechercher un inscrit'), 'lina');
    expect(screen.getByText('Lina MARTIN')).toBeInTheDocument();
    expect(screen.getByText('Women -57kg')).toBeInTheDocument();
    expect(screen.queryByText('Athlète 1')).not.toBeInTheDocument();
  });

  it("erreur de chargement : message, rien d'autre", async () => {
    api.getCompetitionEntries.mockRejectedValue(new Error('500'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(<CompetitionEntriesSection competitionId="comp-1" categorieAge={null} categoriePoids={null} />);
    expect(await screen.findByText('Impossible de charger les inscrits.')).toBeInTheDocument();
  });
});
