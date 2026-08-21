import type { ParticipationListItem } from '../../types/activity';
import { computeCareerStats } from '../../utils/participationStats';
import SectionLabel from '../ui/SectionLabel';
import StatValue from '../ui/StatValue';

interface CareerStatsProps {
  participations: ParticipationListItem[];
  loading: boolean;
  error: string | null;
}

// Section éditoriale "Record" (§4) : plus de grande card blanche englobante,
// une ligne de statistiques séparées par de fins traits verticaux à partir de
// sm (grille à une seule rangée — évite l'asymétrie d'un divide-x appliqué à
// une grille qui reviendrait à la ligne). Les valeurs restent strictement
// celles de computeCareerStats ; le zero-padding ("01") et le singulier/
// pluriel du label sont uniquement présentationnels.
function CareerStats({ participations, loading, error }: CareerStatsProps) {
  const stats = computeCareerStats(participations);

  const cells: { value: number; singular: string; plural: string }[] = [
    { value: stats.disputed, singular: 'Compétition disputée', plural: 'Compétitions disputées' },
    { value: stats.wins, singular: 'Victoire', plural: 'Victoires' },
    { value: stats.losses, singular: 'Défaite', plural: 'Défaites' },
    { value: stats.podiums, singular: 'Podium', plural: 'Podiums' },
  ];

  return (
    <div>
      <SectionLabel>Record</SectionLabel>

      {loading && <p className="mt-4 text-sm text-ekvara-muted">Chargement...</p>}

      {!loading && error && (
        <p className="mt-4 text-sm text-red-600">Impossible de charger les statistiques pour le moment.</p>
      )}

      {!loading && !error && (
        <div className="mt-6 grid grid-cols-2 gap-y-6 sm:grid-cols-4 sm:gap-y-0 sm:divide-x sm:divide-gray-200">
          {cells.map((cell) => (
            <StatValue
              key={cell.singular}
              value={String(cell.value).padStart(2, '0')}
              label={cell.value > 1 ? cell.plural : cell.singular}
              size="xl"
              className="sm:px-6 sm:first:pl-0"
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default CareerStats;
