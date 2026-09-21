import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import { notifyUnauthorized, requestSessionRevalidation, consumeReturnTo } from '../services/session';
import type { AuthMeResponse } from '../types/auth';

const api = vi.hoisted(() => ({
  getMe: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
}));

vi.mock('../services/auth.api', () => api);

function athlete(id: string, prenom = 'Kaïs'): AuthMeResponse {
  return {
    id,
    user_id: `u-${id}`,
    club_id: null,
    categorie_age: null,
    genre: null,
    grade: null,
    date_naissance: null,
    niveau_sportif: null,
    created_at: null,
    updated_at: null,
    club: null,
    app_user: { id: `u-${id}`, email: `${id}@ekvara.fr`, nom: 'Dilmi', prenom, langue: 'fr', created_at: null, updated_at: null },
  };
}

function Probe() {
  const { athlete: session, loading, sessionNotice, login, logout } = useAuth();
  return (
    <div>
      <p data-testid="loading">{String(loading)}</p>
      <p data-testid="athlete">{session ? session.id : 'anonymous'}</p>
      <p data-testid="notice">{sessionNotice ?? ''}</p>
      <button onClick={() => login({ email: 'a@b.fr', password: 'x' }).catch(() => {})}>login</button>
      <button onClick={() => logout()}>logout</button>
    </div>
  );
}

const state = () => screen.getByTestId('athlete').textContent;
const notice = () => screen.getByTestId('notice').textContent;

async function renderReady() {
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
  await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 8, 21, 10, 0, 0));
  api.logout.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.resetAllMocks();
  consumeReturnTo();
});

function advance(ms: number) {
  vi.setSystemTime(new Date(Date.now() + ms));
}

describe('AuthContext — bootstrap déterministe', () => {
  it('démarre en "loading" sans supposer de session, puis résout authentifié', async () => {
    api.getMe.mockResolvedValue(athlete('a1'));

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    expect(screen.getByTestId('loading').textContent).toBe('true');
    expect(state()).toBe('anonymous');

    await waitFor(() => expect(state()).toBe('a1'));
    expect(screen.getByTestId('loading').textContent).toBe('false');
    expect(api.getMe).toHaveBeenCalledTimes(1);
  });

  it('session absente ou expirée (401 -> null) : anonyme, sans notice', async () => {
    api.getMe.mockResolvedValue(null);

    await renderReady();

    expect(state()).toBe('anonymous');
    expect(notice()).toBe('');
  });

  it('erreur réseau au démarrage : retombe sur anonyme (pas d\'état indéterminé)', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    api.getMe.mockRejectedValue(new Error('réseau'));

    await renderReady();

    expect(state()).toBe('anonymous');
    consoleError.mockRestore();
  });
});

describe('AuthContext — 401 pendant un appel métier', () => {
  it('efface l\'état (utilisateur stale supprimé) et explique pourquoi, sans rechargement', async () => {
    api.getMe.mockResolvedValue(athlete('a1'));
    await renderReady();

    act(() => notifyUnauthorized());

    expect(state()).toBe('anonymous');
    expect(notice()).toMatch(/session a expiré/i);
  });

  it('plusieurs 401 simultanés : un seul effacement, la notice reste', async () => {
    api.getMe.mockResolvedValue(athlete('a1'));
    await renderReady();

    act(() => {
      notifyUnauthorized();
      notifyUnauthorized();
      notifyUnauthorized();
    });

    expect(state()).toBe('anonymous');
    expect(notice()).toMatch(/session a expiré/i);
  });

  it('un 401 sans session (déjà anonyme) ne fabrique pas de notice', async () => {
    api.getMe.mockResolvedValue(null);
    await renderReady();

    act(() => notifyUnauthorized());

    expect(notice()).toBe('');
  });
});

