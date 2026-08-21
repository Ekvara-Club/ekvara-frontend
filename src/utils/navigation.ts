import type { MouseEvent } from 'react';

// Navigation SPA minimale sans dépendance ajoutée (pas de react-router-dom).
// `dispatchEvent(popstate)` prévient les listeners existants (App.tsx) du
// changement d'URL, y compris pour une navigation programmatique (redirection
// d'auth), pas seulement pour un clic utilisateur.
export function navigateTo(path: string, mode: 'push' | 'replace' = 'push'): void {
  if (window.location.pathname === path) return;
  if (mode === 'push') {
    window.history.pushState({}, '', path);
  } else {
    window.history.replaceState({}, '', path);
  }
  window.dispatchEvent(new PopStateEvent('popstate'));
}

// Intercepte le clic sur un <a href> interne pour naviguer sans recharger la
// page, tout en gardant un vrai lien (ouverture nouvel onglet, clic
// milieu/ctrl+clic préservés).
export function handleNavClick(event: MouseEvent<HTMLAnchorElement>, href: string): void {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) {
    return;
  }
  event.preventDefault();
  navigateTo(href, 'push');
}
