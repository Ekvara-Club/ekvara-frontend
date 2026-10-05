import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';
import { consumeReturnTo, notifyUnauthorized, requestSessionRevalidation } from './services/session';
import type { AuthMeResponse } from './types/auth';

const api = vi.hoisted(() => ({ getMe: vi.fn(), login: vi.fn(), logout: vi.fn(), register: vi.fn() }));
const mounts = vi.hoisted(() => ({ home: 0 }));

vi.mock('./services/auth.api', () => api);

// Pages remplacées par des sondes : App.tsx ne teste ici que le routage/la garde.
vi.mock('./pages/HomePage', async () => {
  const { useEffect } = await import('react');
  const { useAuth } = await import('./contexts/AuthContext');
  return {
    default: function HomePage() {
      const { athlete } = useAuth();
      useEffect(() => {
        mounts.home += 1;
      }, []);
      return <p data-testid="page">home:{athlete?.id}</p>;
    },
  };
});
vi.mock('./pages/ActivityPage', async () => {
  const { useAuth } = await import('./contexts/AuthContext');
  return {
    default: function ActivityPage() {
      const { logout } = useAuth();
      return (
        <div>
          <p data-testid="page">activity</p>
          <button onClick={() => logout()}>logout</button>
        </div>
      );
    },
  };
});
vi.mock('./pages/ExercisesPage', () => ({ default: () => <p data-testid="page">Exercises</p> }));
vi.mock('./pages/PassportPage', () => ({ default: () => <p data-testid="page">Passport</p> }));
vi.mock('./pages/WeightPage', () => ({ default: () => <p data-testid="page">Weight</p> }));
vi.mock('./pages/GoalsPage', () => ({ default: () => <p data-testid="page">Goals</p> }));
vi.mock('./pages/ProgressPage', () => ({ default: () => <p data-testid="page">Progress</p> }));
vi.mock('./pages/CompetitionPage', () => ({ default: () => <p data-testid="page">Competition</p> }));
vi.mock('./pages/CompetitionsPage', () => ({ default: () => <p data-testid="page">Competitions</p> }));
vi.mock('./pages/RegisterPage', () => ({ default: () => <p data-testid="page">Register</p> }));
vi.mock('./pages/LoginPage', async () => {
  const { useAuth } = await import('./contexts/AuthContext');
  return {
    default: function LoginPage() {
      const { sessionNotice, login } = useAuth();
      return (
        <div>
          <p data-testid="page">login</p>
          <p data-testid="notice">{sessionNotice ?? ''}</p>
          <button onClick={() => login({ email: 'a@b.fr', password: 'x' })}>submit</button>
        </div>
      );
    },
  };
});

function athlete(id: string): AuthMeResponse {
  return {
    id, user_id: `u-${id}`, club_id: null, categorie_age: null, genre: null, grade: null,
    date_naissance: null, niveau_sportif: null,
    etat_forme: 'actif', etat_forme_note: null, etat_forme_retour: null, etat_forme_updated_at: null, created_at: null, updated_at: null, club: null,
    app_user: { id: `u-${id}`, email: 'a@b.fr', nom: 'N', prenom: 'P', langue: 'fr', created_at: null, updated_at: null },
  };
}

const page = () => screen.getByTestId('page').textContent;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 8, 21, 10, 0, 0));
  api.logout.mockResolvedValue(undefined);
  mounts.home = 0;
  window.history.replaceState({}, '', '/');
});

afterEach(() => {
  vi.useRealTimers();
  vi.resetAllMocks();
  consumeReturnTo();
});

