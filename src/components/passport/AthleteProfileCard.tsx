import type { AuthMeResponse, AuthUser } from '../../types/auth';

interface AthleteProfileCardProps {
  user: AuthUser;
  athlete: AuthMeResponse;
}

// Pièce dominante du Passeport (§10) : traitement noir, comme la hero
// CompetitionCard du dashboard — l'identité de l'athlète est la donnée la
// plus importante de cette page. Aucun fetch : entièrement dérivé de
// useAuth(), déjà chargé au démarrage de l'app. Chaque ligne n'apparaît que
// si la donnée existe réellement (jamais de null/undefined affiché).
function AthleteProfileCard({ user, athlete }: AthleteProfileCardProps) {
  const fullName = [user.prenom, user.nom].filter(Boolean).join(' ');
  const clubLocation = athlete.club ? [athlete.club.ville, athlete.club.pays].filter(Boolean).join(', ') : null;
  const details = [athlete.grade, athlete.categorie_age, athlete.niveau_sportif, athlete.genre].filter(
    (value): value is string => Boolean(value),
  );

  return (
    <div className="rounded-lg bg-ekvara-black p-6 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-wide text-white/40">Passeport sportif</p>

      {fullName && (
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          {fullName}
        </h1>
      )}

      {athlete.club && (
        <p className="mt-2 text-sm text-white/60">
          {athlete.club.nom}
          {clubLocation && ` — ${clubLocation}`}
        </p>
      )}

      {details.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {details.map((detail) => (
            <span
              key={detail}
              className="rounded-full border border-white/15 px-2.5 py-1 text-xs font-medium capitalize text-white/80"
            >
              {detail}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default AthleteProfileCard;
