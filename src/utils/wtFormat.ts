import type { WtCompetitionRef, WtFightOutcome } from '../types/international';

// competition.dateDebut/dateFin sont des DATE métier : parsing date-only
// (jamais new Date(iso) naïf, qui peut décaler le jour selon le fuseau).
function parseDateOnly(dateString: string): Date {
  const [year, month, day] = dateString.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function competitionYear(dateDebut: string): string {
  return dateDebut.slice(0, 4);
}

// "9–14 février 2025", "28 février – 2 mars 2025", ou une date seule.
export function formatCompetitionDates(dateDebut: string, dateFin: string | null): string {
  const start = parseDateOnly(dateDebut);
  const full: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
  if (!dateFin || dateFin.slice(0, 10) === dateDebut.slice(0, 10)) {
    return start.toLocaleDateString('fr-FR', full);
  }
  const end = parseDateOnly(dateFin);
  const endLabel = end.toLocaleDateString('fr-FR', full);
  if (start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()) {
    return `${start.getDate()}–${endLabel}`;
  }
  const startOptions: Intl.DateTimeFormatOptions =
    start.getFullYear() === end.getFullYear() ? { day: 'numeric', month: 'long' } : full;
  return `${start.toLocaleDateString('fr-FR', startOptions)} – ${endLabel}`;
}

export function formatCompetitionLocation(competition: Pick<WtCompetitionRef, 'ville' | 'pays'>): string | null {
  return [competition.ville, competition.pays].filter(Boolean).join(', ') || null;
}

// Tours du tableau tels que publiés par WT Results. Un tour inconnu reste
// affiché tel quel ; un tour absent n'est jamais inventé.
const STAGE_LABELS: Record<string, string> = {
  F: 'Finale',
  SF: 'Demi',
  BMC: 'Bronze',
  QF: 'Quart',
  R16: '1/8',
  R32: '1/16',
  R64: '1/32',
  R128: '1/64',
};

export function formatStage(stage: string | null): string | null {
  if (stage === null || stage === '') return null;
  return STAGE_LABELS[stage] ?? stage;
}

export const OUTCOME_LABELS: Record<WtFightOutcome, string> = {
  WIN: 'Victoire',
  LOSS: 'Défaite',
  UNKNOWN: 'Inconnu',
};

// Score orienté vers l'athlète du profil, tel que renvoyé par le backend
// (jamais réordonné ni corrigé ici). Un score absent reste visible comme tel.
export function formatScore(athleteScore: number | null, opponentScore: number | null): string | null {
  if (athleteScore === null && opponentScore === null) return null;
  return `${athleteScore ?? '–'} — ${opponentScore ?? '–'}`;
}

export function formatFightCount(count: number): string {
  return `${count} ${count === 1 ? 'combat' : 'combats'}`;
}
