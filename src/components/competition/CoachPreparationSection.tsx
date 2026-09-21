import SectionLabel from '../ui/SectionLabel';
import StatValue from '../ui/StatValue';
import { formatPreparationStatus } from '../../utils/coachPreparation';
import type { CoachPreparationSummary } from '../../types/competition';

interface CoachPreparationSectionProps {
  preparation: CoachPreparationSummary;
  // Une préparation coach n'est PAS une inscription : une fois CONFIRMÉ
  // qu'aucune participation officielle n'existe, on le dit explicitement
  // plutôt que de laisser croire à l'athlète qu'il est inscrit. Jamais vrai
  // pendant le chargement des participations (pas de faux "Non confirmée").
  showUnconfirmedRegistration: boolean;
}

// Fiche compétition : situation de l'athlète quand son coach l'a préparé.
// Alimentée uniquement par la vue Athlete-safe (statut + catégories prévues) ;
// aucune note ni objectif coach n'existe dans ces données.
function CoachPreparationSection({ preparation, showUnconfirmedRegistration }: CoachPreparationSectionProps) {
  const cells: { label: string; value: string }[] = [
    { label: 'Statut', value: formatPreparationStatus(preparation.status) },
  ];
  if (preparation.categorieAgePrevue) cells.push({ label: 'Catégorie', value: preparation.categorieAgePrevue });
  if (preparation.categoriePoidsPrevue) cells.push({ label: 'Poids', value: preparation.categoriePoidsPrevue });

  return (
    <>
      <section className="mt-10">
        <SectionLabel>Ma préparation</SectionLabel>
        <p className="mt-4 text-sm text-ekvara-muted">Prévue par mon coach</p>

        <div className="mt-4 grid grid-cols-1 gap-y-4 sm:grid-cols-3 sm:gap-y-0 sm:divide-x sm:divide-gray-200">
          {cells.map((cell) => (
            <StatValue
              key={cell.label}
              value={cell.value}
              label={cell.label}
              size="md"
              className="uppercase sm:px-6 sm:first:pl-0"
            />
          ))}
        </div>
      </section>

      {showUnconfirmedRegistration && (
        <section className="mt-10 border-t border-gray-200 pt-8">
          <SectionLabel>Inscription officielle</SectionLabel>
          <p className="mt-4 font-display text-xl font-bold text-ekvara-black">Non confirmée</p>
          <p className="mt-1 text-sm text-ekvara-muted">
            Ton coach te prépare pour cette compétition, mais aucune inscription officielle n'est enregistrée.
          </p>
        </section>
      )}
    </>
  );
}

export default CoachPreparationSection;
