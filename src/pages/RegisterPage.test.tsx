import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RegisterPage from './RegisterPage';

const api = vi.hoisted(() => ({ validateInvitationCode: vi.fn() }));
const auth = vi.hoisted(() => ({ register: vi.fn() }));

vi.mock('../services/auth.api', () => api);
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => auth }));

async function enterValidCode(code = 'EKV-ABCD1234') {
  await userEvent.type(screen.getByLabelText("Code d'invitation"), code);
  await userEvent.click(screen.getByRole('button', { name: 'Continuer' }));
  await screen.findByRole('heading', { name: 'Club Taekwondo Eaubonne' });
}

async function fillForm() {
  await userEvent.type(screen.getByLabelText('Prénom'), 'Kaïs');
  await userEvent.type(screen.getByLabelText('Nom'), 'Dilmi');
  await userEvent.type(screen.getByLabelText('Email'), 'kais@example.fr');
  await userEvent.type(screen.getByLabelText('Mot de passe'), 'motdepasse');
}

describe('RegisterPage — inscription sur invitation', () => {
  beforeEach(() => {
    api.validateInvitationCode.mockResolvedValue({ valid: true, club: { name: 'Club Taekwondo Eaubonne' }, expiresAt: '2026-12-31T00:00:00.000Z' });
    auth.register.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('code valide ⇒ club affiché ; register envoie le code (revalidé par le backend) et les champs saisis', async () => {
    render(<RegisterPage />);

    await enterValidCode();
    expect(api.validateInvitationCode).toHaveBeenCalledWith('EKV-ABCD1234');
    await fillForm();
    await userEvent.click(screen.getByRole('button', { name: 'Créer mon compte' }));

    expect(auth.register).toHaveBeenCalledWith({
      invitationCode: 'EKV-ABCD1234',
      email: 'kais@example.fr',
      password: 'motdepasse',
      nom: 'Dilmi',
      prenom: 'Kaïs',
    });
  });

  it('code refusé : message backend affiché tel quel, on reste sur l\'étape code, jamais de register', async () => {
    api.validateInvitationCode.mockRejectedValue(new Error('Ce code a expiré. Demande un nouveau code à ton coach.'));
    render(<RegisterPage />);

    await userEvent.type(screen.getByLabelText("Code d'invitation"), 'EKV-OLD');
    await userEvent.click(screen.getByRole('button', { name: 'Continuer' }));

    expect(await screen.findByText('Ce code a expiré. Demande un nouveau code à ton coach.')).toBeInTheDocument();
    expect(screen.getByLabelText("Code d'invitation")).toHaveValue('EKV-OLD');
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();
    expect(auth.register).not.toHaveBeenCalled();
  });

  it('register en échec : message affiché, formulaire conservé', async () => {
    auth.register.mockRejectedValue(new Error('Un compte existe déjà avec cet email.'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<RegisterPage />);

    await enterValidCode();
    await fillForm();
    await userEvent.click(screen.getByRole('button', { name: 'Créer mon compte' }));

    expect(await screen.findByText('Un compte existe déjà avec cet email.')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveValue('kais@example.fr');
    expect(screen.getByRole('button', { name: 'Créer mon compte' })).toBeEnabled();
  });

  it('"Changer de code" revient à l\'étape code avec le code déjà saisi', async () => {
    render(<RegisterPage />);

    await enterValidCode();
    await userEvent.click(screen.getByRole('button', { name: "Ce n'est pas ton club ? Changer de code" }));

    expect(screen.getByLabelText("Code d'invitation")).toHaveValue('EKV-ABCD1234');
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();
  });

  it('lien vers la connexion', () => {
    render(<RegisterPage />);

    expect(screen.getByRole('link', { name: 'Se connecter' })).toHaveAttribute('href', '/login');
  });
});
