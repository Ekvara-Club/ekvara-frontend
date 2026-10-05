import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ActivityPage from './ActivityPage';
import { competition, participation, preparation } from '../test/fixtures';

const api = vi.hoisted(() => ({
  getTrainings: vi.fn(),
  getCompetitions: vi.fn(),
  getCoachPreparations: vi.fn(),
}));
const nav = vi.hoisted(() => ({ navigateTo: vi.fn() }));

vi.mock('../services/athletes.api', () => api);
vi.mock('../utils/navigation', () => nav);
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ athlete: { id: 'athlete-1' } }) }));
vi.mock('../components/layout/Header', () => ({ default: () => <header data-testid="header" /> }));

// Aujourd'hui = 21 septembre 2026 (dates "date-only" comparées en local).
const FUTURE = competition({ id: 'comp-champ', nom: 'Championnat de France seniors', dateDebut: '2027-03-13', ville: 'Eaubonne', pays: 'France', niveau: 'national' });

function mesCompetitions() {
  return within(screen.getByText('Mes compétitions').closest('section')!);
}

describe('ActivityPage — Mes compétitions (#20)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 21));
    api.getTrainings.mockResolvedValue([]);
    api.getCompetitions.mockResolvedValue([]);
    api.getCoachPreparations.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('préparation coach seule (cas réel) : la compétition apparaît "à venir", marquée "Prévue par ton coach", jamais "Inscrit"', async () => {
    api.getCoachPreparations.mockResolvedValue([preparation({ competition: FUTURE, competitionId: FUTURE.id })]);
    render(<ActivityPage />);

    expect(await mesCompetitions().findByText('Championnat de France seniors')).toBeInTheDocument();
    expect(mesCompetitions().getByText('À venir')).toBeInTheDocument();
    expect(mesCompetitions().getByText(/Prévue par ton coach · Senior · -68kg/)).toBeInTheDocument();
    expect(mesCompetitions().queryByText(/Inscrit/)).not.toBeInTheDocument();
    expect(mesCompetitions().queryByText('Aucune compétition enregistrée pour le moment.')).not.toBeInTheDocument();
  });

  it('participation : statut et catégorie officiels ; clic ⇒ fiche compétition canonique', async () => {
    api.getCompetitions.mockResolvedValue([participation({ competition: FUTURE })]);
    render(<ActivityPage />);

    expect(await mesCompetitions().findByText(/Eaubonne · France · National · Inscrit · Cadet · -74 kg/)).toBeInTheDocument();
    await userEvent.click(mesCompetitions().getByRole('button', { name: /Championnat de France seniors/ }));
    expect(nav.navigateTo).toHaveBeenCalledWith('/competitions/comp-champ');
  });

  it('participation + préparation sur la même compétition : une seule ligne (la participation)', async () => {
    api.getCompetitions.mockResolvedValue([participation({ competition: FUTURE })]);
    api.getCoachPreparations.mockResolvedValue([preparation({ competition: FUTURE, competitionId: FUTURE.id })]);
    render(<ActivityPage />);

    expect(await mesCompetitions().findAllByText('Championnat de France seniors')).toHaveLength(1);
    expect(mesCompetitions().queryByText(/Prévue par ton coach/)).not.toBeInTheDocument();
  });

  it('à venir et passées : deux sous-sections ; passée avec son résultat réel', async () => {
    api.getCompetitions.mockResolvedValue([
      participation({ id: 'p-future', competition: FUTURE }),
      participation({
        id: 'p-past',
        classement: 3,
        medaille: 'bronze',
        competition: competition({ id: 'comp-belgian', nom: 'Belgian Open', dateDebut: '2026-03-15', dateFin: '2026-03-16' }),
      }),
    ]);
    render(<ActivityPage />);

    expect(await mesCompetitions().findByText('Belgian Open')).toBeInTheDocument();
    expect(mesCompetitions().getByText('À venir')).toBeInTheDocument();
    expect(mesCompetitions().getByText('Passées')).toBeInTheDocument();
    expect(mesCompetitions().getByText(/3E · BRONZE/)).toBeInTheDocument();
  });

  it('seulement des passées : pas d’état vide global ni de bloc "À venir" vide', async () => {
    api.getCompetitions.mockResolvedValue([
      participation({ competition: competition({ id: 'old', nom: 'Open 2025', dateDebut: '2025-06-01' }) }),
    ]);
    render(<ActivityPage />);

    expect(await mesCompetitions().findByText('Open 2025')).toBeInTheDocument();
    expect(mesCompetitions().queryByText('À venir')).not.toBeInTheDocument();
    expect(mesCompetitions().queryByText('Aucune compétition enregistrée pour le moment.')).not.toBeInTheDocument();
  });

  it('préparation passée : aucun résultat affiché (ce n’est pas une participation)', async () => {
    api.getCoachPreparations.mockResolvedValue([
      preparation({ competitionId: 'old', competition: competition({ id: 'old', nom: 'Open préparé 2025', dateDebut: '2025-06-01' }) }),
    ]);
    render(<ActivityPage />);

    expect(await mesCompetitions().findByText('Open préparé 2025')).toBeInTheDocument();
    expect(mesCompetitions().queryByText('Résultat non renseigné')).not.toBeInTheDocument();
  });

  it('historique borné : 5 passées affichées, "Voir tout" révèle le reste', async () => {
    api.getCompetitions.mockResolvedValue(
      Array.from({ length: 7 }, (_, i) =>
        participation({ id: `p${i}`, competition: competition({ id: `c${i}`, nom: `Open n°${i}`, dateDebut: `2025-0${i + 1}-10` }) }),
      ),
    );
    render(<ActivityPage />);

    expect(await mesCompetitions().findByText('Open n°6')).toBeInTheDocument();
    expect(mesCompetitions().queryByText('Open n°1')).not.toBeInTheDocument();
    await userEvent.click(mesCompetitions().getByRole('button', { name: 'Voir tout (7)' }));
    expect(mesCompetitions().getByText('Open n°0')).toBeInTheDocument();
  });

  it('aucune participation ni préparation : état vide', async () => {
    render(<ActivityPage />);
    expect(await mesCompetitions().findByText('Aucune compétition enregistrée pour le moment.')).toBeInTheDocument();
  });

  it('préparations indisponibles : les participations restent affichées', async () => {
    api.getCompetitions.mockResolvedValue([participation({ competition: FUTURE })]);
    api.getCoachPreparations.mockRejectedValue(new Error('Failed to fetch'));
    render(<ActivityPage />);

    expect(await mesCompetitions().findByText('Championnat de France seniors')).toBeInTheDocument();
  });

  it('erreur des participations : message local ; chargement affiché avant réponse', async () => {
    api.getCompetitions.mockReturnValueOnce(new Promise(() => {}));
    const { unmount } = render(<ActivityPage />);
    expect(mesCompetitions().getByText('Chargement...')).toBeInTheDocument();
    unmount();

    api.getCompetitions.mockRejectedValue(new Error('Failed to fetch'));
    render(<ActivityPage />);
    expect(await mesCompetitions().findByText('Impossible de charger les compétitions.')).toBeInTheDocument();
  });

  it('menu "+ Ajouter" : état annoncé (aria-expanded), Échap le ferme', async () => {
    render(<ActivityPage />);
    const trigger = screen.getByRole('button', { name: '+ Ajouter' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: /Entraînement/ })).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: /Entraînement/ })).not.toBeInTheDocument();
  });
});
