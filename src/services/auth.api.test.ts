import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getMe, login, logout, register, validateInvitationCode } from './auth.api';

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

function lastCall() {
  const [url, init] = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
  return { url: url as string, init: init as RequestInit, headers: new Headers(init.headers) };
}

describe('auth.api (athlète) — contexte de session', () => {
  it('chaque appel d\'auth envoie credentials: include et X-Ekvara-App: athlete', async () => {
    fetchMock.mockImplementation(async () => new Response(JSON.stringify({ id: 'a1' }), { status: 200 }));

    await login({ email: 'a@b.fr', password: 'x' });
    expect(lastCall().url).toMatch(/\/auth\/login$/);
    await register({ invitationCode: 'C', email: 'a@b.fr', password: 'x', nom: 'N', prenom: 'P' });
    await validateInvitationCode('C');
    await getMe();
    await logout();

    for (const [, init] of fetchMock.mock.calls) {
      expect((init as RequestInit).credentials).toBe('include');
      expect(new Headers((init as RequestInit).headers).get('X-Ekvara-App')).toBe('athlete');
    }
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it('les en-têtes JSON ne sont pas écrasés par l\'en-tête de contexte', async () => {
    fetchMock.mockResolvedValue(new Response('{"id":"a1"}', { status: 200 }));

    await login({ email: 'a@b.fr', password: 'x' });

    expect(lastCall().headers.get('Content-Type')).toBe('application/json');
    expect(lastCall().headers.get('X-Ekvara-App')).toBe('athlete');
  });

  it('getMe : 401 -> null (session absente/expirée), 200 -> l\'athlète, 500 -> erreur', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 401 }));
    await expect(getMe()).resolves.toBeNull();

    fetchMock.mockResolvedValueOnce(new Response('{"id":"a1"}', { status: 200 }));
    await expect(getMe()).resolves.toEqual({ id: 'a1' });

    fetchMock.mockResolvedValueOnce(new Response('', { status: 500 }));
    await expect(getMe()).rejects.toThrow();
  });

  it('login d\'un compte coach-only : corps vide (athlete: null côté backend) -> null, pas une erreur de parsing JSON', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 200 }));

    await expect(login({ email: 'sophie@ekvara.fr', password: 'x' })).resolves.toBeNull();
  });

  it('login refusé -> message backend', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ message: 'Email ou mot de passe incorrect' }), { status: 401 }),
    );

    await expect(login({ email: 'a@b.fr', password: 'x' })).rejects.toThrow('Email ou mot de passe incorrect');
  });
});
