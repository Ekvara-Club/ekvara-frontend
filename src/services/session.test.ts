import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  consumeReturnTo,
  createSessionRevalidator,
  notifyUnauthorized,
  rememberReturnTo,
  requestSessionRevalidation,
  setRevalidateListener,
  setUnauthorizedListener,
} from './session';

afterEach(() => {
  setUnauthorizedListener(null);
  setRevalidateListener(null);
  consumeReturnTo();
});

describe('createSessionRevalidator', () => {
  it('déduplique : des demandes simultanées ne lancent qu\'une seule vérification', async () => {
    let resolveCheck!: () => void;
    const check = vi.fn(() => new Promise<void>((resolve) => (resolveCheck = resolve)));
    const revalidate = createSessionRevalidator(check);

    const first = revalidate(0);
    const second = revalidate(0);
    const third = revalidate(0);
    resolveCheck();
    await Promise.all([first, second, third]);

    expect(check).toHaveBeenCalledTimes(1);
  });

  it('throttle : pas de nouvelle vérification avant l\'intervalle minimal, puis oui', async () => {
    let now = 1_000_000;
    const check = vi.fn().mockResolvedValue(undefined);
    const revalidate = createSessionRevalidator(check, () => now);

    await revalidate(30_000);
    now += 10_000;
    await revalidate(30_000);
    expect(check).toHaveBeenCalledTimes(1);

    now += 20_001;
    await revalidate(30_000);
    expect(check).toHaveBeenCalledTimes(2);
  });

  it('intervalle 0 = vérification immédiate (hors déduplication)', async () => {
    const check = vi.fn().mockResolvedValue(undefined);
    const revalidate = createSessionRevalidator(check, () => 5);

    await revalidate(0);
    await revalidate(0);

    expect(check).toHaveBeenCalledTimes(2);
  });

  it('markChecked évite une revalidation redondante juste après le bootstrap', async () => {
    let now = 0;
    const check = vi.fn().mockResolvedValue(undefined);
    const revalidate = createSessionRevalidator(check, () => now);

    revalidate.markChecked();
    now += 1_000;
    await revalidate(30_000);

    expect(check).not.toHaveBeenCalled();
  });

  it('une vérification qui échoue ne casse pas le revalidateur et libère la déduplication', async () => {
    const check = vi.fn().mockRejectedValueOnce(new Error('réseau')).mockResolvedValue(undefined);
    const revalidate = createSessionRevalidator(check, () => 0);

    await expect(revalidate(0)).resolves.toBeUndefined();
    await revalidate(0);

    expect(check).toHaveBeenCalledTimes(2);
  });
});

describe('signaux de session', () => {
  it('notifyUnauthorized prévient l\'abonné unique', () => {
    const listener = vi.fn();
    setUnauthorizedListener(listener);

    notifyUnauthorized();

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('requestSessionRevalidation (403) demande une revalidation à intervalle court, jamais une déconnexion', () => {
    const revalidate = vi.fn();
    const unauthorized = vi.fn();
    setRevalidateListener(revalidate);
    setUnauthorizedListener(unauthorized);

    requestSessionRevalidation();

    expect(revalidate).toHaveBeenCalledWith(5_000);
    expect(unauthorized).not.toHaveBeenCalled();
  });

  it('sans abonné : aucun effet, aucune erreur', () => {
    expect(() => {
      notifyUnauthorized();
      requestSessionRevalidation();
    }).not.toThrow();
  });
});

describe('retour à la destination après reconnexion (mémoire uniquement)', () => {
  it('mémorise une route interne et ne la rend qu\'une seule fois', () => {
    rememberReturnTo('/activite');

    expect(consumeReturnTo()).toBe('/activite');
    expect(consumeReturnTo()).toBeNull();
  });

  it('ignore les routes publiques, la racine et les destinations externes/protocole-relatif', () => {
    for (const path of ['/login', '/register', '/', '//evil.example', 'https://evil.example', '']) {
      rememberReturnTo(path);
      expect(consumeReturnTo()).toBeNull();
    }
  });
});
