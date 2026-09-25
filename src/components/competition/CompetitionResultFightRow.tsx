import type { CompetitionResultFight, WtAthleteSummary } from '../../types/international';
import { handleNavClick } from '../../utils/navigation';

interface CompetitionResultFightRowProps {
  fight: CompetitionResultFight;
}

// Une ligne d'athlète du combat : nom (lien vers son profil WT public), NOC,
// score. Le vainqueur est désigné par le backend (winnerSide, issu du
// vainqueur enregistré) — jamais par comparaison des scores ; le perdant
// n'est jamais barré, seulement moins appuyé.
function AthleteLine({
  athlete,
  score,
  isWinner,
  hasWinner,
}: {
  athlete: WtAthleteSummary;
  score: number | null;
  isWinner: boolean;
  hasWinner: boolean;
}) {
  const href = `/athletes-wt/${athlete.id}`;
  const emphasis = !hasWinner || isWinner;

  return (
    <div className="flex items-baseline gap-3">
      <span
        className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 self-start rounded-full ${isWinner ? 'bg-ekvara-lime ring-1 ring-ekvara-black/20' : 'bg-transparent'}`}
        aria-hidden="true"
      />
      <p className="min-w-0 flex-1">
        <a
          href={href}
          onClick={(event) => handleNavClick(event, href)}
          className={`break-words underline-offset-2 hover:underline ${
            isWinner ? 'font-semibold text-ekvara-black' : emphasis ? 'font-medium text-ekvara-black' : 'text-ekvara-black/60'
          }`}
        >
          {athlete.displayName}
        </a>
        {athlete.countryCode && (
          <span className="ml-1.5 text-xs font-semibold text-ekvara-black/55">{athlete.countryCode}</span>
        )}
        {isWinner && <span className="sr-only"> (vainqueur)</span>}
      </p>
      <span
        className={`w-6 flex-shrink-0 text-right font-display text-lg leading-none ${
          isWinner ? 'font-extrabold text-ekvara-black' : 'font-semibold text-ekvara-black/45'
        }`}
      >
        {score ?? '–'}
      </span>
    </div>
  );
}

// Combat logique d'une compétition (une ligne même si la source l'a publié
// plusieurs fois) : les deux athlètes dans l'ordre publié, scores tels que
// stockés, méthode si connue.
function CompetitionResultFightRow({ fight }: CompetitionResultFightRowProps) {
  const hasWinner = fight.winnerSide !== null;

  return (
    <li className="border-t border-gray-100 py-3">
      <div className="space-y-1.5">
        <AthleteLine athlete={fight.athleteA} score={fight.scoreA} isWinner={fight.winnerSide === 'A'} hasWinner={hasWinner} />
        <AthleteLine athlete={fight.athleteB} score={fight.scoreB} isWinner={fight.winnerSide === 'B'} hasWinner={hasWinner} />
      </div>
      <p className="mt-1.5 pl-[1.125rem] text-[11px] font-semibold uppercase tracking-wide text-ekvara-black/45">
        {[fight.method, fight.winnerSide === null ? 'Vainqueur non renseigné' : null].filter(Boolean).join(' · ') || ' '}
      </p>
    </li>
  );
}

export default CompetitionResultFightRow;
