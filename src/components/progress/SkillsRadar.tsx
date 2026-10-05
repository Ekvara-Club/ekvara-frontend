import type { MetricOverviewEntry } from '../../types/metrics-overview';

interface SkillsRadarProps {
  metrics: MetricOverviewEntry[];
}

const SIZE = 300;
const CENTER = SIZE / 2;
const RADIUS = 96;
const RINGS = [25, 50, 75, 100];
const MIN_AXES = 3;
// Marge horizontale pour les libellés des branches latérales (« Temps de
// réaction ») : jamais coupés par le cadre du SVG.
const LABEL_PAD = 110;

function point(index: number, count: number, score: number): [number, number] {
  // Première branche en haut, puis sens horaire.
  const angle = -Math.PI / 2 + (2 * Math.PI * index) / count;
  const r = (RADIUS * score) / 100;
  return [CENTER + r * Math.cos(angle), CENTER + r * Math.sin(angle)];
}

function polygon(scores: number[]): string {
  return scores.map((s, i) => point(i, scores.length, s).map((v) => v.toFixed(1)).join(',')).join(' ');
}

// Étoile de compétences : une branche par capacité notée /100 par le
// backend (barème par capacité). Étoile actuelle pleine ; contour pointillé
// = notes précédentes (avant-dernière mesure), pour voir la progression
// d'un coup d'œil. SVG maison : aucune librairie de graphiques chargée.
function SkillsRadar({ metrics }: SkillsRadarProps) {
  const axes = metrics.filter((m) => m.score !== null);

  if (axes.length < MIN_AXES) {
    return (
      <p className="text-sm text-ekvara-muted">
        L'étoile de compétences apparaîtra dès que {MIN_AXES} capacités auront été évaluées.
      </p>
    );
  }

  const current = axes.map((m) => m.score as number);
  const hasPrevious = axes.some((m) => m.previousScore !== null);
  // Capacité sans mesure précédente : même note qu'aujourd'hui (aucune
  // évolution inventée sur cette branche).
  const previous = axes.map((m) => m.previousScore ?? (m.score as number));
  const summary = axes.map((m) => `${m.name} ${m.score}/100`).join(', ');

  return (
    <figure className="flex flex-col items-center">
      <svg
        viewBox={`${-LABEL_PAD} 0 ${SIZE + 2 * LABEL_PAD} ${SIZE}`}
        className="w-full max-w-[480px]"
        role="img"
        aria-label={`Étoile de compétences : ${summary}`}
      >
        {RINGS.map((ring) => (
          <polygon
            key={ring}
            points={polygon(axes.map(() => ring))}
            fill="none"
            stroke="currentColor"
            className="text-gray-200"
            strokeWidth={1}
          />
        ))}
        {axes.map((m, i) => {
          const [x, y] = point(i, axes.length, 100);
          return <line key={m.id} x1={CENTER} y1={CENTER} x2={x} y2={y} stroke="currentColor" className="text-gray-200" />;
        })}

        <polygon
          data-testid="radar-current"
          points={polygon(current)}
          fill="#D9FF43"
          fillOpacity={0.55}
          stroke="#090909"
          strokeWidth={2}
        />
        {hasPrevious && (
          <polygon
            data-testid="radar-previous"
            points={polygon(previous)}
            fill="none"
            stroke="currentColor"
            className="text-ekvara-black/60"
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
        )}

        {axes.map((m, i) => {
          const [x, y] = point(i, axes.length, 124);
          const anchor = Math.abs(x - CENTER) < 4 ? 'middle' : x > CENTER ? 'start' : 'end';
          return (
            <text key={m.id} x={x} y={y} textAnchor={anchor} dominantBaseline="middle" className="fill-ekvara-black text-[13px] font-semibold uppercase">
              <tspan>{m.name}</tspan>
              <tspan x={x} dy={15} className="fill-ekvara-black/60 text-[12px] font-normal normal-case">
                {m.score}/100
              </tspan>
            </text>
          );
        })}
      </svg>
      {hasPrevious && (
        <figcaption className="mt-2 flex items-center gap-4 text-xs text-ekvara-black/60">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-ekvara-lime ring-1 ring-ekvara-black" aria-hidden="true" />
            Aujourd'hui
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0 w-3 border-t border-dashed border-ekvara-black/50" aria-hidden="true" />
            Évaluation précédente
          </span>
        </figcaption>
      )}
    </figure>
  );
}

export default SkillsRadar;
