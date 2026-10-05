import { lazy, Suspense, useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { consumeReturnTo, rememberReturnTo } from './services/session';
import { navigateTo } from './utils/navigation';
import PageErrorBoundary from './components/layout/PageErrorBoundary';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import { LegalNoticePage, PrivacyPolicyPage } from './pages/legal/LegalPages';

// Pages d'entrée (accueil, login, register) dans le bundle initial ; les
// autres ne sont téléchargées qu'à la première visite (Recharts n'est ainsi
// chargé que par Poids et Progression).
const ActivityPage = lazy(() => import('./pages/ActivityPage'));
const ExercisesPage = lazy(() => import('./pages/ExercisesPage'));
const PassportPage = lazy(() => import('./pages/PassportPage'));
const WeightPage = lazy(() => import('./pages/WeightPage'));
const GoalsPage = lazy(() => import('./pages/GoalsPage'));
const ProgressPage = lazy(() => import('./pages/ProgressPage'));
const CompetitionPage = lazy(() => import('./pages/CompetitionPage'));
const CompetitionsPage = lazy(() => import('./pages/CompetitionsPage'));
const WtAthletesPage = lazy(() => import('./pages/WtAthletesPage'));
const WtAthletePage = lazy(() => import('./pages/WtAthletePage'));

const PUBLIC_PATHS = ['/login', '/register'];
// Pages légales : lisibles connecté ou non, jamais de redirection.
const LEGAL_PATHS = ['/confidentialite', '/mentions-legales'];

function AppRoutes() {
  const [pathname, setPathname] = useState(window.location.pathname);
  const { user, loading } = useAuth();

  useEffect(() => {
    const onPopState = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Garde de routes : non connecté -> seuls /login et /register sont
  // accessibles ; connecté -> /login et /register renvoient vers l'accueil (ou
  // vers la page qui était demandée avant la perte de session).
  useEffect(() => {
    if (loading || LEGAL_PATHS.includes(pathname)) return;

    if (!user && !PUBLIC_PATHS.includes(pathname)) {
      rememberReturnTo(pathname);
      navigateTo('/login', 'replace');
      return;
    }

    if (user && PUBLIC_PATHS.includes(pathname)) {
      navigateTo(consumeReturnTo() ?? '/', 'replace');
    }
  }, [user, loading, pathname]);

  if (pathname === '/confidentialite') return <PrivacyPolicyPage />;
  if (pathname === '/mentions-legales') return <LegalNoticePage />;

  if (loading) {
    return <FullPageLoading />;
  }

  if (!user) {
    return pathname === '/register' ? <RegisterPage /> : <LoginPage />;
  }

  // key = id de l'athlète courant : si la session est remplacée par un autre
  // compte, toutes les pages sont remontées et ne gardent aucune donnée de
  // l'ancien (sans jamais recharger la fenêtre).
  return (
    <PageErrorBoundary resetKey={pathname}>
      <Suspense fallback={<FullPageLoading />}>
        <ProtectedRoutes key={user.id} pathname={pathname} />
      </Suspense>
    </PageErrorBoundary>
  );
}

function FullPageLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ekvara-surface">
      <p className="text-sm text-ekvara-muted">Chargement...</p>
    </div>
  );
}

function ProtectedRoutes({ pathname }: { pathname: string }) {
  if (pathname === '/activite') {
    return <ActivityPage />;
  }

  if (pathname === '/exercices') {
    return <ExercisesPage />;
  }

  if (pathname === '/passeport') {
    return <PassportPage />;
  }

  if (pathname === '/poids') {
    return <WeightPage />;
  }

  if (pathname === '/objectifs') {
    return <GoalsPage />;
  }

  if (pathname === '/progression') {
    return <ProgressPage />;
  }

  if (pathname === '/competitions') {
    return <CompetitionsPage />;
  }

  // Athlètes publics World Taekwondo (external_athlete) : routes distinctes de
  // tout profil athlète EKVARA. key = id : naviguer d'un adversaire à l'autre
  // remonte la page (aucune donnée du profil précédent conservée).
  if (pathname === '/athletes-wt') {
    return <WtAthletesPage />;
  }

  const wtAthleteMatch = pathname.match(/^\/athletes-wt\/([^/]+)$/);
  if (wtAthleteMatch) {
    return <WtAthletePage key={wtAthleteMatch[1]} athleteId={wtAthleteMatch[1]} />;
  }

  const competitionMatch = pathname.match(/^\/competitions\/([^/]+)$/);
  if (competitionMatch) {
    return <CompetitionPage competitionId={competitionMatch[1]} />;
  }

  return <HomePage />;
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
