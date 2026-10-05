import type { ReactNode } from 'react';
import { handleNavClick } from '../../utils/navigation';

// Pages légales publiques (accessibles connecté ou non). PROJETS DE TEXTE à
// faire relire (juriste / fédération) avant l'ouverture à de vrais
// utilisateurs. Toute modification de la politique impose d'incrémenter
// PRIVACY_POLICY_VERSION côté backend (src/privacy/privacy-policy.ts).
export const PRIVACY_POLICY_VERSION = '2026-10-06';
const CONTACT_EMAIL = 'kaisdilmi2003@gmail.com';

function LegalLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-ekvara-surface">
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <a href="/" onClick={(event) => handleNavClick(event, '/')} className="font-display text-xl font-extrabold text-ekvara-black">
          EKVARA
        </a>
        <h1 className="mt-8 font-display text-3xl font-extrabold tracking-tight text-ekvara-black">{title}</h1>
        <div className="mt-6 space-y-6 text-sm leading-relaxed text-ekvara-black/80 [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-ekvara-black [&_li]:ml-5 [&_li]:list-disc">
          {children}
        </div>
      </main>
    </div>
  );
}

export function PrivacyPolicyPage() {
  return (
    <LegalLayout title="Politique de confidentialité">
      <p>Version du {new Date(PRIVACY_POLICY_VERSION).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}.</p>

      <h2>Qui est responsable de tes données ?</h2>
      <p>
        EKVARA est éditée par Kaïs Dilmi, à titre personnel. Pour toute question ou demande sur tes données :{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} className="underline">{CONTACT_EMAIL}</a>.
      </p>

      <h2>Quelles données sont collectées ?</h2>
      <ul>
        <li>Identité : nom, prénom, adresse e-mail, club, catégorie, grade.</li>
        <li>Données sportives : séances, compétitions et résultats, objectifs, mesures de capacités.</li>
        <li>
          Données de santé : poids et état de forme (actif, malade, blessé, absent), avec une précision et une date de retour
          si tu les indiques. Elles ne sont collectées qu'avec ton accord explicite, donné à l'inscription.
        </li>
        <li>Profil World Taekwondo : uniquement si tu le relies toi-même et que ton coach le confirme (données publiques).</li>
      </ul>

      <h2>Pourquoi et sur quelle base ?</h2>
      <p>
        Pour te permettre de suivre ta préparation et de la partager avec ton ou tes coachs. Base légale : ton consentement
        (en particulier pour les données de santé, article 9 du RGPD) et l'utilisation du service que tu as demandée.
        Aucune publicité, aucune revente, aucun profilage commercial.
      </p>

      <h2>Qui y a accès ?</h2>
      <p>
        Toi, et les coachs de ton club qui te suivent dans EKVARA. Personne d'autre. Les données sont hébergées sur un
        serveur personnel situé en France ; le trafic passe par Cloudflare (sécurisation de la connexion HTTPS), qui peut
        traiter des données techniques de connexion.
      </p>

      <h2>Combien de temps ?</h2>
      <p>
        Tant que ton compte existe. Si tu le supprimes, tes données sont effacées immédiatement ; les sauvegardes de
        sécurité qui pourraient encore les contenir sont détruites au plus tard 14 jours après.
      </p>

      <h2>Mineurs</h2>
      <p>
        Si tu as moins de 15 ans, ton inscription nécessite l'accord de ton représentant légal (parent ou tuteur), qui
        peut exercer les droits ci-dessous en ton nom.
      </p>

      <h2>Tes droits</h2>
      <ul>
        <li>Accès et portabilité : bouton « Télécharger mes données » dans ton Passeport.</li>
        <li>Effacement : bouton « Supprimer mon compte » dans ton Passeport.</li>
        <li>Rectification : depuis l'application ou par e-mail.</li>
        <li>Retrait du consentement : supprimer ton compte, ou nous écrire.</li>
        <li>
          Réclamation : tu peux saisir la CNIL (<a href="https://www.cnil.fr" className="underline">cnil.fr</a>).
        </li>
      </ul>

      <h2>Cookies</h2>
      <p>
        EKVARA n'utilise qu'un cookie technique de session, indispensable pour rester connecté. Aucun cookie publicitaire
        ni de mesure d'audience.
      </p>

      <h2>Sécurité</h2>
      <p>Connexion chiffrée (HTTPS), mots de passe stockés sous forme chiffrée (argon2), accès limité à ton club.</p>
    </LegalLayout>
  );
}

export function LegalNoticePage() {
  return (
    <LegalLayout title="Mentions légales">
      <h2>Éditeur</h2>
      <p>
        Kaïs Dilmi, particulier. Contact : <a href={`mailto:${CONTACT_EMAIL}`} className="underline">{CONTACT_EMAIL}</a>.
        Directeur de la publication : Kaïs Dilmi.
      </p>
      <h2>Hébergement</h2>
      <p>
        Application auto-hébergée par l'éditeur sur un serveur situé en France (coordonnées communiquées sur demande à
        l'adresse ci-dessus). Connexion sécurisée par Cloudflare, Inc., 101 Townsend St, San Francisco, CA 94107, États-Unis.
      </p>
      <h2>Données personnelles</h2>
      <p>
        Voir la{' '}
        <a href="/confidentialite" onClick={(event) => handleNavClick(event, '/confidentialite')} className="underline">
          politique de confidentialité
        </a>
        .
      </p>
    </LegalLayout>
  );
}

// Liens discrets vers les pages légales (connexion, inscription, Passeport).
export function LegalLinks({ className = '' }: { className?: string }) {
  return (
    <p className={`text-xs text-ekvara-black/55 ${className}`}>
      <a href="/confidentialite" onClick={(event) => handleNavClick(event, '/confidentialite')} className="hover:underline">
        Confidentialité
      </a>
      {' · '}
      <a href="/mentions-legales" onClick={(event) => handleNavClick(event, '/mentions-legales')} className="hover:underline">
        Mentions légales
      </a>
    </p>
  );
}
