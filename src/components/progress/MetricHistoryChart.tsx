import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TooltipContentProps } from 'recharts';
import type { MetricMeasurement } from '../../types/metrics-overview';

interface MetricHistoryChartProps {
  measurements: MetricMeasurement[];
  unit: string | null;
  // Couleur de la ligne cohérente avec le statut déjà affiché ailleurs sur la
  // page (MetricsGrid/MetricDetail) — jamais recalculée ici à partir des
  // valeurs brutes, uniquement transmise par le parent depuis `status`.
  positive: boolean;
}

interface ChartPoint {
  date: string;
  value: number;
  comment: string | null;
}

const MIN_DOMAIN_PADDING_RATIO = 0.05;
const LINE_COLOR_POSITIVE = '#D9FF43';
const LINE_COLOR_NEUTRAL = '#090909';

function formatValue(value: number): string {
  return value.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
}

function formatAxisDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function formatTooltipDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}


function CustomTooltip({ active, payload, unit }: TooltipContentProps & { unit: string | null }) {
  if (!active || !payload || payload.length === 0) return null;

  const point = payload[0].payload as ChartPoint;

  return (
    <div className="rounded-lg border border-gray-200 bg-ekvara-surface px-3 py-2.5 text-sm shadow-sm">
      <p className="font-medium text-ekvara-black">{formatTooltipDate(point.date)}</p>
      <p className="font-display font-bold text-ekvara-black">
        {formatValue(point.value)}
        {unit && <span className="ml-1 font-sans text-xs font-normal text-ekvara-black/60">{unit}</span>}
      </p>
      {point.comment && <p className="mt-1 text-xs text-ekvara-muted">{point.comment}</p>}
    </div>
  );
}

// Les mesures arrivent DESC de l'API : on construit une copie triée ASC pour
// le graphique, sans jamais muter la prop reçue (réutilisée par la liste).
// Jamais d'inversion d'axe ou de valeur : une courbe descendante reste
// descendante même quand elle représente une amélioration (ex. temps de
// réaction) — seule la couleur (positive/neutre) reflète le statut.
function MetricHistoryChart({ measurements, unit, positive }: MetricHistoryChartProps) {
  if (measurements.length === 0) {
    return null;
  }

  const chartData: ChartPoint[] = [...measurements]
    .sort((a, b) => a.measuredAt.localeCompare(b.measuredAt))
    .map((m) => ({ date: m.measuredAt, value: m.value, comment: m.comment }));

  const values = chartData.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = max - min;
  // Si toutes les valeurs sont identiques (spread = 0), une marge minimale
  // basée sur la valeur elle-même évite un axe plat/amplitude nulle.
  const padding = spread > 0 ? spread * 0.15 : Math.max(Math.abs(max) * MIN_DOMAIN_PADDING_RATIO, 1);
  // Bornes entières : graduations régulières et lisibles.
  const domain: [number, number] = [Math.floor(min - padding), Math.ceil(max + padding)];
  // Courbe toujours noire (le lime est invisible sur la surface claire) ;
  // la progression reste signalée par le remplissage lime des points.
  const pointColor = positive ? LINE_COLOR_POSITIVE : LINE_COLOR_NEUTRAL;

  return (
    <div className="h-[260px] w-full sm:h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="date"
            tickFormatter={formatAxisDate}
            tick={{ fontSize: 12, fontFamily: 'Manrope, sans-serif', fill: '#A3A3A3' }}
            axisLine={{ stroke: '#e5e7eb' }}
            tickLine={false}
            tickMargin={8}
            padding={{ left: 12, right: 12 }}
          />
          <YAxis
            domain={domain}
            tickCount={5}
            allowDecimals={false}
            tick={{ fontSize: 12, fontFamily: 'Manrope, sans-serif', fill: '#A3A3A3' }}
            tickFormatter={(value: number) => formatValue(value)}
            width={45}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={(props) => <CustomTooltip {...props} unit={unit} />} />
          <Line
            type="monotone"
            dataKey="value"
            stroke={LINE_COLOR_NEUTRAL}
            strokeWidth={2}
            dot={{ r: 3.5, fill: pointColor, stroke: '#090909', strokeWidth: 1 }}
            activeDot={{ r: 5, fill: pointColor, stroke: '#090909', strokeWidth: 1.5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default MetricHistoryChart;
