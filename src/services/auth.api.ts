import type {
  AuthMeResponse,
  LoginPayload,
  RegisterPayload,
  ValidateInvitationResult,
} from '../types/auth';
import { API_URL, withAppContext } from './apiClient';

// Le JWT est dans un cookie HttpOnly : jamais lu ni stocké en JavaScript.
// withAppContext ajoute `credentials: 'include'` (envoi/réception du cookie
// cross-origin, 5173 -> 3000 en dev) et X-Ekvara-App (cookie de session
// athlète). Ces appels n'utilisent volontairement PAS apiFetch : un 401 de
// login/me est un état normal (mauvais mot de passe, pas encore connecté), pas
// une session expirée à signaler.
function authFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_URL}${path}`, withAppContext(init));
}

const JSON_POST: RequestInit = { method: 'POST', headers: { 'Content-Type': 'application/json' } };

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const body = await response.json();
    if (typeof body?.message === 'string') return body.message;
  } catch {
    // corps non-JSON ou vide : on retombe sur le message générique ci-dessous
  }
  return `Une erreur est survenue (${response.status})`;
}

export async function register(payload: RegisterPayload): Promise<AuthMeResponse> {
  const response = await authFetch('/auth/register', { ...JSON_POST, body: JSON.stringify(payload) });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }

  return response.json();
}

// Les messages d'erreur backend (code invalide/expiré/utilisé/révoqué) sont
// déjà le texte final destiné à l'athlète (voir InvitationsService côté
// backend) : contrairement à d'autres endpoints, pas besoin de les remapper
// ici par code HTTP, `err.message` peut être affiché tel quel.
export async function validateInvitationCode(code: string): Promise<ValidateInvitationResult> {
  const response = await authFetch('/auth/invitations/validate', { ...JSON_POST, body: JSON.stringify({ code }) });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }

  return response.json();
}

// null = login réussi mais compte SANS profil athlète (ex. coach-only) : le
// backend renvoie alors un corps vide (NestJS n'émet pas le littéral `null`),
// jamais du JSON — response.json() planterait. Le cookie athlète a néanmoins
// été posé : l'appelant (AuthContext) doit le refermer via logout().
export async function login(payload: LoginPayload): Promise<AuthMeResponse | null> {
  const response = await authFetch('/auth/login', { ...JSON_POST, body: JSON.stringify(payload) });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }

  const text = await response.text();
  return text ? (JSON.parse(text) as AuthMeResponse) : null;
}

// N'efface que la session athlète (le backend cible le cookie du contexte) :
// une session coach ouverte dans l'autre app n'est pas touchée.
export async function logout(): Promise<void> {
  await authFetch('/auth/logout', { method: 'POST' });
}

// null pour un 401 : au démarrage de l'app, "pas encore connecté" est un état
// métier normal, pas une erreur à afficher.
export async function getMe(): Promise<AuthMeResponse | null> {
  const response = await authFetch('/auth/me');

  if (response.status === 401) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Impossible de récupérer la session (${response.status})`);
  }

  return response.json();
}
