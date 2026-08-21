import { useEffect, useState } from 'react';
import Header from '../components/layout/Header';
import MetricsLedger from '../components/progress/MetricsLedger';
import MetricDetail from '../components/progress/MetricDetail';
import MetricHistoryChart from '../components/progress/MetricHistoryChart';
import MetricHistoryList from '../components/progress/MetricHistoryList';
import { useAuth } from '../contexts/AuthContext';
import { getMetricMeasurements, getMetricsOverview } from '../services/athletes.api';
import type { MetricMeasurement, MetricOverviewEntry } from '../types/metrics-overview';

function ProgressPage() {
  // ProgressPage n'est rendue que lorsque l'utilisateur est authentifié
  // (garde dans App.tsx) : athlete est donc garanti non-null ici.
  const { athlete } = useAuth();
  const athleteId = athlete!.id;

  const [metrics, setMetrics] = useState<MetricOverviewEntry[]>([]);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  const [selected, setSelected] = useState<MetricOverviewEntry | null>(null);

  const [measurements, setMeasurements] = useState<MetricMeasurement[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setOverviewLoading(true);
    setOverviewError(null);

    getMetricsOverview(athleteId)
      .then((data) => {
        if (cancelled) return;
        setMetrics(data.metrics);
        // Auto-sélection : la première capacité avec une mesure existante,
        // jamais une capacité codée en dur ; sinon la première tout court,
        // pour laisser l'état vide s'afficher.
        const withValue = data.metrics.find((m) => m.currentValue !== null);
        setSelected(withValue ?? data.metrics[0] ?? null);
      })
      .catch((error: Error) => {
        if (cancelled) return;
        console.error('Erreur lors du chargement de la progression', error);
        setOverviewError(error.message);
      })
      .finally(() => {
        if (!cancelled) setOverviewLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [athleteId]);

  // Garde de course : un changement rapide de sélection annule la prise en
  // compte des réponses des sélections précédentes, encore en vol.
  useEffect(() => {
    if (!selected) {
      setMeasurements([]);
      return;
    }

    let cancelled = false;
    setHistoryLoading(true);
    setHistoryError(null);

    getMetricMeasurements(athleteId, selected.id)
      .then((data) => {
        if (!cancelled) setMeasurements(data);
      })
      .catch((error: Error) => {
        if (!cancelled) {
          console.error("Erreur lors du chargement de l'historique", error);
          setHistoryError(error.message);
        }
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [athleteId, selected?.id]);

  return (
    <div className="min-h-screen bg-ekvara-surface">
      <Header />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ekvara-black">
          Ma progression
        </h1>
        <p className="mt-1 text-ekvara-muted">Suis l'évolution de tes capacités au fil de tes tests.</p>

        <div className="mt-8">
          <MetricsLedger
            metrics={metrics}
            loading={overviewLoading}
            error={overviewError}
            selectedId={selected?.id ?? null}
            onSelect={setSelected}
          />
        </div>

        {!overviewLoading && !overviewError && selected && (
          <div className="mt-10 border-t border-gray-200 pt-8">
            {historyLoading && <p className="text-sm text-ekvara-muted">Chargement...</p>}

            {!historyLoading && historyError && (
              <p className="text-sm text-red-600">Impossible de charger l'historique de cette capacité.</p>
            )}

            {!historyLoading && !historyError && (
              <div className="flex flex-col gap-8">
                <div>
                  <MetricDetail metric={selected} />

                  {measurements.length > 0 && (
                    <div className="mt-6">
                      <MetricHistoryChart
                        measurements={measurements}
                        unit={selected.unit}
                        positive={selected.status === 'improved'}
                      />
                    </div>
                  )}
                </div>

                {measurements.length > 0 && (
                  <div className="border-t border-gray-200 pt-8">
                    <MetricHistoryList measurements={measurements} unit={selected.unit} />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default ProgressPage;
