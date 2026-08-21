import { useState, type FormEvent } from 'react';
import { createTraining } from '../../services/athletes.api';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import type { CreateTrainingPayload, TrainingItem } from '../../types/training';

interface AddTrainingModalProps {
  athleteId: string;
  onClose: () => void;
  onCreated: (training: TrainingItem) => void;
}

const TRAINING_TYPES: { value: string; label: string }[] = [
  { value: 'taekwondo', label: 'Taekwondo' },
  { value: 'musculation', label: 'Musculation' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'mobilite', label: 'Mobilité' },
  { value: 'recuperation', label: 'Récupération' },
  { value: 'stage', label: 'Stage' },
];

// Construit une date à partir de champs date/heure saisis en heure locale par
// l'utilisateur, puis convertit en ISO (UTC) : jamais de concaténation de
// chaînes, qui interpréterait à tort l'heure locale comme de l'UTC.
function toIsoFromLocal(dateStr: string, timeStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0, 0).toISOString();
}

function AddTrainingModal({ athleteId, onClose, onCreated }: AddTrainingModalProps) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('');
  const [subType, setSubType] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [level, setLevel] = useState('');
  const [description, setDescription] = useState('');

  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!title.trim()) {
      setValidationError('Le titre est obligatoire.');
      return;
    }
    if (!date) {
      setValidationError('La date est obligatoire.');
      return;
    }
    if (!startTime) {
      setValidationError("L'heure de début est obligatoire.");
      return;
    }
    if (endTime && endTime <= startTime) {
      setValidationError("L'heure de fin doit être après l'heure de début.");
      return;
    }

    setValidationError(null);
    setSubmitError(null);

    const payload: CreateTrainingPayload = {
      title: title.trim(),
      type: type || undefined,
      subType: subType.trim() || undefined,
      startAt: toIsoFromLocal(date, startTime),
      endAt: endTime ? toIsoFromLocal(date, endTime) : undefined,
      location: location.trim() || undefined,
      level: level.trim() || undefined,
      description: description.trim() || undefined,
    };

    setSubmitting(true);
    createTraining(athleteId, payload)
      .then((created) => {
        onCreated(created);
      })
      .catch((error: Error) => {
        console.error("Erreur lors de la création de l'entraînement", error);
        setSubmitError("Impossible d'ajouter cet entraînement pour le moment.");
      })
      .finally(() => {
        setSubmitting(false);
      });
  }

  return (
    <Modal title="Ajouter un entraînement" onClose={onClose}>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-5">
          <div>
            <label htmlFor="training-title" className="text-sm font-medium text-ekvara-black">
              Titre *
            </label>
            <input
              id="training-title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              autoFocus
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="training-type" className="text-sm font-medium text-ekvara-black">
              Type de séance
            </label>
            <select
              id="training-type"
              value={type}
              onChange={(event) => setType(event.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">—</option>
              {TRAINING_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="training-subtype" className="text-sm font-medium text-ekvara-black">
              Sous-type
            </label>
            <input
              id="training-subtype"
              type="text"
              value={subType}
              onChange={(event) => setSubType(event.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="training-date" className="text-sm font-medium text-ekvara-black">
                Date *
              </label>
              <input
                id="training-date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="training-start" className="text-sm font-medium text-ekvara-black">
                Heure de début *
              </label>
              <input
                id="training-start"
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="training-end" className="text-sm font-medium text-ekvara-black">
                Heure de fin
              </label>
              <input
                id="training-end"
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label htmlFor="training-location" className="text-sm font-medium text-ekvara-black">
              Lieu
            </label>
            <input
              id="training-location"
              type="text"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="training-level" className="text-sm font-medium text-ekvara-black">
              Niveau
            </label>
            <input
              id="training-level"
              type="text"
              value={level}
              onChange={(event) => setLevel(event.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="training-description" className="text-sm font-medium text-ekvara-black">
              Description
            </label>
            <textarea
              id="training-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          {validationError && <p className="text-sm text-red-600">{validationError}</p>}
          {submitError && <p className="text-sm text-red-600">{submitError}</p>}

          <div className="mt-2 flex justify-end gap-3">
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

export default AddTrainingModal;
