import type { ParticipationListItem } from '../types/activity';

// Même technique que ActivityPage/AddCompetitionModal : dateDebut/dateFin sont
// des DATE métier sans heure — jamais new Date() naïf, qui peut décaler le
// jour selon le fuseau du navigateur.
function parseDateOnly(dateString: string): Date {
  const [year, month, day] = dateString.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day);
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

// Une compétition future n'est jamais considérée comme disputée, quelle que
// soit sa participation (inscription, catégorie...).
export function isPastParticipation(participation: ParticipationListItem, today: Date = startOfToday()): boolean {
  const referenceDate = participation.competition.dateFin ?? participation.competition.dateDebut;
  return parseDateOnly(referenceDate) < today;
}

// Une participation n'est considérée comme "disputée" que si un indicateur de
// résultat réel est renseigné — jamais déduit de la seule inscription passée.
// classement/medaille non nuls, ou victoires/defaites strictement positifs :
// une compétition passée sans aucun de ces signaux reste "résultat non
// renseigné", jamais une défaite ou un résultat implicite.
export function hasCompetitionResult(participation: ParticipationListItem): boolean {
  return (
    participation.classement !== null ||
    participation.medaille !== null ||
    (participation.victoires !== null && participation.victoires > 0) ||
    (participation.defaites !== null && participation.defaites > 0)
  );
}

export function isPodium(participation: ParticipationListItem): boolean {
  const hasTopClassement =
    participation.classement !== null && participation.classement >= 1 && participation.classement <= 3;
  return hasTopClassement || participation.medaille !== null;
}
