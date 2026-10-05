import { useState } from 'react';
import ConditionModal from './ConditionModal';
import { conditionLabel, type AthleteConditionStatus, type AthleteConditionView } from '../../types/condition';

interface ConditionStatusProps {
  athleteId: string;
  status: string | undefined;
  note: string | null | undefined;
  // Date métier (ISO minuit UTC depuis /auth/me, ou YYYY-MM-DD) : jamais
  // new Date() naïf, qui peut décaler le jour selon le fuseau.
  expectedReturn: string | null | undefined;
  onSaved: (view: AthleteConditionView) => void;
}

function formatDateOnly(value: string): string {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}

// Bloc "Mon état" de l'accueil : présentationnel, l'état vient de la
// session (useAuth), mis à jour par HomePage après enregistrement.
function ConditionStatus({ athleteId, status, note, expectedReturn, onSaved }: ConditionStatusProps) {
  const [open, setOpen] = useState(false);
  const current = (status ?? 'actif') as AthleteConditionStatus;
  const isActive = current === 'actif';
  const returnDate = expectedReturn ? expectedReturn.slice(0, 10) : null;

  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-ekvara-muted">Mon état</span>
      <span
        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
          isActive ? 'bg-ekvara-lime text-ekvara-black' : 'bg-ekvara-black text-ekvara-surface'
        }`}
      >
        {conditionLabel(current)}
      </span>
      {!isActive && (note || returnDate) && (
        <span className="text-sm text-ekvara-black/70">
          {[note, returnDate ? `retour prévu le ${formatDateOnly(returnDate)}` : null].filter(Boolean).join(' · ')}
        </span>
      )}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-medium text-ekvara-black underline-offset-2 hover:underline"
      >
        Modifier
      </button>

      {open && (
        <ConditionModal
          athleteId={athleteId}
          current={{ status: current, note: note ?? null, expectedReturn: returnDate }}
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

export default ConditionStatus;
