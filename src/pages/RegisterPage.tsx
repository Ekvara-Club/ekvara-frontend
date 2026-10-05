import { useState, type FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { handleNavClick } from '../utils/navigation';
import { validateInvitationCode } from '../services/auth.api';
import AuthBrandPanel from '../components/auth/AuthBrandPanel';
import Button from '../components/ui/Button';
import { LegalLinks } from './legal/LegalPages';

// EKVARA n'est pas ouvert à l'inscription libre : un compte Athlete ne peut
// être créé qu'à partir d'un code d'invitation transmis par un coach (voir
// ticket "Clubs, invitations & inscription Athlete contrôlée V1"). Ce
// composant reste volontairement UN SEUL écran/formulaire de register (pas
// deux modèles Athlete différents) : seule une étape de saisie de code est
// ajoutée AVANT le formulaire existant, jamais un wizard à plusieurs pages.
function RegisterPage() {
  const { register } = useAuth();

  const [step, setStep] = useState<'code' | 'form'>('code');
  const [invitationCode, setInvitationCode] = useState('');
  const [clubName, setClubName] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [validatingCode, setValidatingCode] = useState(false);

  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  // RGPD : trois accords obligatoires, jamais pré-cochés.
  const [acceptPrivacyPolicy, setAcceptPrivacyPolicy] = useState(false);
  const [acceptHealthData, setAcceptHealthData] = useState(false);
  const [confirmAge, setConfirmAge] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleValidateCode(event: FormEvent) {
    event.preventDefault();
    setCodeError(null);
    setValidatingCode(true);

    validateInvitationCode(invitationCode)
      .then((result) => {
        setClubName(result.club.name);
        setStep('form');
      })
      .catch((err: Error) => {
        setCodeError(err.message || "Ce code d'invitation n'est pas valide.");
      })
      .finally(() => setValidatingCode(false));
  }

  function handleChangeCode() {
    setStep('code');
    setError(null);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    // Le code est REVALIDÉ par le backend au moment du register (avoir
    // appelé /auth/invitations/validate ne donne aucun droit) : on le
    // transmet tel quel, jamais un état "déjà validé" côté frontend.
    // register() connecte automatiquement (le backend pose le cookie dès
    // l'inscription) : pas d'étape /auth/login supplémentaire.
    register({
      invitationCode,
      email,
      password,
      nom,
      prenom,
      acceptPrivacyPolicy,
      acceptHealthData,
      confirmAgeOrParentalConsent: confirmAge,
    })
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
          {step === 'code' ? (
            <>
              <h1 className="font-display text-2xl font-bold text-ekvara-black">Rejoindre Ekvara</h1>
              <p className="mt-1 text-sm text-ekvara-muted">
                Entre le code d'invitation fourni par ton coach.
              </p>

              <form onSubmit={handleValidateCode} className="mt-6 flex flex-col gap-3">
                <div>
                  <label htmlFor="invitation-code" className="text-sm font-medium text-ekvara-black">
                    Code d'invitation
                  </label>
                  <input
                    id="invitation-code"
                    type="text"
                    value={invitationCode}
                    onChange={(event) => setInvitationCode(event.target.value)}
                    required
                    autoFocus
                    placeholder="EKV-XXXXXXXX"
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-display uppercase tracking-wide"
                  />
                </div>

                {codeError && <p className="text-sm text-red-600">{codeError}</p>}

                <Button type="submit" variant="primary" disabled={validatingCode} className="mt-2 w-full">
                  {validatingCode ? 'Vérification...' : 'Continuer'}
                </Button>
              </form>

              <p className="mt-4 text-center text-sm text-ekvara-muted">
                Tu n'as pas de code ? Demande une invitation à ton coach.
              </p>
            </>
          ) : (
            <>
              <h1 className="font-display text-2xl font-bold text-ekvara-black">{clubName}</h1>
              <p className="mt-1 text-sm text-ekvara-muted">Tu as été invité à rejoindre ce club.</p>

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

                <fieldset className="mt-1 flex flex-col gap-2.5 text-sm text-ekvara-black/80">
                  <legend className="sr-only">Accords obligatoires</legend>
                  <label className="flex items-start gap-2.5">
                    <input type="checkbox" required checked={acceptPrivacyPolicy} onChange={(event) => setAcceptPrivacyPolicy(event.target.checked)} className="mt-0.5 h-4 w-4 flex-shrink-0 accent-ekvara-black" />
                    <span>
                      J'accepte la{' '}
                      <a href="/confidentialite" target="_blank" rel="noopener noreferrer" className="font-medium text-ekvara-black underline">
                        politique de confidentialité
                      </a>
                      .
                    </span>
                  </label>
                  <label className="flex items-start gap-2.5">
                    <input type="checkbox" required checked={acceptHealthData} onChange={(event) => setAcceptHealthData(event.target.checked)} className="mt-0.5 h-4 w-4 flex-shrink-0 accent-ekvara-black" />
                    <span>J'accepte que mon poids et mon état de forme (données de santé) soient enregistrés et partagés avec mes coachs.</span>
                  </label>
                  <label className="flex items-start gap-2.5">
                    <input type="checkbox" required checked={confirmAge} onChange={(event) => setConfirmAge(event.target.checked)} className="mt-0.5 h-4 w-4 flex-shrink-0 accent-ekvara-black" />
                    <span>J'ai 15 ans ou plus, ou mon représentant légal a donné son accord.</span>
                  </label>
                </fieldset>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <Button type="submit" variant="primary" disabled={submitting} className="mt-2 w-full">
                  {submitting ? 'Création...' : 'Créer mon compte'}
                </Button>

                <button
                  type="button"
                  onClick={handleChangeCode}
                  className="text-center text-sm text-ekvara-muted hover:underline"
                >
                  Ce n'est pas ton club ? Changer de code
                </button>
              </form>
            </>
          )}

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
          <LegalLinks className="mt-6 text-center" />
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
