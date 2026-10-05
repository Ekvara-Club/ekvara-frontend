import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExercisesPage from './ExercisesPage';
import type { Exercise } from '../types/exercise';

const api = vi.hoisted(() => ({ getExercises: vi.fn(), getExercise: vi.fn() }));

vi.mock('../services/exercises.api', () => api);
vi.mock('../components/layout/Header', () => ({ default: () => <header data-testid="header" /> }));

function exercise(overrides: Partial<Exercise> = {}): Exercise {
  return {
    id: 'ex-1', titre: 'Exercice', type_exercice: 'technique', panel_technique: null, niveau: 'debutant',
    description: null, video_url: null, gratuit: true,
    ...overrides,
  };
}

const REACTION = exercise({
  id: 'ex-reaction', titre: 'Départs sur signal', type_exercice: 'reaction', niveau: 'intermediaire',
  description: 'Travail de la réaction au signal visuel.', panel_technique: 'Bandal chagui',
  video_url: 'https://www.youtube.com/watch?v=abc123',
});
const MOBILITE = exercise({ id: 'ex-mobilite', titre: 'Ouverture de hanches', type_exercice: 'mobilite', niveau: 'debutant', video_url: 'https://example.com/video.mp4' });
const FORCE = exercise({ id: 'ex-force', titre: 'Gainage dynamique', type_exercice: 'force', niveau: 'avance' });

const filterGroup = (label: string) => within(screen.getByText(label, { selector: 'p' }).parentElement!);
const list = () => screen.queryAllByRole('button', { name: /→/ });

describe('ExercisesPage — catalogue, recherche, filtres, fiche', () => {
  beforeEach(() => {
    api.getExercises.mockResolvedValue([REACTION, MOBILITE, FORCE]);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('recherche insensible à la casse et aux accents ("REACTION" trouve "réaction"), sans appel réseau', async () => {
    render(<ExercisesPage />);
    expect(await screen.findByText('3 exercices')).toBeInTheDocument();

    await userEvent.type(screen.getByRole('textbox', { name: 'Rechercher un exercice' }), 'REACTION');

    expect(screen.getByText('1 exercice')).toBeInTheDocument();
    expect(screen.getByText('Départs sur signal')).toBeInTheDocument();
    expect(screen.queryByText('Ouverture de hanches')).not.toBeInTheDocument();
    expect(api.getExercises).toHaveBeenCalledTimes(1);
  });

  it('la recherche couvre aussi le focus technique', async () => {
    render(<ExercisesPage />);
    await screen.findByText('3 exercices');

    await userEvent.type(screen.getByPlaceholderText('Rechercher un exercice...'), 'bandal');

    expect(screen.getByText('1 exercice')).toBeInTheDocument();
    expect(screen.getByText('Départs sur signal')).toBeInTheDocument();
  });

  it('filtres type + niveau combinés ; aucun résultat ⇒ réinitialiser restaure tout', async () => {
    render(<ExercisesPage />);
    await screen.findByText('3 exercices');

    expect(filterGroup('Type').getByRole('button', { name: 'Tous' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(filterGroup('Type').getByRole('button', { name: 'Mobilité' }));
    expect(filterGroup('Type').getByRole('button', { name: 'Mobilité' })).toHaveAttribute('aria-pressed', 'true');
    expect(filterGroup('Type').getByRole('button', { name: 'Tous' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('1 exercice')).toBeInTheDocument();
    expect(screen.getByText('Ouverture de hanches')).toBeInTheDocument();

    await userEvent.click(filterGroup('Niveau').getByRole('button', { name: 'Avancé' }));
    expect(screen.getByText('Aucun exercice ne correspond à ta recherche.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Réinitialiser les filtres' }));
    expect(screen.getByText('3 exercices')).toBeInTheDocument();
  });

  it('fiche : ouverte depuis les données déjà chargées (pas de GET /exercises/:id), lecteur YouTube embed, Échap ferme', async () => {
    render(<ExercisesPage />);
    await screen.findByText('3 exercices');

    await userEvent.click(screen.getByRole('button', { name: /Départs sur signal/ }));
    const dialog = screen.getByRole('dialog', { name: 'Départs sur signal' });

    expect(within(dialog).getByText('Réaction · Intermédiaire')).toBeInTheDocument();
    expect(within(dialog).getByText('Bandal chagui')).toBeInTheDocument();
    expect(within(dialog).getByTitle('Départs sur signal')).toHaveAttribute('src', 'https://www.youtube.com/embed/abc123');
    expect(api.getExercise).not.toHaveBeenCalled();

    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('vidéo d\'une origine non supportée : aucun lecteur (pas d\'iframe arbitraire)', async () => {
    render(<ExercisesPage />);
    await screen.findByText('3 exercices');

    await userEvent.click(screen.getByRole('button', { name: /Ouverture de hanches/ }));

    const dialog = screen.getByRole('dialog');
    expect(dialog.querySelector('iframe')).toBeNull();
  });

  it('catalogue vide ; erreur ⇒ message propre', async () => {
    api.getExercises.mockResolvedValueOnce([]);
    const { unmount } = render(<ExercisesPage />);
    expect(await screen.findByText('Aucun exercice disponible pour le moment.')).toBeInTheDocument();
    expect(list()).toHaveLength(0);
    unmount();

    api.getExercises.mockRejectedValueOnce(new Error('Failed to fetch'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<ExercisesPage />);
    expect(await screen.findByText('Impossible de charger les exercices pour le moment.')).toBeInTheDocument();
    expect(screen.queryByText('Failed to fetch')).not.toBeInTheDocument();
  });
});
