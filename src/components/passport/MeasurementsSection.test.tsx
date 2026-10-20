import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MeasurementsSection from './MeasurementsSection';

const api = vi.hoisted(() => ({ updateAthleteMeasurements: vi.fn() }));
vi.mock('../../services/athletes.api', () => api);

function renderSection(props: Partial<Parameters<typeof MeasurementsSection>[0]> = {}) {
  const onSaved = vi.fn();
  render(<MeasurementsSection athleteId="athlete-1" tailleCm={null} longueurBrasCm={null} onSaved={onSaved} {...props} />);
  return onSaved;
}

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe('MeasurementsSection — passeport', () => {
  it('non renseignées (ou absentes de la session) : tirets et message, jamais une valeur inventée', () => {
    renderSection({ tailleCm: undefined, longueurBrasCm: undefined });
    expect(screen.getAllByText('—')).toHaveLength(2);
    expect(screen.getByText(/Non renseignées/)).toBeInTheDocument();
  });

  it('valeurs affichées en cm', () => {
    renderSection({ tailleCm: 178, longueurBrasCm: 72 });
    expect(screen.getByText('178')).toBeInTheDocument();
    expect(screen.getByText('Taille')).toBeInTheDocument();
    expect(screen.getByText('72')).toBeInTheDocument();
    expect(screen.queryByText(/Non renseignées/)).not.toBeInTheDocument();
  });

  it("modifier : valeurs pré-remplies, envoi en entiers, champ vidé = non renseigné, la session est mise à jour", async () => {
    api.updateAthleteMeasurements.mockResolvedValue({ tailleCm: 180, longueurBrasCm: null });
    const onSaved = renderSection({ tailleCm: 178, longueurBrasCm: 72 });

    await userEvent.click(screen.getByRole('button', { name: 'Modifier mes mensurations' }));
    const dialog = screen.getByRole('dialog', { name: 'Mes mensurations' });
    const height = within(dialog).getByLabelText('Taille');
    expect(height).toHaveValue(178);
    await userEvent.clear(height);
    await userEvent.type(height, '180');
    await userEvent.clear(within(dialog).getByLabelText('Longueur de bras'));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Enregistrer' }));

    expect(api.updateAthleteMeasurements).toHaveBeenCalledWith('athlete-1', { tailleCm: 180, longueurBrasCm: null });
    await vi.waitFor(() => expect(onSaved).toHaveBeenCalledWith({ tailleCm: 180, longueurBrasCm: null }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it.each([
    ['taille hors bornes', 'Taille', '300', 'Taille : entre 100 et 250 cm'],
    ['taille décimale', 'Taille', '178.5', 'Taille : nombre entier de centimètres'],
    ['longueur de bras hors bornes', 'Longueur de bras', '20', 'Longueur de bras : entre 40 et 130 cm'],
  ])('%s : message, aucun envoi', async (_label, field, value, message) => {
    renderSection();
    await userEvent.click(screen.getByRole('button', { name: 'Modifier mes mensurations' }));
    const dialog = screen.getByRole('dialog', { name: 'Mes mensurations' });
    await userEvent.type(within(dialog).getByLabelText(field), value);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Enregistrer' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent(message);
    expect(api.updateAthleteMeasurements).not.toHaveBeenCalled();
  });

  it('refus du serveur : message relayé, la fenêtre reste ouverte', async () => {
    api.updateAthleteMeasurements.mockRejectedValue(new Error('La taille doit être comprise entre 100 et 250 cm'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const onSaved = renderSection();
    await userEvent.click(screen.getByRole('button', { name: 'Modifier mes mensurations' }));
    const dialog = screen.getByRole('dialog', { name: 'Mes mensurations' });
    await userEvent.type(within(dialog).getByLabelText('Taille'), '178');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Enregistrer' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('La taille doit être comprise entre 100 et 250 cm');
    expect(onSaved).not.toHaveBeenCalled();
  });
});
