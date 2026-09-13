import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { handleNavClick } from '../../utils/navigation';
import NotificationBell from './NotificationBell';

const PASSPORT_HREF = '/passeport';

interface NavItem {
  label: string;
  href: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Accueil', href: '/' },
  { label: 'Activité', href: '/activite' },
  { label: 'Compétitions', href: '/competitions' },
  { label: 'Exercices', href: '/exercices' },
];

// Routes déjà existantes (App.tsx) : uniquement réutilisées ici, aucune
// nouvelle route créée.
const SECONDARY_NAV_ITEMS: NavItem[] = [
  { label: 'Poids', href: '/poids' },
  { label: 'Progression', href: '/progression' },
  { label: 'Objectifs', href: '/objectifs' },
];

function Header() {
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // Même pattern que App.tsx (popstate) : aucune dépendance de routing
  // ajoutée, uniquement pour déterminer l'état actif de la nav principale.
  const [pathname, setPathname] = useState(window.location.pathname);

  useEffect(() => {
    const onPopState = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Fermeture au clavier (Escape) en plus du clic extérieur déjà existant —
  // n'entre en jeu que si le menu est ouvert.
  useEffect(() => {
    if (!isMenuOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsMenuOpen(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isMenuOpen]);

  function handleLogout() {
    setIsMenuOpen(false);
    // Le backend reçoit réellement /auth/logout : on ne se contente pas de
    // vider le state React. App.tsx redirige vers /login dès que
    // AuthContext.user devient null.
    logout().catch((error: Error) => {
      console.error('Erreur lors de la déconnexion', error);
    });
  }

  function closeAndNavigate(event: Parameters<typeof handleNavClick>[0], href: string) {
    setIsMenuOpen(false);
    handleNavClick(event, href);
  }

  const initial = user?.prenom?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || '?';
  const fullName = user ? [user.prenom, user.nom].filter(Boolean).join(' ') : '';
  const identityLabel = fullName || user?.email || '';

  return (
    <header className="border-b border-gray-200 bg-ekvara-surface">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-4 sm:px-6">
        <span className="font-display text-xl font-extrabold tracking-tight text-ekvara-black">
          EKVARA
        </span>

        {/* flex-wrap + gap-x-4/gap-y-1 (ticket "Compétitions Athlete V2" §3/§33) :
            un 4e item ("Compétitions") allonge la nav — plutôt que de risquer
            un débordement/troncature sur 390px, la nav peut se replier sur
            deux lignes centrées sans jamais couper un libellé. */}
        <nav className="order-3 flex w-full flex-wrap items-center justify-center gap-x-4 gap-y-1 sm:order-2 sm:w-auto sm:flex-nowrap sm:gap-6">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <a
                key={item.label}
                href={item.href}
                onClick={(event) => handleNavClick(event, item.href)}
                aria-current={isActive ? 'page' : undefined}
                className={`border-b pb-0.5 text-sm transition-colors ${
                  isActive
                    ? 'border-ekvara-black font-semibold text-ekvara-black'
                    : 'border-transparent font-medium text-ekvara-black/60 hover:text-ekvara-black'
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        <div className="order-2 flex items-center gap-1 sm:order-3">
          <NotificationBell />

          <div className="relative">
            <button
              type="button"
              onClick={() => setIsMenuOpen((open) => !open)}
              aria-label="Profil utilisateur"
              aria-haspopup="true"
              aria-expanded={isMenuOpen}
              className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-ekvara-black text-sm font-semibold text-ekvara-surface transition-shadow ${
                isMenuOpen ? 'ring-2 ring-ekvara-black/20 ring-offset-2 ring-offset-ekvara-surface' : ''
              }`}
            >
              {initial}
            </button>

            {isMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />
                <div
                  role="menu"
                  className="absolute right-0 z-50 mt-2 w-56 rounded-md border border-gray-200 bg-ekvara-surface py-2 shadow-sm"
                >
                  {identityLabel && (
                    <div className="px-3 py-2.5">
                      <p className="font-display text-sm font-bold text-ekvara-black">{identityLabel}</p>
                      {fullName && user?.email && (
                        <p className="mt-0.5 truncate text-xs text-ekvara-muted">{user.email}</p>
                      )}
                    </div>
                  )}

                  <div className="border-t border-gray-100" />

                  <a
                    href={PASSPORT_HREF}
                    onClick={(event) => closeAndNavigate(event, PASSPORT_HREF)}
                    role="menuitem"
                    className="block px-3 py-2 text-sm text-ekvara-black hover:bg-gray-50"
                  >
                    Mon passeport sportif →
                  </a>

                  <div className="border-t border-gray-100" />

                  {SECONDARY_NAV_ITEMS.map((item) => (
                    <a
                      key={item.href}
                      href={item.href}
                      onClick={(event) => closeAndNavigate(event, item.href)}
                      role="menuitem"
                      className="block px-3 py-2 text-sm text-ekvara-black/80 hover:bg-gray-50 hover:text-ekvara-black"
                    >
                      {item.label}
                    </a>
                  ))}

                  <div className="border-t border-gray-100" />

                  <button
                    type="button"
                    onClick={handleLogout}
                    role="menuitem"
                    className="block w-full px-3 py-2 text-left text-sm text-ekvara-black hover:bg-gray-50"
                  >
                    Déconnexion
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
