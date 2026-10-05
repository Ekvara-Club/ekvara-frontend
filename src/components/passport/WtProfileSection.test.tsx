import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WtProfileSection from './WtProfileSection';
import type { WtAthleteProfile } from '../../types/international';

const athletesApi = vi.hoisted(() => ({ getWtProfile: vi.fn(), requestWtProfileLink: vi.fn(), unlinkWtProfile: vi.fn() }));
const intlApi = vi.hoisted(() => ({ getWtAthlete: vi.fn(), getWtAthleteCompetitions: vi.fn(), searchWtAthletes: vi.fn() }));
vi.mock('../../services/athletes.api', () => athletesApi);
vi.mock('../../services/international.api', () => intlApi);
vi.mock('../../utils/navigation', () => ({ handleNavClick: vi.fn() }));

const ME = { id: 'ext-me', displayName: 'Kais DILMI', countryCode: 'FRA' };
const PROFILE: WtAthleteProfile = {
  ...ME,
  imageUrl: null,
  sources: [],
  stats: { sourceRecord: null, recorded: { fights: 12, wins: 8, losses: 4, unknown: 0, competitions: 5, winRate: 0.67 } },
};

afterEach(() => {
  vi.clearAllMocks();
});

describe('WtProfileSection — palmarès international', () => {
  it('sans lien : suggestion "On a peut-être trouvé ton profil", "C\'est moi" envoie la demande puis affiche l\'attente du coach', async () => {
    athletesApi.getWtProfile.mockResolvedValue({ link: null, suggestions: [ME] });
    athletesApi.requestWtProfileLink.mockResolvedValue({
      link: { status: 'pending', requestedAt: '2026-10-05T10:00:00.000Z', decidedAt: null, externalAthlete: ME },
      suggestions: [],
    });
    render(<WtProfileSection athleteId="athlete-1" />);

    expect(await screen.findByText('On a peut-être trouvé ton profil')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: "C'est moi" }));

    expect(athletesApi.requestWtProfileLink).toHaveBeenCalledWith('athlete-1', 'ext-me');
    expect(await screen.findByText(/Demande envoyée à ton coach/)).toBeInTheDocument();
    expect(intlApi.getWtAthlete).not.toHaveBeenCalled();
  });

  it('recherche manuelle quand aucune suggestion ; profil déjà pris (409) -> message lisible', async () => {
    athletesApi.getWtProfile.mockResolvedValue({ link: null, suggestions: [] });
    intlApi.searchWtAthletes.mockResolvedValue({ items: [{ ...ME, sources: [], fightCount: 12 }], total: 1, page: 1, limit: 10 });
    athletesApi.requestWtProfileLink.mockRejectedValue(new Error('Ce profil World Taekwondo est déjà relié à un autre compte.'));
    render(<WtProfileSection athleteId="athlete-1" />);

    await userEvent.type(await screen.findByRole('searchbox', { name: 'Rechercher mon profil World Taekwondo' }), 'dilmi');
    await userEvent.click(screen.getByRole('button', { name: 'Rechercher' }));
    await userEvent.click(await screen.findByRole('button', { name: "C'est moi" }));

    expect(intlApi.searchWtAthletes).toHaveBeenCalledWith({ search: 'dilmi', page: 1, limit: 10 });
    expect(await screen.findByRole('alert')).toHaveTextContent('déjà relié à un autre compte');
  });

  it('demande en attente : jamais de palmarès affiché avant la confirmation du coach ; annulation possible', async () => {
    athletesApi.getWtProfile.mockResolvedValue({
      link: { status: 'pending', requestedAt: '2026-10-05T10:00:00.000Z', decidedAt: null, externalAthlete: ME },
      suggestions: [],
    });
    athletesApi.unlinkWtProfile.mockResolvedValue({ link: null, suggestions: [ME] });
    render(<WtProfileSection athleteId="athlete-1" />);

    expect(await screen.findByText(/Demande envoyée à ton coach/)).toBeInTheDocument();
    expect(intlApi.getWtAthlete).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Annuler la demande' }));
    expect(athletesApi.unlinkWtProfile).toHaveBeenCalledWith('athlete-1');
    expect(await screen.findByText('On a peut-être trouvé ton profil')).toBeInTheDocument();
  });

  it('lien confirmé : bilan WT (compétitions, victoires, défaites) et lien vers le palmarès complet', async () => {
    athletesApi.getWtProfile.mockResolvedValue({
      link: { status: 'confirmed', requestedAt: '2026-10-05T10:00:00.000Z', decidedAt: '2026-10-05T11:00:00.000Z', externalAthlete: ME },
      suggestions: [],
    });
    intlApi.getWtAthlete.mockResolvedValue(PROFILE);
    intlApi.getWtAthleteCompetitions.mockResolvedValue({ items: [], total: 0, page: 1, limit: 3 });
    render(<WtProfileSection athleteId="athlete-1" />);

    expect(await screen.findByText('Victoires')).toBeInTheDocument();
    expect(screen.getByText('Victoires').previousElementSibling?.textContent).toBe('8');
    expect(screen.getByText('Défaites').previousElementSibling?.textContent).toBe('4');
    expect(screen.getByText('Compétitions').previousElementSibling?.textContent).toBe('5');
    expect(intlApi.getWtAthleteCompetitions).toHaveBeenCalledWith('ext-me', { page: 1, limit: 3 });
    expect(screen.getByRole('link', { name: 'Voir tout mon palmarès international →' })).toHaveAttribute('href', '/athletes-wt/ext-me');
  });
});
