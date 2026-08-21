import type { CompetitionEntryCategory } from '../types/competition-entries';

// Correspondance PRUDENTE entre la participation de l'athlète et une
// catégorie d'inscrits Martial Events (voir ticket "Afficher les inscrits").
// Le backend a déjà normalisé les catégories (voir me-normalizer.ts côté
// backend) — jamais un gros normalizer côté frontend : uniquement trim +
// lowercase pour une comparaison défensive ("senior" ↔ "Senior").
//
// Le genre (athlete.genre = "homme"/vide côté EKVARA vs "male"/"female" côté
// entries) n'est volontairement PAS utilisé : les deux vocabulaires ne
// correspondent pas directement, et construire une table de traduction
// irait à l'encontre de la consigne "ne devine pas le genre". Seuls
// categorieAge et categoriePoids, déjà dans un vocabulaire directement
// comparable à ageCategory/weightCategory, servent de signal.
function normalizeForMatch(value: string): string {
  return value.trim().toLowerCase();
}

// null contre null = les deux ne renseignent pas ce champ, une correspondance
// valide (ex. catégorie Poomsae sans poids). null contre une valeur (dans un
// sens ou l'autre) = jamais une correspondance : on ne devine rien.
function fieldsMatch(participationValue: string | null, categoryValue: string | null): boolean {
  if (participationValue === null && categoryValue === null) return true;
  if (participationValue === null || categoryValue === null) return false;
  return normalizeForMatch(participationValue) === normalizeForMatch(categoryValue);
}

// Renvoie la catégorie correspondante UNIQUEMENT si elle est déterminée sans
// ambiguïté : aucune catégorie candidate, ou plusieurs candidates
// (categorieAge seul recoupant plusieurs poids par exemple) -> null, jamais
// un choix arbitraire mis en avant.
export function findMyEntryCategory(
  categories: CompetitionEntryCategory[],
  categorieAge: string | null,
  categoriePoids: string | null,
): CompetitionEntryCategory | null {
  if (categorieAge === null && categoriePoids === null) return null;

  const matches = categories.filter(
    (category) => fieldsMatch(categorieAge, category.ageCategory) && fieldsMatch(categoriePoids, category.weightCategory),
  );

  return matches.length === 1 ? matches[0] : null;
}
