import { useEffect, useState } from 'react';
import Header from '../components/layout/Header';
import AthleteProfileCard from '../components/passport/AthleteProfileCard';
import MetricsOverview from '../components/passport/MetricsOverview';
import PalmaresList from '../components/passport/PalmaresList';
import ConditionStatus from '../components/condition/ConditionStatus';
import WtProfileSection from '../components/passport/WtProfileSection';
import { useAuth } from '../contexts/AuthContext';
import { getCompetitions, getMetricsOverview } from '../services/athletes.api';
import type { ParticipationListItem } from '../types/activity';
import type { MetricOverviewEntry } from '../types/metrics-overview';

function PassportPage() {
  // PassportPage n'est rendue que lorsque l'utilisateur est authentifié
  // (garde dans App.tsx) : athlete/user sont donc garantis non-null ici.
  const { athlete, user, updateAthlete } = useAuth();
  const athleteId = athlete!.id;

  const [participations, setParticipations] = useState<ParticipationListItem[]>([]);
  const [participationsLoading, setParticipationsLoading] = useState(true);
  const [participationsError, setParticipationsError] = useState<string | null>(null);

  const [metrics, setMetrics] = useState<MetricOverviewEntry[]>([]);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  // Réutilisée à la fois par l'effet initial et par le rafraîchissement
  // immédiat après l'enregistrement d'un résultat de compétition — sans
  // window.location.reload(), le Palmarès se recalcule dès que
  // les nouvelles participations arrivent (dérivé de ce même state).
  function loadParticipations(isCancelled: () => boolean) {
    setParticipationsLoading(true);
    setParticipationsError(null);

    getCompetitions(athleteId)
      .then((data) => {
        if (!isCancelled()) setParticipations(data);
      })
      .catch((error: Error) => {
        if (!isCancelled()) {
          console.error('Erreur lors du chargement des compétitions du passeport', error);
          setParticipationsError(error.message);
        }
      })
      .finally(() => {
        if (!isCancelled()) setParticipationsLoading(false);
      });
  }

  // Indépendant de la progression : une erreur ici ne doit pas empêcher le
  // Profil ou la Progression de fonctionner (alimente le Palmarès).
  useEffect(() => {
    let cancelled = false;
    loadParticipations(() => cancelled);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [athleteId]);

  // Indépendant des compétitions : une erreur ici ne doit pas empêcher le
  // Profil ou le Palmarès de fonctionner.
  useEffect(() => {
    let cancelled = false;

    setMetricsLoading(true);
    setMetricsError(null);

    getMetricsOverview(athleteId)
      .then((data) => {
        if (!cancelled) setMetrics(data.metrics);
      })
      .catch((error: Error) => {
        if (!cancelled) {
          console.error('Erreur lors du chargement de la progression du passeport', error);
          setMetricsError(error.message);
        }
      })
      .finally(() => {
        if (!cancelled) setMetricsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [athleteId]);

  return (
    <div className="min-h-screen bg-ekvara-surface">
      <Header />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-10">
          <div>
            <AthleteProfileCard user={user!} athlete={athlete!} />
            {/* État de forme déclaré par l'athlète, visible par ses coachs. */}
            <ConditionStatus
              athleteId={athleteId}
              status={athlete!.etat_forme}
              note={athlete!.etat_forme_note}
              expectedReturn={athlete!.etat_forme_retour}
              onSaved={(view) =>
                updateAthlete({
                  etat_forme: view.status,
                  etat_forme_note: view.note,
                  etat_forme_retour: view.expectedReturn,
                  etat_forme_updated_at: view.updatedAt,
                })
              }
            />
          </div>

          <section className="border-t border-gray-200 pt-8">
            <MetricsOverview metrics={metrics} loading={metricsLoading} error={metricsError} />
          </section>

          <section className="border-t border-gray-200 pt-8">
            <PalmaresList
              athleteId={athleteId}
              participations={participations}
              loading={participationsLoading}
              error={participationsError}
              onResultUpdated={() => loadParticipations(() => false)}
            />
          </section>

          <section className="border-t border-gray-200 pt-8">
            <WtProfileSection athleteId={athleteId} />
          </section>
        </div>
      </main>
    </div>
  );
}

export default PassportPage;