describe('AuthContext — 403 : revalidation, jamais de faux logout', () => {
  it('403 sur une session toujours valide et identique -> l\'utilisateur reste connecté (vrai 403)', async () => {
    api.getMe.mockResolvedValue(athlete('a1'));
    await renderReady();
    advance(60_000);

    await act(async () => requestSessionRevalidation());

    expect(api.getMe).toHaveBeenCalledTimes(2);
    expect(state()).toBe('a1');
    expect(notice()).toBe('');
  });

  it('403 puis /me = 401 (session disparue) -> retour anonyme avec notice', async () => {
    api.getMe.mockResolvedValueOnce(athlete('a1')).mockResolvedValueOnce(null);
    await renderReady();
    advance(60_000);

    await act(async () => requestSessionRevalidation());

    expect(state()).toBe('anonymous');
    expect(notice()).toMatch(/session a expiré/i);
  });

  it('403 puis /me = autre athlète (session remplacée dans un autre onglet) -> resynchronisé sur la nouvelle identité', async () => {
    api.getMe.mockResolvedValueOnce(athlete('a1')).mockResolvedValueOnce(athlete('a2', 'Autre'));
    await renderReady();
    advance(60_000);

    await act(async () => requestSessionRevalidation());

    expect(state()).toBe('a2');
  });

  it('erreur réseau pendant la revalidation : aucune déconnexion', async () => {
    api.getMe.mockResolvedValueOnce(athlete('a1')).mockRejectedValueOnce(new Error('réseau'));
    await renderReady();
    advance(60_000);

    await act(async () => requestSessionRevalidation());

    expect(state()).toBe('a1');
  });

  it('rafale de 403 : dédupliquée en une seule requête /me', async () => {
    api.getMe.mockResolvedValue(athlete('a1'));
    await renderReady();
    advance(60_000);

    await act(async () => {
      requestSessionRevalidation();
      requestSessionRevalidation();
      requestSessionRevalidation();
    });

    expect(api.getMe).toHaveBeenCalledTimes(2); // bootstrap + 1 revalidation
  });

  it('403 répétés à quelques secondes d\'écart : throttlés (pas de bombardement de /me)', async () => {
    api.getMe.mockResolvedValue(athlete('a1'));
    await renderReady();
    advance(60_000);

    await act(async () => requestSessionRevalidation());
    advance(1_000);
    await act(async () => requestSessionRevalidation());

    expect(api.getMe).toHaveBeenCalledTimes(2);
  });
});

describe('AuthContext — focus / visibilité', () => {
  it('retour de focus après plusieurs minutes : revalide et détecte une session expirée', async () => {
    api.getMe.mockResolvedValueOnce(athlete('a1')).mockResolvedValueOnce(null);
    await renderReady();
    advance(5 * 60_000);

    await act(async () => {
      window.dispatchEvent(new Event('focus'));
    });

    await waitFor(() => expect(state()).toBe('anonymous'));
    expect(notice()).toMatch(/session a expiré/i);
  });

  it('retour de visibilité (onglet redevenu visible) revalide aussi', async () => {
    api.getMe.mockResolvedValueOnce(athlete('a1')).mockResolvedValueOnce(athlete('a2'));
    await renderReady();
    advance(5 * 60_000);

    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await waitFor(() => expect(state()).toBe('a2'));
  });

  it('focus + visibilitychange simultanés à un changement d\'onglet : une seule vérification', async () => {
    api.getMe.mockResolvedValue(athlete('a1'));
    await renderReady();
    advance(5 * 60_000);

    await act(async () => {
      window.dispatchEvent(new Event('focus'));
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(api.getMe).toHaveBeenCalledTimes(2);
  });

  it('focus répétés dans les 30 s : throttlés', async () => {
    api.getMe.mockResolvedValue(athlete('a1'));
    await renderReady();
    advance(31_000);

    await act(async () => window.dispatchEvent(new Event('focus')));
    advance(5_000);
    await act(async () => window.dispatchEvent(new Event('focus')));

    expect(api.getMe).toHaveBeenCalledTimes(2);
  });

  it('juste après le bootstrap, un focus ne redemande pas /me', async () => {
    api.getMe.mockResolvedValue(athlete('a1'));
    await renderReady();
    advance(2_000);

    await act(async () => window.dispatchEvent(new Event('focus')));

    expect(api.getMe).toHaveBeenCalledTimes(1);
  });

  it('anonyme : aucune revalidation au focus', async () => {
    api.getMe.mockResolvedValue(null);
    await renderReady();
    advance(5 * 60_000);

    await act(async () => window.dispatchEvent(new Event('focus')));

    expect(api.getMe).toHaveBeenCalledTimes(1);
  });
});

describe('AuthContext — login / logout', () => {
  it('login réussi : session posée, notice effacée', async () => {
    api.getMe.mockResolvedValue(null);
    api.login.mockResolvedValue(athlete('a1'));
    await renderReady();

    fireEvent.click(screen.getByText('login'));

    await waitFor(() => expect(state()).toBe('a1'));
    expect(notice()).toBe('');
  });

  it('login d\'un compte coach-only : refusé, jamais une session fantôme, cookie athlète refermé', async () => {
    api.getMe.mockResolvedValue(null);
    api.login.mockResolvedValue(null);
    await renderReady();

    fireEvent.click(screen.getByText('login'));

    await waitFor(() => expect(api.logout).toHaveBeenCalledTimes(1));
    expect(state()).toBe('anonymous');
  });

  it('logout : session effacée', async () => {
    api.getMe.mockResolvedValue(athlete('a1'));
    await renderReady();

    fireEvent.click(screen.getByText('logout'));

    await waitFor(() => expect(state()).toBe('anonymous'));
    expect(api.logout).toHaveBeenCalledTimes(1);
  });
});
