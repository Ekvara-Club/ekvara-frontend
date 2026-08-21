export interface ProgressHighlight {
  metricTypeId: string;
  code: string;
  name: string;
  unit: string | null;
  direction: 'higher' | 'lower';
  previousValue: number;
  currentValue: number;
  delta: number;
  percentage: number | null;
  status: 'improved';
  previousMeasuredAt: string;
  currentMeasuredAt: string;
}

export interface ProgressHighlightsResponse {
  improvedCount: number;
  highlights: ProgressHighlight[];
}
