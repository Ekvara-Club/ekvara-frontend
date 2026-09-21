import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from './LoginPage';

const auth = vi.hoisted(() => ({ value: { login: vi.fn(), sessionNotice: null as string | null } }));

vi.mock('../contexts/AuthContext', () => ({ useAuth: () => auth.value }));
vi.mock('../components/auth/AuthBrandPanel', () => ({ default: () => null }));

afterEach(() => {
  auth.value = { login: vi.fn(), sessionNotice: null };
});

describe('LoginPage', () => {
  it('sans perte de session : aucun message', () => {
    render(<LoginPage />);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('session expirée : explique pourquoi l\'utilisateur est ici', () => {
    auth.value = { login: vi.fn(), sessionNotice: 'Ta session a expiré. Reconnecte-toi pour continuer.' };

    render(<LoginPage />);

    expect(screen.getByRole('status')).toHaveTextContent('Ta session a expiré');
  });

  it('erreur de connexion (ex. compte sans accès athlète) affichée telle quelle', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    auth.value = {
      login: vi.fn().mockRejectedValue(new Error("Ce compte ne possède pas d'accès athlète.")),
      sessionNotice: null,
    };
    const user = userEvent.setup();

    render(<LoginPage />);
    await user.type(screen.getByLabelText('Email'), 'sophie@ekvara.fr');
    await user.type(screen.getByLabelText('Mot de passe'), 'x');
    await user.click(screen.getByRole('button', { name: 'Se connecter' }));

    await waitFor(() => expect(screen.getByText("Ce compte ne possède pas d'accès athlète.")).toBeInTheDocument());
    consoleError.mockRestore();
  });
});
