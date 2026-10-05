import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CompetitionResultsSection from './CompetitionResultsSection';
import type { CompetitionCategoryResults, CompetitionResultFight } from '../../types/international';

const api = vi.hoisted(() => ({
  getCompetitionResultsSummary: vi.fn(),
  getCompetitionCategoryResults: vi.fn(),
}));

vi.mock('../../services/international.api', () => api);

const SUMMARY = {
  competitionId: 'comp-muju',
  matchCount: 234,
  athleteCount: 242,
  categories: [
    { label: 'Men -58kg', fightCount: 30, athleteCount: 31 },
    { label: 'Men +80kg', fightCount: 29, athleteCount: 30 },
    { label: 'Women -49kg', fightCount: 30, athleteCount: 31 },
    { label: '.1 (QF) / Men -80kg', fightCount: 1, athleteCount: 2 },
  ],
};

function fight(overrides: Partial<CompetitionResultFight> = {}): CompetitionResultFight {
  return {
    id: 'f1',
    category: 'Men -58kg',
    stage: 'F',
    contestNumber: 900,
    athleteA: { id: 'ath-a', displayName: 'Marko GOLUBIC', countryCode: 'CRO' },
    athleteB: { id: 'ath-b', displayName: 'Jinho MUN', countryCode: null },
    scoreA: 0,
    scoreB: 2,
    winnerSide: 'B',
    method: 'PTF',
    sources: [],
    ...overrides,
  };
}

function categoryResults(category: string, rounds: CompetitionCategoryResults['rounds']): CompetitionCategoryResults {
  return { competitionId: 'comp-muju', category, fightCount: rounds.reduce((n, r) => n + r.fights.length, 0), rounds };
}

