export type MetricStatus = 'improved' | 'stable' | 'regressed' | 'unknown';

// GET /athletes/:athleteId/metrics/overview : contrairement à
// ProgressHighlight (progress.ts), qui ne représente que les améliorations,
// une entrée ici existe pour CHAQUE metric_type connu, même sans mesure
// (currentValue/previousValue/delta/percentage/measuredAt alors null).
export interface MetricOverviewEntry {
  id: string;
  code: string;
  name: string;
  unit: string | null;
  direction: string | null;
  currentValue: number | null;
  previousValue: number | null;
  delta: number | null;
  percentage: number | null;
  status: MetricStatus;
  measuredAt: string | null;
}

export interface MetricsOverviewResponse {
  metrics: MetricOverviewEntry[];
}

// GET /athletes/:athleteId/metrics/:metricTypeId/measurements : renvoyées
// triées measuredAt DESC — le tri chronologique ASC pour le graphique se fait
// côté frontend, sans jamais muter la réponse.
export interface MetricMeasurement {
  id: string;
  value: number;
  measuredAt: string;
  coachUserId: string | null;
  comment: string | null;
}
