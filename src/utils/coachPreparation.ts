import type { CoachPreparationItem, CompetitionSummary } from '../types/competition';
import type { ParticipationListItem } from '../types/activity';

// Statuts d'une participation qui ne doivent plus apparaître comme échéance
// active (même liste que le backend INACTIVE_PARTICIPATION_STATUSES).
export const EXCLUDED_PARTICIPATION_STATUSES = ['annule', 'retire'];

// "forfait" = l'athlète ne participera pas : jamais une échéance active.
export const FORFAIT_PREPARATION_STATUS = 'forfait';

const PREPARATION_STATUS_LABELS: Record<string, string> = {
  envisage: 'Envisagée',
  selectionne: 'Sélectionnée',
  pret: 'Prêt',
  forfait: 'Forfait',
};

function capitalizeFirst(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function formatPreparationStatus(status: string): string {
  return PREPARATION_STATUS_LABELS[status] ?? capitalizeFirst(status);
}

// "Senior · -68kg" : jamais de séparateur flanqué d'une valeur absente.
export function formatPlannedCategory(
  categorieAgePrevue: string | null,
  categoriePoidsPrevue: string | null,
): string | null {
  return [categorieAgePrevue, categoriePoidsPrevue].filter(Boolean).join(' · ') || null;
}

// Même technique que le reste de l'app : les dates métier sont des DATE sans
// heure, jamais new Date() naïf.
function parseDateOnly(dateString: string): Date {
  const [year, month, day] = dateString.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day);
}

// Une ligne de "Mes compétitions" : soit une participation officielle, soit
// une compétition simplement préparée par le coach (jamais les deux pour la
// même compétition — la participation prime, la préparation l'enrichit).
export interface MyCompetitionRow {
  key: string;
  source: 'participation' | 'coach_preparation';
  competition: CompetitionSummary;
  categorieAge: string | null;
  categoriePoids: string | null;
}

// Fusionne participations actives et préparations coach actives à venir, sans
// doublon par competition.id. Préparation forfait exclue (l'athlète n'y va
// pas) ; participation annulée/retirée exclue ET elle masque la préparation de
// la même compétition (la participation reste la source de l'état
// d'inscription, comme côté backend pour "prochaine compétition").
export function buildMyUpcomingCompetitions(
  participations: ParticipationListItem[],
  preparations: CoachPreparationItem[],
  today: Date,
): MyCompetitionRow[] {
  const isUpcoming = (competition: CompetitionSummary) => parseDateOnly(competition.dateDebut) >= today;

  const preparationByCompetition = new Map(preparations.map((p) => [p.competitionId, p]));
  const participationCompetitionIds = new Set(participations.map((p) => p.competition.id));

  const rows: MyCompetitionRow[] = participations
    .filter((p) => !EXCLUDED_PARTICIPATION_STATUSES.includes(p.statut))
    .filter((p) => isUpcoming(p.competition))
    .map((p) => {
      const preparation = preparationByCompetition.get(p.competition.id);
      const usablePreparation = preparation && preparation.status !== FORFAIT_PREPARATION_STATUS ? preparation : null;
      return {
        key: `participation-${p.id}`,
        source: 'participation' as const,
        competition: p.competition,
        // Catégories OFFICIELLES d'abord ; la catégorie prévue ne sert que de repli d'affichage.
        categorieAge: p.categorieAge ?? usablePreparation?.categorieAgePrevue ?? null,
        categoriePoids: p.categoriePoids ?? usablePreparation?.categoriePoidsPrevue ?? null,
      };
    });

  for (const preparation of preparations) {
    if (preparation.status === FORFAIT_PREPARATION_STATUS) continue;
    if (participationCompetitionIds.has(preparation.competitionId)) continue;
    if (!isUpcoming(preparation.competition)) continue;

    rows.push({
      key: `preparation-${preparation.competitionId}`,
      source: 'coach_preparation',
      competition: preparation.competition,
      categorieAge: preparation.categorieAgePrevue,
      categoriePoids: preparation.categoriePoidsPrevue,
    });
  }

  return rows.sort((a, b) => a.competition.dateDebut.localeCompare(b.competition.dateDebut));
}
