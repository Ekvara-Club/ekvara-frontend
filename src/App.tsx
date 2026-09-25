import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { consumeReturnTo, rememberReturnTo } from './services/session';
import { navigateTo } from './utils/navigation';
import HomePage from './pages/HomePage';
import ActivityPage from './pages/ActivityPage';
import ExercisesPage from './pages/ExercisesPage';
import PassportPage from './pages/PassportPage';
import WeightPage from './pages/WeightPage';
import GoalsPage from './pages/GoalsPage';
import ProgressPage from './pages/ProgressPage';
import CompetitionPage from './pages/CompetitionPage';
import CompetitionsPage from './pages/CompetitionsPage';
import WtAthletesPage from './pages/WtAthletesPage';
import WtAthletePage from './pages/WtAthletePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

const PUBLIC_PATHS = ['/login', '/register'];

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
    if (loading) return;

    if (!user && !PUBLIC_PATHS.includes(pathname)) {
      rememberReturnTo(pathname);
      navigateTo('/login', 'replace');
      return;
    }

    if (user && PUBLIC_PATHS.includes(pathname)) {
      navigateTo(consumeReturnTo() ?? '/', 'replace');
    }
  }, [user, loading, pathname]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ekvara-surface">
        <p className="text-sm text-ekvara-muted">Chargement...</p>
      </div>
    );
  }

  if (!user) {
    return pathname === '/register' ? <RegisterPage /> : <LoginPage />;
  }

  // key = id de l'athlète courant : si la session est remplacée par un autre
  // compte, toutes les pages sont remontées et ne gardent aucune donnée de
  // l'ancien (sans jamais recharger la fenêtre).
  return <ProtectedRoutes key={user.id} pathname={pathname} />;
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
