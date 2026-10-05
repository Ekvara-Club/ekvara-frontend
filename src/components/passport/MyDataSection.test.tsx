import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MyDataSection from './MyDataSection';

const api = vi.hoisted(() => ({ downloadMyData: vi.fn(), deleteMyAccount: vi.fn() }));
vi.mock('../../services/athletes.api', () => api);

afterEach(() => {
  vi.clearAllMocks();
});

describe('MyDataSection — droits RGPD', () => {
  it('télécharger mes données', async () => {
    api.downloadMyData.mockResolvedValue(undefined);
    render(<MyDataSection athleteId="a-1" onAccountDeleted={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Télécharger mes données' }));

    expect(api.downloadMyData).toHaveBeenCalledWith('a-1');
  });

  it('suppression : bouton bloqué tant que SUPPRIMER n\'est pas tapé, puis compte supprimé et déconnexion', async () => {
    api.deleteMyAccount.mockResolvedValue(undefined);
    const onAccountDeleted = vi.fn();
    render(<MyDataSection athleteId="a-1" onAccountDeleted={onAccountDeleted} />);

    await userEvent.click(screen.getByRole('button', { name: 'Supprimer mon compte' }));
    const dialog = screen.getByRole('dialog', { name: 'Supprimer mon compte' });
    const confirm = within(dialog).getByRole('button', { name: 'Supprimer définitivement' });
    expect(confirm).toBeDisabled();

    await userEvent.type(within(dialog).getByLabelText('Tape SUPPRIMER pour confirmer'), 'SUPPRIMER');
    await userEvent.click(confirm);

    expect(api.deleteMyAccount).toHaveBeenCalledWith('a-1');
    expect(onAccountDeleted).toHaveBeenCalled();
  });

  it('suppression refusée (compte aussi coach) : message lisible, rien d\'autre', async () => {
    api.deleteMyAccount.mockRejectedValue(new Error("Ce compte est aussi un compte coach : contacte l'éditeur pour le supprimer."));
    const onAccountDeleted = vi.fn();
    render(<MyDataSection athleteId="a-1" onAccountDeleted={onAccountDeleted} />);

    await userEvent.click(screen.getByRole('button', { name: 'Supprimer mon compte' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Tape SUPPRIMER pour confirmer'), 'SUPPRIMER');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Supprimer définitivement' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('aussi un compte coach');
    expect(onAccountDeleted).not.toHaveBeenCalled();
  });
});
