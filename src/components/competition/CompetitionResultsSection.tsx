import { useEffect, useState } from 'react';
import SectionLabel from '../ui/SectionLabel';
import StatValue from '../ui/StatValue';
import CompetitionResultFightRow from './CompetitionResultFightRow';
import { getCompetitionCategoryResults, getCompetitionResultsSummary } from '../../services/international.api';
import type { CompetitionCategoryResults, CompetitionResultsCategory, CompetitionResultsSummary } from '../../types/international';
import { formatRoundHeading, splitWeightCategory } from '../../utils/wtFormat';

interface CompetitionResultsSectionProps {
  competitionId: string;
}

const CATEGORY_PARAM = 'category';

function readCategoryFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get(CATEGORY_PARAM);
}

// La catégorie choisie vit dans l'URL (?category=<label stocké>) : un rechargement
// ou un lien partagé rouvre la même catégorie. replaceState : changer de
// catégorie ne remplit pas l'historique, "précédent" quitte la fiche.
function writeCategoryToUrl(category: string): void {
  const params = new URLSearchParams(window.location.search);
  params.set(CATEGORY_PARAM, category);
  window.history.replaceState(window.history.state, '', `${window.location.pathname}?${params.toString()}`);
}

interface CategoryGroup {
  name: string | null;
  items: { category: CompetitionResultsCategory; shortLabel: string }[];
}

// Regroupe par préfixe UNIQUEMENT les labels de forme "<Préfixe> -58kg"
// (ordre backend conservé) ; les autres labels restent entiers, dans un
// groupe sans titre en fin de liste. Le label stocké reste la clé.
function groupCategories(categories: CompetitionResultsCategory[]): CategoryGroup[] {
  const groups: CategoryGroup[] = [];
  const others: CategoryGroup = { name: null, items: [] };
  for (const category of categories) {
    const parsed = splitWeightCategory(category.label);
    if (!parsed) {
      others.items.push({ category, shortLabel: category.label });
      continue;
    }
    const last = groups[groups.length - 1];
    if (last && last.name === parsed.group) last.items.push({ category, shortLabel: parsed.weight });
    else groups.push({ name: parsed.group, items: [{ category, shortLabel: parsed.weight }] });
  }
  return others.items.length > 0 ? [...groups, others] : groups;
}

