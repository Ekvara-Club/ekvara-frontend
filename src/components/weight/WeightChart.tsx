import { Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { WeightLog, WeightTarget } from '../../types/weight';

interface WeightChartProps {
  logs: WeightLog[];
  target: WeightTarget | null;
}

interface ChartPoint {
  date: string;
  weight: number;
}

const MIN_DOMAIN_PADDING_KG = 0.5;

function formatWeight(value: number): string {
  return value.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
}

function formatAxisDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function formatTooltipDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}


function WeightChart({ logs, target }: WeightChartProps) {
  // Le backend renvoie measuredAt DESC (pour l'historique) : tableau dérivé
  // trié ASC pour le graphique, sans jamais muter `logs` (qui reste DESC pour
  // WeightHistoryList).
  const chartData: ChartPoint[] = [...logs]
    .sort((a, b) => a.measuredAt.localeCompare(b.measuredAt))
    .map((log) => ({ date: log.measuredAt, weight: log.weight }));

  const weights = chartData.map((point) => point.weight);
  if (target) weights.push(target.weight);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  // Jamais démarré à 0 : une évolution 74 -> 75 kg serait illisible sur une
  // échelle 0-75. Marge proportionnelle à l'amplitude réelle, avec un plancher
  // pour rester lisible même quand toutes les valeurs sont proches.
  const padding = Math.max(MIN_DOMAIN_PADDING_KG, (max - min) * 0.15);
  // Bornes entières : graduations régulières et lisibles (jamais 72,37).
  const domain: [number, number] = [Math.floor(min - padding), Math.ceil(max + padding)];

  return (
    <div className="h-[280px] w-full sm:h-[340px]">
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
            tickFormatter={(value: number) => formatWeight(value)}
            width={45}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            labelFormatter={(label) => (typeof label === 'string' ? formatTooltipDate(label) : label)}
            formatter={(value) => [`${formatWeight(Number(value))} kg`, 'Poids']}
            contentStyle={{
              backgroundColor: '#FAFAF8',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              padding: '10px 12px',
              fontFamily: 'Manrope, sans-serif',
              fontSize: 12,
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}
            labelStyle={{ color: '#090909', fontWeight: 600, marginBottom: 4 }}
            itemStyle={{ color: '#090909', fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: 14 }}
          />
          {target && (
            <ReferenceLine
              y={target.weight}
              stroke="#A3A3A3"
              strokeDasharray="4 4"
              label={{
                value: `Objectif ${formatWeight(target.weight)} kg`,
                position: 'insideTopRight',
                fill: '#A3A3A3',
                fontSize: 12,
                fontFamily: 'Manrope, sans-serif',
              }}
            />
          )}
          <Line
            type="monotone"
            dataKey="weight"
            stroke="#090909"
            strokeWidth={2}
            dot={{ r: 3, fill: '#D9FF43', stroke: '#090909', strokeWidth: 1 }}
            activeDot={{ r: 5, fill: '#D9FF43', stroke: '#090909', strokeWidth: 1.5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default WeightChart;
