import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import CoachPreparationSection from './CoachPreparationSection';

const PREPARATION = { status: 'pret', categorieAgePrevue: 'Senior', categoriePoidsPrevue: '-68kg' };

describe('CoachPreparationSection', () => {
  it('affiche la préparation : prévue par le coach, statut, catégorie et poids prévus', () => {
    render(<CoachPreparationSection preparation={PREPARATION} showUnconfirmedRegistration />);

    expect(screen.getByText('Ma préparation')).toBeInTheDocument();
    expect(screen.getByText('Prévue par mon coach')).toBeInTheDocument();
    expect(screen.getByText('Prêt')).toBeInTheDocument();
    expect(screen.getByText('Senior')).toBeInTheDocument();
    expect(screen.getByText('-68kg')).toBeInTheDocument();
  });

  it('sans participation confirmée : "Inscription officielle — Non confirmée"', () => {
    render(<CoachPreparationSection preparation={PREPARATION} showUnconfirmedRegistration />);

    expect(screen.getByText('Inscription officielle')).toBeInTheDocument();
    expect(screen.getByText('Non confirmée')).toBeInTheDocument();
  });

  it('avec participation (ou chargement) : jamais de "Non confirmée"', () => {
    render(<CoachPreparationSection preparation={PREPARATION} showUnconfirmedRegistration={false} />);

    expect(screen.queryByText('Non confirmée')).not.toBeInTheDocument();
    expect(screen.queryByText('Inscription officielle')).not.toBeInTheDocument();
  });

  it('cellules absentes si la catégorie n\'est pas renseignée', () => {
    render(
      <CoachPreparationSection
        preparation={{ status: 'envisage', categorieAgePrevue: null, categoriePoidsPrevue: null }}
        showUnconfirmedRegistration
      />,
    );

    expect(screen.getByText('Envisagée')).toBeInTheDocument();
    expect(screen.queryByText('Catégorie')).not.toBeInTheDocument();
    expect(screen.queryByText('Poids')).not.toBeInTheDocument();
  });

  it('forfait affiché avec son statut', () => {
    render(
      <CoachPreparationSection
        preparation={{ ...PREPARATION, status: 'forfait' }}
        showUnconfirmedRegistration
      />,
    );

    expect(screen.getByText('Forfait')).toBeInTheDocument();
  });

  it('aucune note/objectif coach rendu, même si la donnée en contenait par erreur', () => {
    const leaky = { ...PREPARATION, note_coach: 'NOTE-SECRETE', coachNote: 'NOTE-SECRETE', objectif: 'OBJ-SECRET' };
    const { container } = render(<CoachPreparationSection preparation={leaky} showUnconfirmedRegistration />);

    expect(container.textContent).not.toContain('NOTE-SECRETE');
    expect(container.textContent).not.toContain('OBJ-SECRET');
  });
});
