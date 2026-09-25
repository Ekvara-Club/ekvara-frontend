import type { WtCompetitionHistoryItem } from '../../types/international';
import { handleNavClick } from '../../utils/navigation';
import { formatCompetitionDates, formatCompetitionLocation, formatFightCount } from '../../utils/wtFormat';
import WtFightRow from './WtFightRow';

interface WtCompetitionBlockProps {
  item: WtCompetitionHistoryItem;
}

// Une compétition du parcours : titre (lien vers la fiche compétition
// EXISTANTE /competitions/:id), date · lieu, catégorie(s), bilan réel sur
// ses combats, puis les combats dans l'ordre du tableau. Aucun classement ni
// médaille déduit.
function WtCompetitionBlock({ item }: WtCompetitionBlockProps) {
  const { competition } = item;
  const href = `/competitions/${competition.id}`;
  const meta = [formatCompetitionDates(competition.dateDebut, competition.dateFin), formatCompetitionLocation(competition)]
    .filter(Boolean)
    .join(' · ');
  const tally = [
    formatFightCount(item.fights),
    `${item.wins} V`,
    `${item.losses} D`,
    item.unknown > 0 ? `${item.unknown} inconnu${item.unknown > 1 ? 's' : ''}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <article className="border-t border-gray-200 pt-5">
      <a
        href={href}
        onClick={(event) => handleNavClick(event, href)}
        className="break-words font-display text-lg font-extrabold uppercase leading-tight tracking-tight text-ekvara-black hover:underline sm:text-xl"
      >
        {competition.name}
      </a>
      <p className="mt-1 text-sm text-ekvara-black/60">{meta}</p>
      <p className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
        {item.categories.length > 0 && (
          <span className="font-semibold text-ekvara-black">{item.categories.join(' · ')}</span>
        )}
        <span className="text-ekvara-black/55">{tally}</span>
      </p>

      <ul className="mt-2 divide-y divide-gray-100">
        {item.matches.map((fight) => (
          <WtFightRow key={fight.id} fight={fight} />
        ))}
      </ul>
    </article>
  );
}

export default WtCompetitionBlock;
