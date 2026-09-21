import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from './apiClient';
import { setRevalidateListener, setUnauthorizedListener } from './session';

const fetchMock = vi.fn();

function respond(status: number) {
  fetchMock.mockResolvedValue(new Response(status === 204 ? null : '{}', { status }));
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
  setUnauthorizedListener(null);
  setRevalidateListener(null);
});

describe('apiFetch (athlète)', () => {
  it('envoie le cookie de session (credentials: include) et sélectionne le contexte athlète', async () => {
    respond(200);

    await apiFetch('/athletes/a1/weight-summary');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/athletes\/a1\/weight-summary$/);
    expect(init.credentials).toBe('include');
    expect(new Headers(init.headers).get('X-Ekvara-App')).toBe('athlete');
  });

  it('conserve les en-têtes de l\'appelant (Content-Type) en ajoutant X-Ekvara-App', async () => {
    respond(200);

    await apiFetch('/x', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });

    const init = fetchMock.mock.calls[0][1];
    const headers = new Headers(init.headers);
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(headers.get('X-Ekvara-App')).toBe('athlete');
    expect(init.method).toBe('POST');
  });

  it('401 -> signale la session invalide et renvoie la réponse telle quelle (jamais transformée en succès)', async () => {
    const unauthorized = vi.fn();
    setUnauthorizedListener(unauthorized);
    respond(401);

    const response = await apiFetch('/x');

    expect(unauthorized).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(401);
  });

  it('403 -> demande une revalidation de session, ne déconnecte PAS, renvoie le 403 tel quel', async () => {
    const unauthorized = vi.fn();
    const revalidate = vi.fn();
    setUnauthorizedListener(unauthorized);
    setRevalidateListener(revalidate);
    respond(403);

    const response = await apiFetch('/x');

    expect(revalidate).toHaveBeenCalledTimes(1);
    expect(unauthorized).not.toHaveBeenCalled();
    expect(response.status).toBe(403);
  });

  it('200 / 404 / 500 -> aucun signal de session', async () => {
    const unauthorized = vi.fn();
    const revalidate = vi.fn();
    setUnauthorizedListener(unauthorized);
    setRevalidateListener(revalidate);

    for (const status of [200, 404, 500]) {
      respond(status);
      await apiFetch('/x');
    }

    expect(unauthorized).not.toHaveBeenCalled();
    expect(revalidate).not.toHaveBeenCalled();
  });

  it('ne relance jamais la requête et ne recharge jamais la page (pas de retry, pas de reload)', async () => {
    respond(401);

    await apiFetch('/x');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
