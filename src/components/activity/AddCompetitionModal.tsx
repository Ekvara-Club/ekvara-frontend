import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  getCompetitionCatalog,
  participateInCompetition,
  PARTICIPATION_CONFLICT_MESSAGE,
} from '../../services/athletes.api';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import type { CompetitionCatalogItem } from '../../types/competition';
import type { CreateParticipationPayload, ParticipationListItem } from '../../types/activity';

interface AddCompetitionModalProps {
  athleteId: string;
  existingCompetitionIds: string[];
  onClose: () => void;
  onCreated: (participation: ParticipationListItem) => void;
}

// Même technique que CompetitionCard/ActivityPage : dateDebut/dateFin sont des
// DATE métier sans heure — jamais new Date() naïf, qui peut décaler le jour
// selon le fuseau du navigateur.
function parseDateOnly(dateString: string): Date {
  const [year, month, day] = dateString.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatCompetitionDate(dateString: string): string {
  return parseDateOnly(dateString).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

const SOURCE_LABELS: Record<string, string> = {
  fftda: 'FFTDA',
  world_taekwondo: 'World Taekwondo',
};

function AddCompetitionModal({
  athleteId,
  existingCompetitionIds,
  onClose,
  onCreated,
}: AddCompetitionModalProps) {
  const [catalog, setCatalog] = useState<CompetitionCatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const [selected, setSelected] = useState<CompetitionCatalogItem | null>(null);
  const [categoriePoids, setCategoriePoids] = useState('');
  const [categorieAge, setCategorieAge] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    setCatalogLoading(true);
    setCatalogError(null);

    getCompetitionCatalog()
      .then((data) => {
        if (!cancelled) setCatalog(data);
      })
      .catch((error: Error) => {
        if (!cancelled) {
          console.error('Erreur lors du chargement du catalogue des compétitions', error);
          setCatalogError(error.message);
        }
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const existingIds = useMemo(() => new Set(existingCompetitionIds), [existingCompetitionIds]);

  const results = useMemo(() => {
    const today = startOfToday();
    const normalizedQuery = query.trim().toLowerCase();

    return catalog
      .filter((c) => !existingIds.has(c.id))
      .filter((c) => parseDateOnly(c.date_fin ?? c.date_debut) >= today)
      .filter((c) => {
        if (!normalizedQuery) return true;
        return [c.nom, c.ville, c.pays].some((field) =>
          field?.toLowerCase().includes(normalizedQuery),
        );
      })
      .sort((a, b) => a.date_debut.localeCompare(b.date_debut));
  }, [catalog, existingIds, query]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;

    setSubmitError(null);

    const payload: CreateParticipationPayload = {
      categoriePoids: categoriePoids.trim() || undefined,
      categorieAge: categorieAge.trim() || undefined,
    };

    setSubmitting(true);
    participateInCompetition(athleteId, selected.id, payload)
      .then((created) => {
        onCreated(created);
      })
      .catch((error: Error) => {
        console.error("Erreur lors de l'inscription à la compétition", error);
        // Seul le message de conflit (409) vient de l'API et est sûr à afficher
        // tel quel ; toute autre erreur (réseau, 500...) reste un message
        // générique pour ne jamais exposer un message technique brut.
        const message =
          error.message === PARTICIPATION_CONFLICT_MESSAGE
            ? error.message
            : 'Impossible de rejoindre cette compétition pour le moment.';
        setSubmitError(message);
      })
      .finally(() => {
        setSubmitting(false);
      });
  }

  return (
    <Modal
      title={selected ? 'Rejoindre la compétition' : 'Choisir une compétition'}
      onClose={onClose}
    >
        {!selected && (
          <div className="flex min-h-0 flex-1 flex-col p-5">
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher par nom, ville, pays..."
              aria-label="Rechercher une compétition"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />

            <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
              {catalogLoading && <p className="text-sm text-ekvara-muted">Chargement...</p>}

              {!catalogLoading && catalogError && (
                <p className="text-sm text-red-600">Impossible de charger le catalogue.</p>
              )}

              {!catalogLoading && !catalogError && results.length === 0 && (
                <p className="text-sm text-ekvara-muted">Aucune compétition à venir trouvée.</p>
              )}

              {!catalogLoading && !catalogError && results.length > 0 && (
                <ul className="flex flex-col gap-2">
                  {results.map((competition) => (
                    <li key={competition.id}>
                      <button
                        type="button"
                        onClick={() => setSelected(competition)}
                        className="w-full rounded-md border border-gray-200 p-3 text-left text-sm transition-colors hover:border-gray-400 hover:bg-gray-50"
                      >
                        <p className="font-medium text-ekvara-black">{competition.nom}</p>
                        <p className="text-ekvara-muted">{formatCompetitionDate(competition.date_debut)}</p>
                        {(competition.ville || competition.pays) && (
                          <p className="text-ekvara-muted">
                            {[competition.ville, competition.pays].filter(Boolean).join(', ')}
                          </p>
                        )}
                        {(competition.niveau || competition.source) && (
                          <p className="mt-1 text-xs text-ekvara-muted">
                            {[competition.niveau, competition.source && SOURCE_LABELS[competition.source]]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-4 flex justify-end">
              <Button type="button" variant="secondary" onClick={onClose}>
                Annuler
              </Button>
            </div>
          </div>
        )}

        {selected && (
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-y-auto p-5">
            <button
              type="button"
              onClick={() => {
                setSelected(null);
                setSubmitError(null);
              }}
              className="self-start text-sm text-ekvara-muted hover:text-ekvara-black"
            >
              ← Retour
            </button>

            <div className="mt-3">
              <p className="font-medium text-ekvara-black">{selected.nom}</p>
              <p className="text-sm text-ekvara-muted">{formatCompetitionDate(selected.date_debut)}</p>
              {(selected.ville || selected.pays) && (
                <p className="text-sm text-ekvara-muted">
                  {[selected.ville, selected.pays].filter(Boolean).join(', ')}
                </p>
              )}
            </div>

            <div className="mt-4 flex flex-col gap-3">
              <div>
                <label htmlFor="participation-poids" className="text-sm font-medium text-ekvara-black">
                  Catégorie de poids
                </label>
                <input
                  id="participation-poids"
                  type="text"
                  value={categoriePoids}
                  onChange={(event) => setCategoriePoids(event.target.value)}
                  placeholder="-74 kg"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label htmlFor="participation-age" className="text-sm font-medium text-ekvara-black">
                  Catégorie d'âge
                </label>
                <input
                  id="participation-age"
                  type="text"
                  value={categorieAge}
                  onChange={(event) => setCategorieAge(event.target.value)}
                  placeholder="senior"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            {submitError && <p className="mt-3 text-sm text-red-600">{submitError}</p>}

            <div className="mt-4 flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
                Annuler
              </Button>
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? 'Ajout...' : 'Ajouter'}
              </Button>
            </div>
          </form>
        )}
    </Modal>
  );
}

export default AddCompetitionModal;
