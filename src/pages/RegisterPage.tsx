import { useState, type FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { handleNavClick } from '../utils/navigation';
import AuthBrandPanel from '../components/auth/AuthBrandPanel';
import Button from '../components/ui/Button';

function RegisterPage() {
  const { register } = useAuth();

  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    // register() connecte automatiquement (le backend pose le cookie dès
    // l'inscription) : pas d'étape /auth/login supplémentaire.
    register({ email, password, nom, prenom })
      .catch((err: Error) => {
        console.error("Erreur d'inscription", err);
        setError(err.message || 'Impossible de créer le compte pour le moment.');
      })
      .finally(() => setSubmitting(false));
  }

  return (
    <div className="flex min-h-screen flex-col bg-ekvara-surface lg:flex-row">
      <AuthBrandPanel />

      <div className="flex flex-1 items-start justify-center px-4 py-12 lg:items-center">
        <div className="w-full max-w-sm">
          <h1 className="font-display text-2xl font-bold text-ekvara-black">Créer un compte</h1>
          <p className="mt-1 text-sm text-ekvara-muted">Rejoins Ekvara</p>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="register-prenom" className="text-sm font-medium text-ekvara-black">
                  Prénom
                </label>
                <input
                  id="register-prenom"
                  type="text"
                  value={prenom}
                  onChange={(event) => setPrenom(event.target.value)}
                  required
                  autoFocus
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="register-nom" className="text-sm font-medium text-ekvara-black">
                  Nom
                </label>
                <input
                  id="register-nom"
                  type="text"
                  value={nom}
                  onChange={(event) => setNom(event.target.value)}
                  required
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="register-email" className="text-sm font-medium text-ekvara-black">
                Email
              </label>
              <input
                id="register-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label htmlFor="register-password" className="text-sm font-medium text-ekvara-black">
                Mot de passe
              </label>
              <input
                id="register-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={8}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              <p className="mt-1 text-xs text-ekvara-muted">8 caractères minimum</p>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button type="submit" variant="primary" disabled={submitting} className="mt-2 w-full">
              {submitting ? 'Création...' : 'Créer mon compte'}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-ekvara-muted">
            Déjà un compte ?{' '}
            <a
              href="/login"
              onClick={(event) => handleNavClick(event, '/login')}
              className="font-medium text-ekvara-black hover:underline"
            >
              Se connecter
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
