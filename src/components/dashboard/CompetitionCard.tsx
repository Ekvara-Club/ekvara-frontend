import { navigateTo } from '../../utils/navigation';
import Button from '../ui/Button';
import SectionLabel from '../ui/SectionLabel';
import type { NextCompetitionResponse } from '../../types/competition';

interface CompetitionCardProps {
  competition: NextCompetitionResponse | null;
  loading: boolean;
  error: string | null;
}

function parseDateOnly(dateDebut: string): Date {
  const [year, month, day] = dateDebut.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day);
}

function getDaysUntilLabel(dateDebut: string): string {
  const competitionDate = parseDateOnly(dateDebut);
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const diffDays = Math.round((competitionDate.getTime() - startOfToday.getTime()) / 86_400_000);

  if (diffDays <= 0) return "Aujourd'hui";
  if (diffDays === 1) return 'J-1';
  return `J-${diffDays}`;
}

function formatDate(dateDebut: string): string {
  return parseDateOnly(dateDebut).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// Capitalise uniquement le statut (mot seul, sûr) — jamais la ligne entière
// via CSS `capitalize`, qui déformerait une unité réelle comme "kg" en "Kg".
function capitalizeFirst(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

// Carte hero du dashboard (§6) : seule card volontairement noire — les autres
// états (loading/empty/error) restent sur la surface claire commune plutôt
// que d'imposer un grand aplat noir à un message neutre ou une erreur.
function CompetitionCard({ competition, loading, error }: CompetitionCardProps) {
  if (!loading && !error && competition) {
    const { competition: comp, statut, categorieAge, categoriePoids } = competition;
    const registration = [capitalizeFirst(statut), categorieAge, categoriePoids]
      .filter(Boolean)
      .join(' · ');

    return (
      <div className="flex min-h-[240px] flex-col justify-between rounded-lg bg-ekvara-black p-6 sm:p-7">
        <div>
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/40">
              Prochaine compétition
            </p>
            <span className="whitespace-nowrap rounded-full bg-ekvara-lime px-3 py-1 font-display text-sm font-extrabold text-ekvara-black">
              {getDaysUntilLabel(comp.dateDebut)}
            </span>
          </div>

          <h3 className="mt-4 font-display text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
            {comp.nom}
          </h3>

          <div className="mt-4 flex flex-col gap-1 text-sm text-white/60">
            <p>{formatDate(comp.dateDebut)}</p>
            {(comp.ville || comp.pays) && <p>{[comp.ville, comp.pays].filter(Boolean).join(', ')}</p>}
            {comp.niveau && <p className="capitalize">{comp.niveau}</p>}
          </div>

          {registration && <p className="mt-4 text-sm text-white/70">{registration}</p>}
        </div>

        <div className="mt-6 border-t border-white/10 pt-4">
          <Button
            variant="ghost-light"
            onClick={() => navigateTo(`/competitions/${comp.id}`)}
            className="group"
          >
            Voir la compétition
            <span className="inline-block transition-transform group-hover:translate-x-0.5">→</span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[240px] rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <SectionLabel>Prochaine compétition</SectionLabel>

      {loading && <p className="mt-6 text-sm text-ekvara-muted">Chargement...</p>}

      {!loading && error && (
        <p className="mt-6 text-sm text-red-600">
          Impossible de charger la prochaine compétition.
        </p>
      )}

      {!loading && !error && (
        <div className="mt-6">
          <p className="text-sm font-medium text-ekvara-black">Aucune compétition à venir</p>
          <p className="mt-1 text-sm text-ekvara-muted">
            Ajoute une compétition pour commencer ta préparation.
          </p>
        </div>
      )}
    </div>
  );
}

export default CompetitionCard;