describe('App — garde de routes et session', () => {
  it('pendant le chargement : ni page protégée ni login (pas de flash Dashboard -> Login)', async () => {
    let resolveMe!: (v: AuthMeResponse | null) => void;
    api.getMe.mockReturnValue(new Promise((resolve) => (resolveMe = resolve)));

    render(<App />);

    expect(screen.getByText('Chargement...')).toBeInTheDocument();
    expect(screen.queryByTestId('page')).not.toBeInTheDocument();

    await act(async () => resolveMe(athlete('a1')));
    expect(page()).toBe('home:a1');
  });

  it('session valide : la page protégée s\'affiche, sans passage par /login', async () => {
    api.getMe.mockResolvedValue(athlete('a1'));
    window.history.replaceState({}, '', '/activite');

    render(<App />);

    await waitFor(() => expect(page()).toBe('activity'));
    expect(window.location.pathname).toBe('/activite');
  });

  it('session absente : redirigé vers /login', async () => {
    api.getMe.mockResolvedValue(null);
    window.history.replaceState({}, '', '/activite');

    render(<App />);

    await waitFor(() => expect(page()).toBe('login'));
    expect(window.location.pathname).toBe('/login');
  });

  it('après reconnexion, retour à la page qui était demandée', async () => {
    api.getMe.mockResolvedValue(null);
    api.login.mockResolvedValue(athlete('a1'));
    window.history.replaceState({}, '', '/activite');

    render(<App />);
    await waitFor(() => expect(window.location.pathname).toBe('/login'));
    fireEvent.click(screen.getByText('submit'));

    await waitFor(() => expect(page()).toBe('activity'));
    expect(window.location.pathname).toBe('/activite');
  });

  it('401 en cours de session : retour propre à /login avec explication, sans window.location.reload', async () => {
    const reload = vi.fn();
    const original = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: new Proxy(original, {
        get(target, prop) {
          if (prop === 'reload') return reload;
          const value = Reflect.get(target, prop, target);
          return typeof value === 'function' ? value.bind(target) : value;
        },
      }),
    });
    api.getMe.mockResolvedValue(athlete('a1'));
    window.history.replaceState({}, '', '/activite');

    render(<App />);
    await waitFor(() => expect(page()).toBe('activity'));
    act(() => notifyUnauthorized());

    await waitFor(() => expect(page()).toBe('login'));
    expect(screen.getByTestId('notice').textContent).toMatch(/session a expiré/i);
    expect(reload).not.toHaveBeenCalled();
    Object.defineProperty(window, 'location', { configurable: true, value: original });
  });

  it('403 avec session toujours valide : l\'utilisateur reste sur sa page', async () => {
    api.getMe.mockResolvedValue(athlete('a1'));
    render(<App />);
    await waitFor(() => expect(page()).toBe('home:a1'));
    vi.setSystemTime(new Date(Date.now() + 60_000));

    await act(async () => requestSessionRevalidation());

    expect(page()).toBe('home:a1');
  });

  it('session remplacée par un autre athlète : les pages sont remontées (aucune donnée de l\'ancien compte)', async () => {
    api.getMe.mockResolvedValueOnce(athlete('a1')).mockResolvedValueOnce(athlete('a2'));
    render(<App />);
    await waitFor(() => expect(page()).toBe('home:a1'));
    expect(mounts.home).toBe(1);
    vi.setSystemTime(new Date(Date.now() + 60_000));

    await act(async () => requestSessionRevalidation());

    await waitFor(() => expect(page()).toBe('home:a2'));
    expect(mounts.home).toBe(2);
  });

  it('déconnexion volontaire : la page quittée n\'est PAS mémorisée pour la prochaine connexion', async () => {
    api.getMe.mockResolvedValue(athlete('a1'));
    api.login.mockResolvedValue(athlete('a2'));
    window.history.replaceState({}, '', '/activite');
    render(<App />);
    await waitFor(() => expect(page()).toBe('activity'));

    fireEvent.click(screen.getByText('logout'));
    await waitFor(() => expect(page()).toBe('login'));
    expect(screen.getByTestId('notice').textContent).toBe('');

    fireEvent.click(screen.getByText('submit'));

    await waitFor(() => expect(page()).toBe('home:a2'));
    expect(window.location.pathname).toBe('/');
    expect(api.logout).toHaveBeenCalledTimes(1);
  });

  it('connecté sur /login : renvoyé vers l\'accueil', async () => {
    api.getMe.mockResolvedValue(athlete('a1'));
    window.history.replaceState({}, '', '/login');

    render(<App />);

    await waitFor(() => expect(page()).toBe('home:a1'));
    expect(window.location.pathname).toBe('/');
  });

  it('RGPD : politique de confidentialité lisible sans session, jamais renvoyée vers /login', async () => {
    api.getMe.mockResolvedValue(null);
    window.history.replaceState({}, '', '/confidentialite');

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Politique de confidentialité' })).toBeInTheDocument();
    await act(async () => {});
    expect(window.location.pathname).toBe('/confidentialite');
  });
});
