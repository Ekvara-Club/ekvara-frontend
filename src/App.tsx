import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { navigateTo } from './utils/navigation';
import HomePage from './pages/HomePage';
import ActivityPage from './pages/ActivityPage';
import ExercisesPage from './pages/ExercisesPage';
import PassportPage from './pages/PassportPage';
import WeightPage from './pages/WeightPage';
import GoalsPage from './pages/GoalsPage';
import ProgressPage from './pages/ProgressPage';
import CompetitionPage from './pages/CompetitionPage';
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
  // accessibles ; connecté -> /login et /register renvoient vers l'accueil.
  useEffect(() => {
    if (loading) return;

    if (!user && !PUBLIC_PATHS.includes(pathname)) {
      navigateTo('/login', 'replace');
      return;
    }

    if (user && PUBLIC_PATHS.includes(pathname)) {
      navigateTo('/', 'replace');
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
