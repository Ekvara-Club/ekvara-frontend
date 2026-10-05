import { useState, type FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { handleNavClick } from '../utils/navigation';
import AuthBrandPanel from '../components/auth/AuthBrandPanel';
import Button from '../components/ui/Button';
import { LegalLinks } from './legal/LegalPages';

function LoginPage() {
  const { login, sessionNotice } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    // Le backend renvoie volontairement le même message pour "utilisateur
    // absent" et "mauvais mot de passe" : on ne cherche pas à les distinguer.
    login({ email, password })
      .catch((err: Error) => {
        console.error('Erreur de connexion', err);
        setError(err.message || 'Impossible de se connecter pour le moment.');
      })
      .finally(() => setSubmitting(false));
  }

  return (
    <div className="flex min-h-screen flex-col bg-ekvara-surface lg:flex-row">
      <AuthBrandPanel />

      <div className="flex flex-1 items-start justify-center px-4 py-12 lg:items-center">
        <div className="w-full max-w-sm">
          <h1 className="font-display text-2xl font-bold text-ekvara-black">Se connecter</h1>
          <p className="mt-1 text-sm text-ekvara-muted">Accède à ton espace Ekvara</p>

          {/* Session perdue (expirée, fermée ailleurs) : on l'explique ici au
              lieu de laisser l'utilisateur deviner pourquoi il est déconnecté. */}
          {sessionNotice && (
            <p role="status" className="mt-4 rounded-md bg-gray-100 px-3 py-2 text-sm text-ekvara-black">
              {sessionNotice}
            </p>
          )}

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
            <div>
              <label htmlFor="login-email" className="text-sm font-medium text-ekvara-black">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoFocus
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="text-sm font-medium text-ekvara-black">
                Mot de passe
              </label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button type="submit" variant="primary" disabled={submitting} className="mt-2 w-full">
              {submitting ? 'Connexion...' : 'Se connecter'}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-ekvara-muted">
            Pas encore de compte ?{' '}
            <a
              href="/register"
              onClick={(event) => handleNavClick(event, '/register')}
              className="font-medium text-ekvara-black hover:underline"
            >
              Créer un compte
            </a>
          </p>
          <LegalLinks className="mt-6 text-center" />
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