describe('CompetitionResultsSection', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/competitions/comp-muju');
    api.getCompetitionResultsSummary.mockResolvedValue(SUMMARY);
    api.getCompetitionCategoryResults.mockImplementation((_id: string, category: string) =>
      Promise.resolve(
        categoryResults(category, [
          { stage: 'SF', fights: [fight({ id: `${category}-sf`, stage: 'SF', winnerSide: 'A', scoreA: 2, scoreB: 1 })] },
          { stage: 'F', fights: [fight({ id: `${category}-f` })] },
        ]),
      ),
    );
  });

  afterEach(() => {
    // Démonter AVANT de remettre les compteurs à zéro : sinon, sous charge,
    // un chargement encore en vol du test précédent pouvait appeler l'API
    // après le clear et être compté dans le test suivant (« 2 appels »).
    cleanup();
    vi.clearAllMocks();
  });

  it("chiffres de l'événement, catégories groupées par préfixe (label stocké gardé), label non structuré dans « Autres »", async () => {
    render(<CompetitionResultsSection competitionId="comp-muju" />);

    expect(await screen.findByText('234')).toBeInTheDocument();
    expect(screen.getByText('242')).toBeInTheDocument();
    expect(screen.getByText('Men')).toBeInTheDocument();
    expect(screen.getByText('Women')).toBeInTheDocument();
    expect(screen.getByText('Autres')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Men -58kg' })).toHaveTextContent('-58 kg');
    expect(screen.getByRole('button', { name: '.1 (QF) / Men -80kg' })).toHaveTextContent('.1 (QF) / Men -80kg');
  });

  it('sans catégorie dans l’URL : la première catégorie (ordre backend) est ouverte, un seul appel de catégorie', async () => {
    render(<CompetitionResultsSection competitionId="comp-muju" />);

    expect(await screen.findByRole('heading', { level: 3, name: 'Men -58kg' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Men -58kg' })).toHaveAttribute('aria-pressed', 'true');
    // Le titre suit `selected` dès le rendu ; l'appel part dans l'effet qui
    // suit : attendre les combats affichés avant de compter les appels.
    expect((await screen.findAllByText('Marko GOLUBIC')).length).toBeGreaterThan(0);
    expect(api.getCompetitionCategoryResults).toHaveBeenCalledTimes(1);
    expect(api.getCompetitionCategoryResults).toHaveBeenCalledWith('comp-muju', 'Men -58kg');
  });

  it('choisir une catégorie : combats de CETTE catégorie seulement, catégorie écrite dans l’URL', async () => {
    render(<CompetitionResultsSection competitionId="comp-muju" />);
    await screen.findByRole('heading', { level: 3, name: 'Men -58kg' });

    await userEvent.click(screen.getByRole('button', { name: 'Women -49kg' }));

    expect(await screen.findByRole('heading', { level: 3, name: 'Women -49kg' })).toBeInTheDocument();
    expect(api.getCompetitionCategoryResults).toHaveBeenLastCalledWith('comp-muju', 'Women -49kg');
    expect(new URLSearchParams(window.location.search).get('category')).toBe('Women -49kg');
  });

  it('catégorie présente dans l’URL (rechargement / lien partagé) rouverte ; catégorie inconnue ignorée', async () => {
    window.history.replaceState({}, '', '/competitions/comp-muju?category=Men%20%2B80kg');
    const { unmount } = render(<CompetitionResultsSection competitionId="comp-muju" />);
    expect(await screen.findByRole('heading', { level: 3, name: 'Men +80kg' })).toBeInTheDocument();
    unmount();

    window.history.replaceState({}, '', '/competitions/comp-muju?category=Inexistante');
    render(<CompetitionResultsSection competitionId="comp-muju" />);
    expect(await screen.findByRole('heading', { level: 3, name: 'Men -58kg' })).toBeInTheDocument();
  });

  it('tours dans l’ordre du tableau, titres français ; vainqueur désigné par winnerSide même avec le score inférieur', async () => {
    render(<CompetitionResultsSection competitionId="comp-muju" />);

    const headings = await screen.findAllByRole('heading', { level: 4 });
    expect(headings.map((h) => h.textContent)).toEqual(['Demi-finales1', 'Finale1']);

    const finalRow = within(headings[1].parentElement as HTMLElement).getByRole('listitem');
    // Jinho MUN (côté B) gagne 0-2 publié tel quel : jamais recalculé depuis les scores.
    expect(within(finalRow).getByText('(vainqueur)').closest('p')).toHaveTextContent('Jinho MUN');
    expect(within(finalRow).getByRole('link', { name: 'Marko GOLUBIC' })).not.toHaveClass('font-semibold');
    expect(within(finalRow).getByRole('link', { name: 'Jinho MUN' })).toHaveClass('font-semibold');
    expect(within(finalRow).getByText('PTF')).toBeInTheDocument();
  });

  it('chaque athlète est un lien vers son profil WT public', async () => {
    render(<CompetitionResultsSection competitionId="comp-muju" />);

    const links = await screen.findAllByRole('link', { name: 'Jinho MUN' });
    expect(links[0]).toHaveAttribute('href', '/athletes-wt/ath-b');
    expect(screen.getAllByRole('link', { name: 'Marko GOLUBIC' })[0]).toHaveAttribute('href', '/athletes-wt/ath-a');
  });

  it('vainqueur absent : aucun athlète mis en avant, mention explicite ; tour inconnu titré comme tel', async () => {
    api.getCompetitionCategoryResults.mockResolvedValue(
      categoryResults('Men -58kg', [{ stage: null, fights: [fight({ stage: null, winnerSide: null, method: null })] }]),
    );
    render(<CompetitionResultsSection competitionId="comp-muju" />);

    expect(await screen.findByText('Vainqueur non renseigné')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Tour non renseigné');
    expect(screen.queryByText('(vainqueur)')).not.toBeInTheDocument();
  });

  it('erreurs locales : résumé indisponible, puis combats d’une catégorie indisponibles', async () => {
    api.getCompetitionResultsSummary.mockRejectedValueOnce(new Error('Failed to fetch'));
    const { unmount } = render(<CompetitionResultsSection competitionId="comp-muju" />);
    expect(await screen.findByText('Impossible de charger les résultats.')).toBeInTheDocument();
    unmount();

    api.getCompetitionCategoryResults.mockRejectedValue(new Error('Failed to fetch'));
    render(<CompetitionResultsSection competitionId="comp-muju" />);
    expect(await screen.findByText('Impossible de charger les combats de cette catégorie.')).toBeInTheDocument();
    expect(screen.queryByText('Failed to fetch')).not.toBeInTheDocument();
  });

  it('chargement : état de chargement du résumé', () => {
    api.getCompetitionResultsSummary.mockReturnValue(new Promise(() => {}));
    render(<CompetitionResultsSection competitionId="comp-muju" />);
    expect(screen.getByText('Chargement...')).toBeInTheDocument();
  });
});
