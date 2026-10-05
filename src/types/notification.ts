// Types V1 câblés côté backend (voir NOTIFICATION_TYPES,
// notification.constants.ts). Traité comme une chaîne ouverte côté frontend
// (jamais un exhaustive switch qui casserait sur un type futur) — voir
// NotificationItem.tsx pour le fallback générique.
export type NotificationType =
  | 'TRAINING_ASSIGNED'
  | 'TRAINING_UPDATED'
  | 'TRAINING_CANCELLED'
  | 'EXERCISE_ASSIGNED'
  | 'GOAL_UPDATED'
  | 'WEIGHT_TARGET_UPDATED'
  | 'WT_PROFILE_LINK_CONFIRMED'
  | 'WT_PROFILE_LINK_REJECTED'
  | 'COMPETITION_UPDATED';

export type NotificationResourceType = 'TRAINING' | 'EXERCISE' | 'GOAL' | 'WEIGHT_TARGET' | 'COMPETITION' | 'WT_PROFILE';

export interface NotificationItem {
  id: string;
  actorUserId: string | null;
  type: NotificationType;
  title: string;
  message: string | null;
  resourceType: NotificationResourceType | null;
  resourceId: string | null;
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
}

export interface PaginatedNotifications {
  items: NotificationItem[];
  total: number;
  page: number;
  limit: number;
}

export interface UnreadCountResponse {
  count: number;
}
