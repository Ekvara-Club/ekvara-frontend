// Forme réelle de GET /auth/me : c'est exactement ce que renvoie
// AthletesService.findOne() (même forme que GET /athletes/:id), pas une vue
// camelCase mappée comme les autres endpoints. Champs bruts Prisma.
export interface AuthClub {
  id: string;
  nom: string;
  pays: string | null;
  ville: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface AuthUser {
  id: string;
  email: string;
  nom: string | null;
  prenom: string | null;
  langue: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface AuthMeResponse {
  id: string; // athlete.id — c'est la valeur utilisée pour tous les appels métier
  user_id: string;
  club_id: string | null;
  categorie_age: string | null;
  genre: string | null;
  grade: string | null;
  date_naissance: string | null;
  niveau_sportif: string | null;
  // État de forme (colonnes athlete brutes renvoyées par /auth/me) :
  // etat_forme_retour est une date métier sérialisée en ISO minuit UTC.
  etat_forme: string;
  etat_forme_note: string | null;
  etat_forme_retour: string | null;
  etat_forme_updated_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  club: AuthClub | null;
  app_user: AuthUser;
}

export interface RegisterPayload {
  invitationCode: string;
  email: string;
  password: string;
  nom: string;
  prenom: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

// Forme de POST /auth/invitations/validate : uniquement ce qui est
// nécessaire pour afficher "Tu as été invité à rejoindre <club>" — jamais de
// coachId, clubId brut ou autre métadonnée interne (voir backend
// InvitationsService.validate).
export interface ValidateInvitationResult {
  valid: true;
  club: { name: string };
  expiresAt: string;
}
