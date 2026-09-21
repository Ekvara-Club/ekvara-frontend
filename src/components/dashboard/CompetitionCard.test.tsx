import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import CompetitionCard from './CompetitionCard';
import { nextFromParticipation, nextFromPreparation } from '../../test/fixtures';

vi.mock('../../utils/navigation', () => ({ navigateTo: vi.fn() }));

describe('CompetitionCard (dashboard)', () => {
  it('état vide réel : aucune compétition à venir quand rien n\'existe', () => {
    render(<CompetitionCard competition={null} loading={false} error={null} />);

    expect(screen.getByText('Aucune compétition à venir')).toBeInTheDocument();
  });

  it('chargement et erreur restent inchangés', () => {
    const { rerender } = render(<CompetitionCard competition={null} loading error={null} />);
    expect(screen.getByText('Chargement...')).toBeInTheDocument();

    rerender(<CompetitionCard competition={null} loading={false} error="boom" />);
    expect(screen.getByText('Impossible de charger la prochaine compétition.')).toBeInTheDocument();
  });

  it('préparation coach : nom, date, lieu, catégorie prévue, "Prévue par ton coach" — jamais "Inscrit"', () => {
    render(<CompetitionCard competition={nextFromPreparation()} loading={false} error={null} />);

    expect(screen.getByText('Championnat de France seniors')).toBeInTheDocument();
    expect(screen.getByText('13 mars 2027')).toBeInTheDocument();
    expect(screen.getByText('Eaubonne, France')).toBeInTheDocument();
    expect(screen.getByText('Prêt · Senior · -68kg')).toBeInTheDocument();
    expect(screen.getByText('Prévue par ton coach')).toBeInTheDocument();
    expect(screen.queryByText(/inscrit/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Aucune compétition à venir')).not.toBeInTheDocument();
  });

  it('préparation coach sans catégories -> pas de séparateur orphelin', () => {
    render(
      <CompetitionCard
        competition={nextFromPreparation({
          preparation: { status: 'envisage', categorieAgePrevue: null, categoriePoidsPrevue: null },
        })}
        loading={false}
        error={null}
      />,
    );

    expect(screen.getByText('Envisagée')).toBeInTheDocument();
  });

  it('participation : statut réel d\'inscription et catégories officielles, sans mention "coach"', () => {
    render(<CompetitionCard competition={nextFromParticipation()} loading={false} error={null} />);

    expect(screen.getByText('Inscrit · Cadet · -74 kg')).toBeInTheDocument();
    expect(screen.queryByText('Prévue par ton coach')).not.toBeInTheDocument();
  });

  it('participation + préparation : une seule carte, catégories officielles jamais remplacées', () => {
    render(
      <CompetitionCard
        competition={nextFromParticipation({
          preparation: { status: 'pret', categorieAgePrevue: 'Senior', categoriePoidsPrevue: '-68kg' },
        })}
        loading={false}
        error={null}
      />,
    );

    expect(screen.getAllByText('Championnat de France seniors')).toHaveLength(1);
    expect(screen.getByText('Inscrit · Cadet · -74 kg')).toBeInTheDocument();
    expect(screen.queryByText(/Senior/)).not.toBeInTheDocument();
  });

  it('participation sans catégorie officielle -> repli sur la catégorie prévue', () => {
    render(
      <CompetitionCard
        competition={nextFromParticipation({
          categoriePoids: null,
          categorieAge: null,
          preparation: { status: 'pret', categorieAgePrevue: 'Senior', categoriePoidsPrevue: '-68kg' },
        })}
        loading={false}
        error={null}
      />,
    );

    expect(screen.getByText('Inscrit · Senior · -68kg')).toBeInTheDocument();
  });
});
