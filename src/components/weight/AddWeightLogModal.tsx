import { useState, type FormEvent } from 'react';
import { createWeightLog } from '../../services/athletes.api';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import type { CreateWeightLogPayload, WeightLog } from '../../types/weight';

interface AddWeightLogModalProps {
  athleteId: string;
  onClose: () => void;
  onSaved: (created: WeightLog) => void;
}

// Construit une date à partir de champs date/heure saisis en heure locale par
// l'utilisateur, puis convertit en ISO (UTC) : jamais de concaténation de
// chaînes, qui interpréterait à tort l'heure locale comme de l'UTC. Les deux
// champs sont optionnels : date vide -> aujourd'hui, heure vide -> minuit.
function buildMeasuredAtIso(dateStr: string, timeStr: string): string | undefined {
  if (dateStr.trim() === '' && timeStr.trim() === '') return undefined;

  const effectiveDate = dateStr.trim() !== '' ? dateStr : new Date().toISOString().slice(0, 10);
  const effectiveTime = timeStr.trim() !== '' ? timeStr : '00:00';

  const [year, month, day] = effectiveDate.split('-').map(Number);
  const [hours, minutes] = effectiveTime.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0, 0).toISOString();
}

function AddWeightLogModal({ athleteId, onClose, onSaved }: AddWeightLogModalProps) {
  const [weight, setWeight] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [note, setNote] = useState('');

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitError(null);

    const parsedWeight = Number(weight.trim().replace(',', '.'));
    if (!Number.isFinite(parsedWeight) || parsedWeight <= 0) {
      setSubmitError('Le poids doit être un nombre positif.');
      return;
    }

    const payload: CreateWeightLogPayload = { weight: parsedWeight };

    const measuredAt = buildMeasuredAtIso(date, time);
    if (measuredAt !== undefined) payload.measuredAt = measuredAt;

    const trimmedNote = note.trim();
    if (trimmedNote !== '') payload.note = trimmedNote;

    setSubmitting(true);
    createWeightLog(athleteId, payload)
      .then((created) => {
        onSaved(created);
      })
      .catch((error: Error) => {
        console.error("Erreur lors de l'enregistrement de la pesée", error);
        // Conserve le formulaire tel quel (aucune donnée saisie n'est perdue).
        setSubmitError(error.message || "Impossible d'enregistrer la pesée pour le moment.");
      })
      .finally(() => {
        setSubmitting(false);
      });
  }

  return (
    <Modal title="Ajouter une pesée" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-y-auto p-5">
        <div className="flex flex-col gap-3">
          <div>
            <label htmlFor="weight-log-weight" className="text-sm font-medium text-ekvara-black">
              Poids (kg) *
            </label>
            <input
              id="weight-log-weight"
              type="number"
              min={0.01}
              step="any"
              value={weight}
              onChange={(event) => setWeight(event.target.value)}
              placeholder="74,5"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <p className="text-sm font-medium text-ekvara-black">Date / heure de mesure</p>
            <div className="mt-1 flex gap-2">
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                aria-label="Date de mesure"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              <input
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
                aria-label="Heure de mesure"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <p className="mt-1 text-xs text-ekvara-muted">Laisse vide pour utiliser la date et l'heure actuelles.</p>
          </div>

          <div>
            <label htmlFor="weight-log-note" className="text-sm font-medium text-ekvara-black">
              Note (optionnel)
            </label>
            <input
              id="weight-log-note"
              type="text"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Après l'entraînement, à jeun..."
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
    </Modal>
  );
}

export default AddWeightLogModal;
