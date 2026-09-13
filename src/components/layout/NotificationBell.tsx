import { useCallback, useEffect, useState } from 'react';
import {
  deepLinkFor,
  getNotifications,
  getUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../services/notifications.api';
import type { NotificationItem } from '../../types/notification';
import { navigateTo } from '../../utils/navigation';

// Pas de websocket (ticket "POLLING") : le compteur non lu est rafraîchi au
// montage, au retour de focus de l'onglet, et par un polling modéré (60 sec
// minimum imposé par le ticket) — jamais plus agressif.
const POLL_INTERVAL_MS = 60_000;

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `Il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return `Il y a ${days} j`;
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  // null = pas encore chargé (panel jamais ouvert) : distingue de [] (chargé, vide réellement).
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshUnreadCount = useCallback(() => {
    getUnreadCount()
      .then((res) => setUnreadCount(res.count))
      .catch(() => {
        // Échec silencieux : un compteur en arrière-plan ne doit jamais
        // afficher d'erreur, il reste simplement à sa dernière valeur connue.
      });
  }, []);

  useEffect(() => {
    refreshUnreadCount();

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') refreshUnreadCount();
    }
    document.addEventListener('visibilitychange', onVisibilityChange);
    const interval = window.setInterval(refreshUnreadCount, POLL_INTERVAL_MS);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.clearInterval(interval);
    };
  }, [refreshUnreadCount]);

  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  function loadNotifications() {
    setLoading(true);
    setError(null);
    getNotifications()
      .then((res) => setItems(res.items))
      .catch(() => setError('Impossible de charger les notifications.'))
      .finally(() => setLoading(false));
  }

  function togglePanel() {
    setIsOpen((open) => {
      const next = !open;
      if (next && items === null) loadNotifications();
      return next;
    });
  }

  function handleNotificationClick(notification: NotificationItem) {
    setIsOpen(false);
    if (!notification.isRead) {
      setItems((prev) => prev?.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)) ?? prev);
      setUnreadCount((count) => Math.max(0, count - 1));
      // Ticket : "Si mark read échoue : ne pas forcément bloquer navigation."
      markNotificationRead(notification.id).catch(() => {});
    }
    navigateTo(deepLinkFor(notification));
  }

  async function handleMarkAllRead() {
    setItems((prev) => prev?.map((n) => ({ ...n, isRead: true })) ?? prev);
    setUnreadCount(0);
    try {
      await markAllNotificationsRead();
    } catch {
      // Échec silencieux : un prochain chargement réel corrigera l'état local si besoin.
    }
  }

  const badgeLabel = unreadCount > 9 ? '9+' : String(unreadCount);
  const hasUnread = items?.some((n) => !n.isRead) ?? false;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={togglePanel}
        aria-label="Notifications"
        aria-haspopup="true"
        aria-expanded={isOpen}
        className={`relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-ekvara-black transition-colors hover:bg-gray-100 ${
          isOpen ? 'bg-gray-100' : ''
        }`}
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-ekvara-lime px-1 text-[10px] font-bold leading-none text-ekvara-black"
          >
            {badgeLabel}
          </span>
        )}
        <span className="sr-only">
          {unreadCount > 0 ? `${unreadCount} notification${unreadCount > 1 ? 's' : ''} non lue${unreadCount > 1 ? 's' : ''}` : 'Aucune notification non lue'}
        </span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          {/* Mobile : panneau quasi plein écran sous le header (ticket "MOBILE",
              jamais de débordement horizontal à 390px). Desktop (sm+) : dropdown
              ancré à la cloche, même pattern que le menu profil du Header. */}
          <div
            role="menu"
            aria-label="Notifications"
            className="fixed inset-x-4 top-20 z-50 max-h-[70vh] overflow-y-auto rounded-md border border-gray-200 bg-ekvara-surface shadow-sm sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-96"
          >
            <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
              <p className="font-display text-sm font-bold text-ekvara-black">Notifications</p>
              {hasUnread && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-xs font-medium text-ekvara-black/60 transition-colors hover:text-ekvara-black"
                >
                  Tout marquer comme lu
                </button>
              )}
            </div>

            {loading && <p className="px-4 py-6 text-center text-sm text-ekvara-muted">Chargement…</p>}

            {!loading && error && (
              <div className="px-4 py-6 text-center">
                <p className="text-sm text-ekvara-muted">{error}</p>
                <button
                  type="button"
                  onClick={loadNotifications}
                  className="mt-2 text-xs font-medium text-ekvara-black underline underline-offset-2"
                >
                  Réessayer
                </button>
              </div>
            )}

            {!loading && !error && items && items.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-ekvara-muted">Aucune notification pour le moment.</p>
            )}

            {!loading && !error && items && items.length > 0 && (
              <ul>
                {items.map((notification) => (
                  <li key={notification.id}>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => handleNotificationClick(notification)}
                      className={`block w-full border-b border-gray-50 px-4 py-3 text-left transition-colors hover:bg-gray-50 ${
                        notification.isRead ? 'border-l-2 border-l-transparent' : 'border-l-2 border-l-ekvara-lime bg-ekvara-lime/5'
                      }`}
                    >
                      <p className={`text-sm text-ekvara-black ${notification.isRead ? 'font-normal' : 'font-semibold'}`}>
                        {notification.title}
                        {!notification.isRead && <span className="sr-only"> (non lue)</span>}
                      </p>
                      {notification.message && <p className="mt-0.5 text-xs text-ekvara-muted">{notification.message}</p>}
                      <p className="mt-1 text-[11px] text-ekvara-muted">{timeAgo(notification.createdAt)}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default NotificationBell;
