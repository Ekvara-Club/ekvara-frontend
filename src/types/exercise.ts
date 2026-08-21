// GET /exercises et GET /exercises/:id : catalogue global (pas de relation à
// athlete côté backend), réponse Prisma brute (snake_case) — mêmes champs pour
// la liste et pour la fiche détaillée.
export interface Exercise {
  id: string;
  titre: string;
  type_exercice: string | null;
  panel_technique: string | null;
  niveau: string | null;
  description: string | null;
  video_url: string | null;
  gratuit: boolean | null;
}
