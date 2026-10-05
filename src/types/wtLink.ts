import type { WtAthleteSummary } from './international';

// GET/PUT/DELETE /athletes/:id/wt-profile (voir WtLinksService) : le lien
// n'est jamais posé automatiquement — l'athlète le demande, son coach le
// confirme ("confirmed") ou le refuse (le lien disparaît).
export type WtLinkStatus = 'pending' | 'confirmed';

export interface WtProfileLink {
  status: WtLinkStatus;
  requestedAt: string;
  decidedAt: string | null;
  externalAthlete: WtAthleteSummary;
}

export interface WtProfileView {
  link: WtProfileLink | null;
  suggestions: WtAthleteSummary[];
}
