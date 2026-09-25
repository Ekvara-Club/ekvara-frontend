import type { WtAthleteFight } from '../../types/international';
import { handleNavClick } from '../../utils/navigation';
import { formatScore, formatStage, OUTCOME_LABELS } from '../../utils/wtFormat';

interface WtFightRowProps {
  fight: WtAthleteFight;
}

const OUTCOME_CLASSES: Record<WtAthleteFight['result']['outcome'], string> = {
  // Le lime reste réservé à la victoire, en petite étiquette (jamais une card).
  WIN: 'bg-ekvara-lime text-ekvara-black',
  LOSS: 'bg-ekvara-black/5 text-ekvara-black/70',
  UNKNOWN: 'text-ekvara-black/55',
};

// Ligne éditoriale d'un combat logique (un seul rendu même si WT Results l'a
// publié sous plusieurs identifiants) : résultat, tour, adversaire, score.
// Présentationnelle : le résultat vient du backend, jamais recalculé ici.
function WtFightRow({ fight }: WtFightRowProps) {
  const stage = formatStage(fight.stage);
  const score = formatScore(fight.result.athleteScore, fight.result.opponentScore);
  const opponentHref = `/athletes-wt/${fight.opponent.id}`;

  return (
    <li className="grid grid-cols-[6.25rem_minmax(0,1fr)_auto] items-start gap-x-3 py-3 sm:grid-cols-[8.5rem_minmax(0,1fr)_auto] sm:gap-x-6">
      <div>
        <span
          className={`inline-block rounded-sm px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${OUTCOME_CLASSES[fight.result.outcome]}`}
        >
          {OUTCOME_LABELS[fight.result.outcome]}
        </span>
        <p className="mt-1 text-[11px] font-semibold uppercase leading-snug tracking-wide text-ekvara-black/55">
          {stage ?? 'Tour —'}
        </p>
      </div>

      <div className="min-w-0">
        <p className="text-xs text-ekvara-black/45">contre</p>
        <a
          href={opponentHref}
          onClick={(event) => handleNavClick(event, opponentHref)}
          className="break-words font-medium text-ekvara-black underline-offset-2 hover:underline"
        >
          {fight.opponent.displayName}
        </a>
        {fight.opponent.countryCode && (
          <span className="ml-1.5 text-xs font-semibold text-ekvara-black/55">{fight.opponent.countryCode}</span>
        )}
      </div>

      <div className="text-right">
        <p className="whitespace-nowrap font-display text-lg font-bold leading-tight text-ekvara-black">
          {score ?? <span className="text-ekvara-muted">—</span>}
        </p>
        {fight.result.method && (
          <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-ekvara-black/55">
            {fight.result.method}
          </p>
        )}
      </div>
    </li>
  );
}

export default WtFightRow;
