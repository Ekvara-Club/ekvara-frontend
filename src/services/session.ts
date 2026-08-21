// Pont minimal entre les fonctions fetch (hors React) et AuthContext : quand
// une requête métier reçoit un 401, on prévient un unique abonné (AuthContext)
// plutôt que de dupliquer la détection dans chaque page/card.
type UnauthorizedListener = () => void;

let listener: UnauthorizedListener | null = null;

export function setUnauthorizedListener(fn: UnauthorizedListener | null): void {
  listener = fn;
}

export function notifyUnauthorized(): void {
  listener?.();
}
