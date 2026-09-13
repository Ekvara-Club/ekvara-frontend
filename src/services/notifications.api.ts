import type { NotificationItem, PaginatedNotifications, UnreadCountResponse } from '../types/notification';
import { notifyUnauthorized } from './session';

const API_URL = import.meta.env.VITE_API_URL;

// Même mécanisme que athletes.api.ts/exercises.api.ts : `credentials: 'include'`
// systématique et signalement centralisé (session.ts) d'un 401.
async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(`${API_URL}${path}`, { ...init, credentials: 'include' });
  if (response.status === 401) {
    notifyUnauthorized();
  }
  return response;
}

// context=ATHLETE systématique (ticket "NOTIFICATION CONTEXT") : ce frontend
// ne doit jamais afficher une notification rédigée pour l'interface coach,
// même sur un compte hybride athlète+coach.
const CONTEXT = 'ATHLETE';

export async function getNotifications(page = 1, limit = 20): Promise<PaginatedNotifications> {
  const response = await apiFetch(`/notifications?context=${CONTEXT}&page=${page}&limit=${limit}`);

  if (!response.ok) {
    throw new Error(`Impossible de récupérer les notifications (${response.status})`);
  }

  const data: PaginatedNotifications = await response.json();
  return data;
}

export async function getUnreadCount(): Promise<UnreadCountResponse> {
  const response = await apiFetch(`/notifications/unread-count?context=${CONTEXT}`);

  if (!response.ok) {
    throw new Error(`Impossible de récupérer le nombre de notifications non lues (${response.status})`);
  }

  const data: UnreadCountResponse = await response.json();
  return data;
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const response = await apiFetch(`/notifications/${notificationId}/read`, { method: 'PATCH' });

  if (!response.ok) {
    throw new Error(`Impossible de marquer la notification comme lue (${response.status})`);
  }
}

export async function markAllNotificationsRead(): Promise<{ updated: number }> {
  const response = await apiFetch(`/notifications/read-all?context=${CONTEXT}`, { method: 'PATCH' });

  if (!response.ok) {
    throw new Error(`Impossible de marquer les notifications comme lues (${response.status})`);
  }

  const data: { updated: number } = await response.json();
  return data;
}

// Deep link (ticket "DEEP LINKS ATHLETE") : aucune route de détail n'existe
// pour training/exercise/goal/weight-target — navigue vers la meilleure page
// parent existante. Seule COMPETITION a un vrai deep link (Ticket #10A).
export function deepLinkFor(notification: NotificationItem): string {
  switch (notification.resourceType) {
    case 'COMPETITION':
      return notification.resourceId ? `/competitions/${notification.resourceId}` : '/competitions';
    case 'TRAINING':
      return '/activite';
    case 'EXERCISE':
      return '/exercices';
    case 'GOAL':
      return '/objectifs';
    case 'WEIGHT_TARGET':
      return '/poids';
    default:
      return '/';
  }
}
