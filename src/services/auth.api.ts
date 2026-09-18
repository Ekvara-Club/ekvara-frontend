import type {
  AuthMeResponse,
  LoginPayload,
  RegisterPayload,
  ValidateInvitationResult,
} from '../types/auth';

const API_URL = import.meta.env.VITE_API_URL;

// Le JWT est dans un cookie HttpOnly : jamais lu ni stocké en JavaScript.
// `credentials: 'include'` est indispensable pour que le navigateur envoie /
// accepte ce cookie sur les requêtes cross-origin (5173 -> 3000 en dev).
const AUTH_FETCH_OPTIONS: RequestInit = { credentials: 'include' };

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
  const response = await fetch(`${API_URL}/auth/register`, {
    ...AUTH_FETCH_OPTIONS,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

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
  const response = await fetch(`${API_URL}/auth/invitations/validate`, {
    ...AUTH_FETCH_OPTIONS,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }

  return response.json();
}

export async function login(payload: LoginPayload): Promise<AuthMeResponse> {
  const response = await fetch(`${API_URL}/auth/login`, {
    ...AUTH_FETCH_OPTIONS,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }

  return response.json();
}

export async function logout(): Promise<void> {
  await fetch(`${API_URL}/auth/logout`, { ...AUTH_FETCH_OPTIONS, method: 'POST' });
}

// null pour un 401 : au démarrage de l'app, "pas encore connecté" est un état
// métier normal, pas une erreur à afficher.
export async function getMe(): Promise<AuthMeResponse | null> {
  const response = await fetch(`${API_URL}/auth/me`, AUTH_FETCH_OPTIONS);

  if (response.status === 401) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Impossible de récupérer la session (${response.status})`);
  }

  return response.json();
}
