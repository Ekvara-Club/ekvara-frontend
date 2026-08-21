import { useEffect, useState } from 'react';
import Header from '../components/layout/Header';
import WeightSummaryHeader from '../components/weight/WeightSummaryHeader';
import WeightChart from '../components/weight/WeightChart';
import WeightHistoryList from '../components/weight/WeightHistoryList';
import AddWeightLogModal from '../components/weight/AddWeightLogModal';
import Button from '../components/ui/Button';
import SectionLabel from '../components/ui/SectionLabel';
import { useAuth } from '../contexts/AuthContext';
import { getWeightLogs, getWeightSummary } from '../services/athletes.api';
import type { WeightLog, WeightSummaryResponse } from '../types/weight';

function WeightPage() {
  // WeightPage n'est rendue que lorsque l'utilisateur est authentifié (garde
  // dans App.tsx) : athlete est donc garanti non-null ici.
  const { athlete } = useAuth();
  const athleteId = athlete!.id;

  const [summary, setSummary] = useState<WeightSummaryResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [logs, setLogs] = useState<WeightLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logsError, setLogsError] = useState<string | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Indépendant de l'historique : une erreur ici ne doit pas empêcher
  // l'historique/le graphique de s'afficher.
  function loadSummary(isCancelled: () => boolean) {
    setSummaryLoading(true);
    setSummaryError(null);

    getWeightSummary(athleteId)
      .then((data) => {
        if (!isCancelled()) setSummary(data);
      })
      .catch((error: Error) => {
        if (!isCancelled()) {
          console.error('Erreur lors du chargement du résumé de poids', error);
          setSummaryError(error.message);
        }
      })
      .finally(() => {
        if (!isCancelled()) setSummaryLoading(false);
      });
  }

  // Indépendant du résumé : une erreur ici ne doit pas empêcher le résumé de
  // s'afficher.
  function loadWeightLogs(isCancelled: () => boolean) {
    setLogsLoading(true);
    setLogsError(null);

    getWeightLogs(athleteId)
      .then((data) => {
        if (!isCancelled()) setLogs(data);
      })
      .catch((error: Error) => {
        if (!isCancelled()) {
          console.error("Erreur lors du chargement de l'historique de poids", error);
          setLogsError(error.message);
        }
      })
      .finally(() => {
        if (!isCancelled()) setLogsLoading(false);
      });
  }

  useEffect(() => {
    let cancelled = false;
    loadSummary(() => cancelled);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [athleteId]);

  useEffect(() => {
    let cancelled = false;
    loadWeightLogs(() => cancelled);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [athleteId]);

  function handleWeightLogSaved() {
    setIsAddModalOpen(false);
    // Jamais de window.location.reload() : les deux sources se rechargent
    // indépendamment, résumé (poids actuel, weeklyChange) et historique
    // (graphique + liste) se mettent à jour dès que les appels résolvent.
    loadSummary(() => false);
    loadWeightLogs(() => false);
  }

  return (
    <div className="min-h-screen bg-ekvara-surface">
      <Header />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <section className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-ekvara-black">
              Suivi du poids
            </h1>
            <p className="mt-1 text-ekvara-muted">Consulte ton évolution et enregistre tes pesées.</p>
          </div>
          <Button variant="primary" onClick={() => setIsAddModalOpen(true)}>
            + Ajouter une pesée
          </Button>
        </section>

        <div className="flex flex-col gap-10">
          <section>
            <SectionLabel>Synthèse</SectionLabel>
            <div className="mt-4">
              <WeightSummaryHeader summary={summary} loading={summaryLoading} error={summaryError} />
            </div>
          </section>

          <section className="border-t border-gray-200 pt-8">
            <SectionLabel>Évolution</SectionLabel>

            {logsLoading && <p className="mt-4 text-sm text-ekvara-muted">Chargement...</p>}

            {!logsLoading && logsError && (
              <p className="mt-4 text-sm text-red-600">Impossible de charger l'historique des pesées.</p>
            )}

            {!logsLoading && !logsError && logs.length === 0 && (
              <div className="mt-4">
                <p className="text-sm text-ekvara-muted">Aucune pesée enregistrée.</p>
                <Button variant="primary" onClick={() => setIsAddModalOpen(true)} className="mt-3">
                  + Ajouter une pesée
                </Button>
              </div>
            )}

            {!logsLoading && !logsError && logs.length > 0 && (
              <div className="mt-6">
                <WeightChart logs={logs} target={summary?.target ?? null} />
                {logs.length === 1 && (
                  <p className="mt-3 text-xs text-ekvara-muted">
                    Ajoute une nouvelle pesée pour visualiser ton évolution.
                  </p>
                )}
              </div>
            )}
          </section>

          <section className="border-t border-gray-200 pt-8">
            <WeightHistoryList logs={logs} loading={logsLoading} error={logsError} />
          </section>
        </div>
      </main>

      {isAddModalOpen && (
        <AddWeightLogModal
          athleteId={athleteId}
          onClose={() => setIsAddModalOpen(false)}
          onSaved={handleWeightLogSaved}
        />
      )}
    </div>
  );
}

export default WeightPage;
