import { useState, type FormEvent } from 'react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import SectionLabel from '../ui/SectionLabel';
import { updateAthleteMeasurements } from '../../services/athletes.api';
import { ARM_LENGTH_CM, HEIGHT_CM, type AthleteMeasurements } from '../../types/measurements';

interface MeasurementsSectionProps {
  athleteId: string;
  // Depuis la session (/auth/me) ; undefined = backend antérieur.
  tailleCm: number | null | undefined;
  longueurBrasCm: number | null | undefined;
  onSaved: (view: AthleteMeasurements) => void;
}

// Mensurations du passeport : déclarées par l'athlète, visibles par ses
// coachs. Présentationnel : la valeur vient de la session (useAuth), mise à
// jour par PassportPage après enregistrement.
function MeasurementsSection({ athleteId, tailleCm, longueurBrasCm, onSaved }: MeasurementsSectionProps) {
  const [open, setOpen] = useState(false);
  const taille = tailleCm ?? null;
  const bras = longueurBrasCm ?? null;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <SectionLabel>Mensurations</SectionLabel>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Modifier mes mensurations"
          className="-my-2 py-2 text-sm font-medium text-ekvara-black underline-offset-2 hover:underline"
        >
          Modifier
        </button>
      </div>

      <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <div className="flex items-baseline gap-1.5">
          <dt className="text-ekvara-muted">Taille</dt>
          <dd className="font-semibold tabular-nums text-ekvara-black">
            <span>{taille !== null ? taille : '—'}</span>
            {taille !== null && ' cm'}
          </dd>
        </div>
        <div className="flex items-baseline gap-1.5">
          <dt className="text-ekvara-muted">Longueur de bras</dt>
          <dd className="font-semibold tabular-nums text-ekvara-black">
            <span>{bras !== null ? bras : '—'}</span>
            {bras !== null && ' cm'}
          </dd>
        </div>
      </dl>
      {taille === null && bras === null && (
        <p className="mt-3 text-sm text-ekvara-muted">Non renseignées. Ton coach les verra dès que tu les ajoutes.</p>
      )}

      {open && (
        <MeasurementsModal
          athleteId={athleteId}
          current={{ tailleCm: taille, longueurBrasCm: bras }}
          onClose={() => setOpen(false)}
          onSaved={(view) => {
            setOpen(false);
            onSaved(view);
          }}
        />
      )}
    </div>
  );
}

// Vide = non renseigné ; sinon entier dans les bornes (jamais arrondi en
// silence : une valeur décimale est signalée).
function parseCm(raw: string, label: string, bounds: { min: number; max: number }): { value: number | null; error: string | null } {
  const value = raw.trim();
  if (value === '') return { value: null, error: null };
  if (!/^\d+$/.test(value)) return { value: null, error: `${label} : nombre entier de centimètres` };
  const cm = Number(value);
  if (cm < bounds.min || cm > bounds.max) return { value: null, error: `${label} : entre ${bounds.min} et ${bounds.max} cm` };
  return { value: cm, error: null };
}

interface MeasurementsModalProps {
  athleteId: string;
  current: AthleteMeasurements;
  onClose: () => void;
  onSaved: (view: AthleteMeasurements) => void;
}

function MeasurementsModal({ athleteId, current, onClose, onSaved }: MeasurementsModalProps) {
  const [taille, setTaille] = useState(current.tailleCm?.toString() ?? '');
  const [bras, setBras] = useState(current.longueurBrasCm?.toString() ?? '');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const height = parseCm(taille, 'Taille', HEIGHT_CM);
    const arm = parseCm(bras, 'Longueur de bras', ARM_LENGTH_CM);
    const invalid = height.error ?? arm.error;
    if (invalid) {
      setError(invalid);
      return;
    }
    setError(null);
    setSubmitting(true);

    updateAthleteMeasurements(athleteId, { tailleCm: height.value, longueurBrasCm: arm.value })
      .then(onSaved)
      .catch((err: Error) => {
        console.error("Erreur lors de l'enregistrement des mensurations", err);
        setError(err.message || "Impossible d'enregistrer tes mensurations pour le moment.");
        setSubmitting(false);
      });
  }

  const field = (id: string, label: string, value: string, onChange: (v: string) => void, bounds: { min: number; max: number }, hint: string) => (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-ekvara-black">
        {label}
      </label>
      <div className="mt-1 flex items-center gap-2">
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={bounds.min}
          max={bounds.max}
          step={1}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={hint}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <span className="text-sm text-ekvara-black/60">cm</span>
      </div>
    </div>
  );

  return (
    <Modal title="Mes mensurations" onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col overflow-y-auto p-5">
        <p className="text-sm text-ekvara-black/70">Laisse un champ vide s'il n'est pas connu. Ton coach verra ces valeurs.</p>
        <div className="mt-4 flex flex-col gap-3">
          {field('measurements-height', 'Taille', taille, setTaille, HEIGHT_CM, 'Ex. 178')}
          {field('measurements-arm', 'Longueur de bras', bras, setBras, ARM_LENGTH_CM, 'Ex. 72')}
        </div>

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

export default MeasurementsSection;
