import { notifyUnauthorized, requestSessionRevalidation } from './session';

export const API_URL = import.meta.env.VITE_API_URL;

// Sélectionne la session (cookie HttpOnly) de CETTE application : le backend
// tient une session par app (athlète / coach) pour que se connecter dans l'une
// ne remplace jamais l'autre. L'en-tête ne donne aucun droit, l'autorisation
// reste décidée par le backend à partir du JWT.
export const APP_CONTEXT_HEADER = 'X-Ekvara-App';
export const APP_CONTEXT = 'athlete';

// `credentials: 'include'` : le JWT vit dans un cookie HttpOnly, jamais lu ni
// stocké en JavaScript, mais le navigateur doit l'envoyer cross-origin.
export function withAppContext(init: RequestInit = {}): RequestInit {
  const headers = new Headers(init.headers);
  headers.set(APP_CONTEXT_HEADER, APP_CONTEXT);
  return { ...init, headers, credentials: 'include' };
}

// Point d'entrée UNIQUE des requêtes métier (athletes, exercises,
// notifications) :
//   401 -> session invalide/expirée : AuthContext nettoie l'état et l'app
//          retourne à /login.
//   403 -> authentifié mais refusé : reste une erreur pour l'appelant (jamais
//          transformée en succès, jamais de déconnexion automatique) ; on
//          demande seulement à AuthContext de vérifier que la session est
//          toujours celle attendue.
// Aucun retry, aucun rechargement de page.
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(`${API_URL}${path}`, withAppContext(init));
  if (response.status === 401) {
    notifyUnauthorized();
  } else if (response.status === 403) {
    requestSessionRevalidation();
  }
  return response;
}