function formatCount(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

// Section autonome (même principe que CompetitionEntriesSection) : son propre
// chargement/erreur, jamais couplée au hero ni à la participation. Charge le
// résumé, puis UNIQUEMENT les combats de la catégorie sélectionnée — jamais
// tous les combats de l'événement.
function CompetitionResultsSection({ competitionId }: CompetitionResultsSectionProps) {
  const [summary, setSummary] = useState<CompetitionResultsSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState(false);

  const [selected, setSelected] = useState<string | null>(null);
  const [categoryData, setCategoryData] = useState<CompetitionCategoryResults | null>(null);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [categoryError, setCategoryError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSummaryLoading(true);
    setSummaryError(false);

    getCompetitionResultsSummary(competitionId)
      .then((data) => {
        if (cancelled) return;
        setSummary(data);
        // Catégorie de l'URL si elle existe réellement, sinon la première
        // (ordre sportif backend) — jamais une catégorie inventée.
        const fromUrl = readCategoryFromUrl();
        const initial = data.categories.find((c) => c.label === fromUrl)?.label ?? data.categories[0]?.label ?? null;
        setSelected(initial);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        console.error('Erreur lors du chargement des résultats', err);
        setSummaryError(true);
      })
      .finally(() => {
        if (!cancelled) setSummaryLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [competitionId]);

  useEffect(() => {
    if (selected === null) return;
    let cancelled = false;
    setCategoryLoading(true);
    setCategoryError(false);

    getCompetitionCategoryResults(competitionId, selected)
      .then((data) => {
        if (!cancelled) setCategoryData(data);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        console.error('Erreur lors du chargement des combats', err);
        setCategoryError(true);
      })
      .finally(() => {
        if (!cancelled) setCategoryLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [competitionId, selected]);

  function selectCategory(label: string) {
    if (label === selected) return;
    writeCategoryToUrl(label);
    setSelected(label);
  }

  const selectedCategory = summary?.categories.find((c) => c.label === selected) ?? null;

  return (
    <section className="mt-10 border-t border-gray-200 pt-8">
      <SectionLabel>Résultats de la compétition</SectionLabel>

      {summaryLoading && <p className="mt-4 text-sm text-ekvara-muted">Chargement...</p>}

      {!summaryLoading && summaryError && (
        <p className="mt-4 text-sm text-red-600">Impossible de charger les résultats.</p>
      )}

      {!summaryLoading && !summaryError && summary && (
        <>
          <div className="mt-5 grid max-w-md grid-cols-3 gap-x-6">
            <StatValue value={String(summary.matchCount)} label={summary.matchCount === 1 ? 'Combat' : 'Combats'} size="md" />
            <StatValue value={String(summary.athleteCount)} label={summary.athleteCount === 1 ? 'Athlète' : 'Athlètes'} size="md" />
            <StatValue
              value={String(summary.categories.length)}
              label={summary.categories.length === 1 ? 'Catégorie' : 'Catégories'}
              size="md"
            />
          </div>
          <p className="mt-3 text-xs text-ekvara-black/55">
            Combats publiés par World Taekwondo Results et recensés dans EKVARA.
          </p>

          <nav aria-label="Catégories" className="mt-8 space-y-4">
            {groupCategories(summary.categories).map((group) => (
              <div key={group.name ?? '__autres'} className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:gap-6">
                <p className="w-24 flex-shrink-0 text-xs font-semibold uppercase tracking-wide text-ekvara-black/55">
                  {group.name ?? 'Autres'}
                </p>
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  {group.items.map(({ category, shortLabel }) => {
                    const isSelected = category.label === selected;
                    return (
                      <button
                        key={category.label}
                        type="button"
                        onClick={() => selectCategory(category.label)}
                        aria-pressed={isSelected}
                        aria-label={category.label}
                        className={`border-b-2 pb-0.5 font-display text-base font-bold uppercase tracking-tight transition-colors ${
                          isSelected
                            ? 'border-ekvara-lime text-ekvara-black'
                            : 'border-transparent text-ekvara-black/45 hover:text-ekvara-black'
                        }`}
                      >
                        {shortLabel}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {selectedCategory && (
            <div className="mt-10">
              <h3 className="font-display text-2xl font-extrabold uppercase leading-tight tracking-tight text-ekvara-black sm:text-3xl">
                {selectedCategory.label}
              </h3>
              <p className="mt-1 text-sm text-ekvara-black/55">
                {formatCount(selectedCategory.fightCount, 'combat', 'combats')} ·{' '}
                {formatCount(selectedCategory.athleteCount, 'athlète', 'athlètes')}
              </p>

              {categoryLoading && <p className="mt-6 text-sm text-ekvara-muted">Chargement des combats...</p>}

              {!categoryLoading && categoryError && (
                <p className="mt-6 text-sm text-red-600">Impossible de charger les combats de cette catégorie.</p>
              )}

              {!categoryLoading && !categoryError && categoryData && categoryData.category === selected && (
                <div className="mt-6 space-y-8">
                  {categoryData.rounds.map((round) => (
                    <div key={round.stage ?? '__inconnu'}>
                      <h4 className="font-display text-sm font-extrabold uppercase tracking-wide text-ekvara-black">
                        {formatRoundHeading(round.stage)}
                        <span className="ml-2 font-sans text-xs font-semibold text-ekvara-black/45">
                          {round.fights.length}
                        </span>
                      </h4>
                      <ul className="mt-2 grid grid-cols-1 gap-x-10 lg:grid-cols-2">
                        {round.fights.map((fight) => (
                          <CompetitionResultFightRow key={fight.id} fight={fight} />
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default CompetitionResultsSection;
