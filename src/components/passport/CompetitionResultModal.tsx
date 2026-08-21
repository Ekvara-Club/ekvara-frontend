import { useState, type FormEvent } from 'react';
import { updateCompetitionResult } from '../../services/athletes.api';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import type { ParticipationListItem, UpdateParticipationResultPayload } from '../../types/activity';
import { hasCompetitionResult } from '../../utils/participationStats';

interface CompetitionResultModalProps {
  athleteId: string;
  participation: ParticipationListItem;
  onClose: () => void;
  onSaved: (updated: ParticipationListItem) => void;
}

type MedalValue = '' | 'or' | 'argent' | 'bronze';

const MEDAL_OPTIONS: { value: MedalValue; label: string }[] = [
  { value: '', label: 'Aucune' },
  { value: 'or', label: 'Or' },
  { value: 'argent', label: 'Argent' },
  { value: 'bronze', label: 'Bronze' },
];

function isKnownMedal(value: string | null): value is Exclude<MedalValue, ''> {
  return value === 'or' || value === 'argent' || value === 'bronze';
}

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

// undefined : champ laissé vide, rien à envoyer pour ce champ. 'invalid' :
// une valeur a été saisie mais ne respecte pas la contrainte (entier, borne
// minimale) — distinct d'une simple absence.
function parseOptionalInt(value: string, min: number): number | undefined | 'invalid' {
  const trimmed = value.trim();
  if (trimmed === '') return undefined;
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < min) return 'invalid';
  return parsed;
}

function CompetitionResultModal({ athleteId, participation, onClose, onSaved }: CompetitionResultModalProps) {
  const alreadyHasResult = hasCompetitionResult(participation);

  const [classement, setClassement] = useState(participation.classement?.toString() ?? '');
  const [medaille, setMedaille] = useState<MedalValue>(
    isKnownMedal(participation.medaille) ? participation.medaille : '',
  );
  const [victoires, setVictoires] = useState(participation.victoires?.toString() ?? '');
  const [defaites, setDefaites] = useState(participation.defaites?.toString() ?? '');

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitError(null);

    const classementValue = parseOptionalInt(classement, 1);
    if (classementValue === 'invalid') {
      setSubmitError('Le classement doit être un nombre entier supérieur ou égal à 1.');
      return;
    }

    const victoiresValue = parseOptionalInt(victoires, 0);
    if (victoiresValue === 'invalid') {
      setSubmitError('Le nombre de victoires doit être un nombre entier positif ou nul.');
      return;
    }

    const defaitesValue = parseOptionalInt(defaites, 0);
    if (defaitesValue === 'invalid') {
      setSubmitError('Le nombre de défaites doit être un nombre entier positif ou nul.');
      return;
    }

    const payload: UpdateParticipationResultPayload = {};
    if (classementValue !== undefined) payload.classement = classementValue;
    if (medaille !== '') {
      payload.medaille = medaille;
    } else if (participation.medaille !== null) {
      // Une médaille était déjà enregistrée et "Aucune" a été choisi : retrait
      // explicite. `null` est envoyé volontairement (jamais `undefined`, qui
      // signifierait "ne pas toucher au champ").
      payload.medaille = null;
    }
    // Sinon (aucune médaille n'a jamais existé et "Aucune" reste sélectionné) :
    // rien à envoyer pour ce champ, inutile de forcer une valeur.
    if (victoiresValue !== undefined) payload.victoires = victoiresValue;
    if (defaitesValue !== undefined) payload.defaites = defaitesValue;

    // Même règle que le backend (body vide refusé) : vérifiée ici pour ne
    // jamais dépendre d'un aller-retour réseau pour ce cas.
    if (Object.keys(payload).length === 0) {
      setSubmitError('Renseigne au moins une information de résultat.');
      return;
    }

    setSubmitting(true);
    updateCompetitionResult(athleteId, participation.competition.id, payload)
      .then((updated) => {
        onSaved(updated);
      })
      .catch((error: Error) => {
        console.error("Erreur lors de l'enregistrement du résultat", error);
        // Conserve le formulaire tel quel (aucune donnée saisie n'est perdue) :
        // seul le message d'erreur est affiché, jamais de réinitialisation.
        setSubmitError(error.message || "Impossible d'enregistrer le résultat pour le moment.");
      })
      .finally(() => {
        setSubmitting(false);
      });
  }

  return (
    <Modal title={alreadyHasResult ? 'Modifier le résultat' : 'Renseigner le résultat'} onClose={onClose}>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-y-auto p-5">
          <p className="font-medium text-ekvara-black">{participation.competition.nom}</p>
          <p className="text-sm text-ekvara-muted">{formatCompetitionDate(participation.competition.dateDebut)}</p>

          <div className="mt-4 flex flex-col gap-3">
            <div>
              <label htmlFor="result-classement" className="text-sm font-medium text-ekvara-black">
                Classement
              </label>
              <input
                id="result-classement"
                type="number"
                min={1}
                step={1}
                value={classement}
                onChange={(event) => setClassement(event.target.value)}
                placeholder="3"
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label htmlFor="result-medaille" className="text-sm font-medium text-ekvara-black">
                Médaille
              </label>
              <select
                id="result-medaille"
                value={medaille}
                onChange={(event) => setMedaille(event.target.value as MedalValue)}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                {MEDAL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="result-victoires" className="text-sm font-medium text-ekvara-black">
                Victoires
              </label>
              <input
                id="result-victoires"
                type="number"
                min={0}
                step={1}
                value={victoires}
                onChange={(event) => setVictoires(event.target.value)}
                placeholder="0"
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label htmlFor="result-defaites" className="text-sm font-medium text-ekvara-black">
                Défaites
              </label>
              <input
                id="result-defaites"
                type="number"
                min={0}
                step={1}
                value={defaites}
                onChange={(event) => setDefaites(event.target.value)}
                placeholder="0"
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
              {submitting ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </form>
    </Modal>
  );
}

export default CompetitionResultModal;
