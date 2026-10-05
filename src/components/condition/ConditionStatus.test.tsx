import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConditionStatus from './ConditionStatus';

const api = vi.hoisted(() => ({ updateAthleteCondition: vi.fn() }));
vi.mock('../../services/athletes.api', () => api);

function renderStatus(props: Partial<Parameters<typeof ConditionStatus>[0]> = {}) {
  const onSaved = vi.fn();
  render(
    <ConditionStatus athleteId="athlete-1" status="actif" note={null} expectedReturn={null} onSaved={onSaved} {...props} />,
  );
  return onSaved;
}

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe('ConditionStatus — « Mon état »', () => {
  it('Actif par défaut (champ absent de la session) ; aucun détail affiché', () => {
    renderStatus({ status: undefined });

    expect(screen.getByText('Actif')).toBeInTheDocument();
    expect(screen.queryByText(/retour prévu/)).not.toBeInTheDocument();
  });

  it('Blessé avec précision et date de retour : affichés sans décalage de jour (date métier)', () => {
    renderStatus({ status: 'blesse', note: 'Entorse cheville', expectedReturn: '2026-10-20T00:00:00.000Z' });

    expect(screen.getByText('Blessé')).toBeInTheDocument();
    expect(screen.getByText('Entorse cheville · retour prévu le 20 octobre')).toBeInTheDocument();
  });

  it('déclarer une blessure : précision et date envoyées, la session est mise à jour', async () => {
    const view = { status: 'blesse', note: 'Entorse cheville', expectedReturn: '2099-10-20', updatedAt: '2026-10-05T10:00:00.000Z' };
    api.updateAthleteCondition.mockResolvedValue(view);
    const onSaved = renderStatus();

    await userEvent.click(screen.getByRole('button', { name: 'Modifier' }));
    const dialog = screen.getByRole('dialog', { name: 'Mon état' });
    expect(within(dialog).queryByLabelText('Précision (optionnel)')).not.toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole('radio', { name: /Blessé/ }));
    await userEvent.type(within(dialog).getByLabelText('Précision (optionnel)'), 'Entorse cheville');
    fireEvent.change(within(dialog).getByLabelText('Retour prévu (optionnel)'), { target: { value: '2099-10-20' } });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Enregistrer' }));

    expect(api.updateAthleteCondition).toHaveBeenCalledWith('athlete-1', {
      status: 'blesse',
      note: 'Entorse cheville',
      expectedReturn: '2099-10-20',
    });
    expect(onSaved).toHaveBeenCalledWith(view);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('repasser Actif : ni précision ni date envoyées, même si elles existaient', async () => {
    api.updateAthleteCondition.mockResolvedValue({ status: 'actif', note: null, expectedReturn: null, updatedAt: null });
    renderStatus({ status: 'malade', note: 'Grippe', expectedReturn: '2099-10-20T00:00:00.000Z' });

    await userEvent.click(screen.getByRole('button', { name: 'Modifier' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('radio', { name: /Actif/ }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Enregistrer' }));

    expect(api.updateAthleteCondition).toHaveBeenCalledWith('athlete-1', { status: 'actif' });
  });

  it('refus backend : message lisible, modale ouverte, choix conservé', async () => {
    api.updateAthleteCondition.mockRejectedValue(new Error('La date de retour prévue ne peut pas être déjà passée'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const onSaved = renderStatus();

    await userEvent.click(screen.getByRole('button', { name: 'Modifier' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('radio', { name: /Absent/ }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Enregistrer' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('La date de retour prévue ne peut pas être déjà passée');
    expect(within(dialog).getByRole('radio', { name: /Absent/ })).toBeChecked();
    expect(onSaved).not.toHaveBeenCalled();
  });
});
