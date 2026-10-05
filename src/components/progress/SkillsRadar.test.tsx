import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import SkillsRadar from './SkillsRadar';
import type { MetricOverviewEntry } from '../../types/metrics-overview';

function metric(id: string, name: string, score: number | null, previousScore: number | null = null): MetricOverviewEntry {
  return {
    id, code: id, name, unit: null, direction: 'higher', currentValue: score, previousValue: previousScore,
    delta: null, percentage: null, status: 'unknown', measuredAt: null, score, previousScore,
  };
}

describe('SkillsRadar — étoile de compétences', () => {
  it('moins de 3 capacités notées : message, pas d\'étoile', () => {
    render(<SkillsRadar metrics={[metric('force', 'Force', 45), metric('vitesse', 'Vitesse', 72), metric('souplesse', 'Souplesse', null)]} />);

    expect(screen.getByText(/apparaîtra dès que 3 capacités auront été évaluées/)).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('une branche par capacité notée (les non notées exclues), note affichée, résumé accessible', () => {
    render(
      <SkillsRadar
        metrics={[
          metric('force', 'Force', 45),
          metric('vitesse', 'Vitesse', 72),
          metric('reaction', 'Temps de réaction', 63),
          metric('souplesse', 'Souplesse', null),
        ]}
      />,
    );

    expect(screen.getByRole('img', { name: 'Étoile de compétences : Force 45/100, Vitesse 72/100, Temps de réaction 63/100' })).toBeInTheDocument();
    expect(screen.queryByText('Souplesse')).not.toBeInTheDocument();
    expect(screen.getByTestId('radar-current').getAttribute('points')?.split(' ')).toHaveLength(3);
  });

  it('étoile précédente en pointillés seulement s\'il existe une évaluation précédente', () => {
    const { rerender } = render(
      <SkillsRadar metrics={[metric('a', 'Force', 45), metric('b', 'Vitesse', 72), metric('c', 'Technique', 60)]} />,
    );
    expect(screen.queryByTestId('radar-previous')).not.toBeInTheDocument();
    expect(screen.queryByText('Évaluation précédente')).not.toBeInTheDocument();

    rerender(<SkillsRadar metrics={[metric('a', 'Force', 45, 40), metric('b', 'Vitesse', 72), metric('c', 'Technique', 60, 55)]} />);
    expect(screen.getByTestId('radar-previous')).toBeInTheDocument();
    expect(screen.getByText('Évaluation précédente')).toBeInTheDocument();
  });

  it('géométrie : note 100 au bout de la branche du haut, note 0 au centre', () => {
    render(<SkillsRadar metrics={[metric('a', 'A', 100), metric('b', 'B', 0), metric('c', 'C', 0)]} />);

    const [top, second] = screen.getByTestId('radar-current').getAttribute('points')!.split(' ');
    expect(top).toBe('150.0,54.0');
    expect(second).toBe('150.0,150.0');
  });
});
