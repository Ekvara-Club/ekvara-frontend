// Pont minimal entre les fonctions fetch (hors React) et AuthContext : quand
// une requête métier reçoit un 401 (session expirée/absente) ou un 403
// (possible session remplacée), on prévient un unique abonné (AuthContext)
// plutôt que de dupliquer la détection dans chaque page/card.

// --- 401 : la session n'existe plus --------------------------------------
type UnauthorizedListener = () => void;

let unauthorizedListener: UnauthorizedListener | null = null;

export function setUnauthorizedListener(fn: UnauthorizedListener | null): void {
  unauthorizedListener = fn;
}

export function notifyUnauthorized(): void {
  unauthorizedListener?.();
}

// --- 403 : demande de revalidation, jamais une déconnexion ------------------
// Un 403 reste une erreur d'autorisation ordinaire pour l'appelant. On demande
// seulement à AuthContext de vérifier (GET /me) que la session est toujours
// celle attendue : c'est lui qui décide, jamais ce module.
export const FOCUS_REVALIDATE_MIN_INTERVAL_MS = 30_000;
export const FORBIDDEN_REVALIDATE_MIN_INTERVAL_MS = 5_000;

type RevalidateListener = (minIntervalMs: number) => void;

let revalidateListener: RevalidateListener | null = null;

export function setRevalidateListener(fn: RevalidateListener | null): void {
  revalidateListener = fn;
}

export function requestSessionRevalidation(): void {
  revalidateListener?.(FORBIDDEN_REVALIDATE_MIN_INTERVAL_MS);
}

// Vérification de session dédupliquée (une seule en vol) et throttlée (pas de
// bombardement de /me à chaque focus ou rafale de 403). `minIntervalMs = 0`
// force une vérification hors throttle, jamais hors déduplication.
export interface SessionRevalidator {
  (minIntervalMs: number): Promise<void>;
  markChecked: () => void;
}

export function createSessionRevalidator(check: () => Promise<void>, now: () => number = Date.now): SessionRevalidator {
  let inFlight: Promise<void> | null = null;
  let lastCheckedAt = -Infinity;

  const revalidate = ((minIntervalMs: number): Promise<void> => {
    if (inFlight) return inFlight;
    if (now() - lastCheckedAt < minIntervalMs) return Promise.resolve();

    lastCheckedAt = now();
    inFlight = check()
      .catch(() => {
        // Une vérification en échec (réseau) ne doit jamais déconnecter ni casser l'app.
      })
      .finally(() => {
        inFlight = null;
      });
    return inFlight;
  }) as SessionRevalidator;

  revalidate.markChecked = () => {
    lastCheckedAt = now();
  };

  return revalidate;
}

// --- Retour à la destination après reconnexion (mémoire uniquement) -----------
// Uniquement une route interne de l'app : jamais une URL externe ni une route
// publique. Aucun stockage persistant (ni token, ni destination).
const NON_RETURNABLE_PATHS = ['/', '/login', '/register'];

let returnTo: string | null = null;

export function rememberReturnTo(path: string): void {
  const isInternalRoute = path.startsWith('/') && !path.startsWith('//');
  returnTo = isInternalRoute && !NON_RETURNABLE_PATHS.includes(path) ? path : null;
}

export function consumeReturnTo(): string | null {
  const path = returnTo;
  returnTo = null;
  return path;
}
