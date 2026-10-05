import { useState, type FormEvent } from 'react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { updateAthleteCondition } from '../../services/athletes.api';
import {
  ATHLETE_CONDITION_OPTIONS,
  type AthleteConditionStatus,
  type AthleteConditionView,
} from '../../types/condition';

interface ConditionModalProps {
  athleteId: string;
  current: { status: AthleteConditionStatus; note: string | null; expectedReturn: string | null };
  onClose: () => void;
  onSaved: (view: AthleteConditionView) => void;
}

function todayLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// L'athlète déclare son état ; ses coachs le voient et sont prévenus (voir
// AthletesService.updateCondition). Commentaire et date de retour n'ont de
// sens que hors "Actif" : masqués et jamais envoyés dans ce cas.
function ConditionModal({ athleteId, current, onClose, onSaved }: ConditionModalProps) {
  const [status, setStatus] = useState<AthleteConditionStatus>(current.status);
  const [note, setNote] = useState(current.note ?? '');
  const [expectedReturn, setExpectedReturn] = useState(current.expectedReturn ?? '');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isActive = status === 'actif';

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    updateAthleteCondition(athleteId, {
      status,
      ...(isActive || note.trim() === '' ? {} : { note: note.trim() }),
      ...(isActive || expectedReturn === '' ? {} : { expectedReturn }),
    })
      .then(onSaved)
      .catch((err: Error) => {
        console.error("Erreur lors de l'enregistrement de l'état de forme", err);
        setError(err.message || "Impossible d'enregistrer ton état pour le moment.");
        setSubmitting(false);
      });
  }

  return (
    <Modal title="Mon état" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-y-auto p-5">
        <fieldset>
          <legend className="text-sm text-ekvara-black/70">Comment es-tu en ce moment ? Ton coach sera prévenu.</legend>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {ATHLETE_CONDITION_OPTIONS.map((option) => {
              const selected = status === option.value;
              return (
                <label
                  key={option.value}
                  className={`cursor-pointer rounded-md border px-3 py-2.5 transition-colors ${
                    selected ? 'border-ekvara-black bg-ekvara-black text-ekvara-surface' : 'border-gray-300 bg-white hover:border-gray-400'
                  }`}
                >
                  <input
                    type="radio"
                    name="condition"
                    value={option.value}
                    checked={selected}
                    onChange={() => setStatus(option.value)}
                    className="sr-only"
                  />
                  <span className="block text-sm font-semibold">{option.label}</span>
                  <span className={`block text-xs ${selected ? 'text-ekvara-surface/70' : 'text-ekvara-black/60'}`}>
                    {option.hint}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {!isActive && (
          <div className="mt-4 flex flex-col gap-3">
            <div>
              <label htmlFor="condition-note" className="text-sm font-medium text-ekvara-black">
                Précision (optionnel)
              </label>
              <input
                id="condition-note"
                type="text"
                maxLength={255}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Entorse cheville, grippe…"
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="condition-return" className="text-sm font-medium text-ekvara-black">
                Retour prévu (optionnel)
              </label>
              <input
                id="condition-return"
                type="date"
                min={todayLocal()}
                value={expectedReturn}
                onChange={(event) => setExpectedReturn(event.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        )}

        {error && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {error}
          </p>
        )}

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

export default ConditionModal;
