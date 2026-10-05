import { useState } from 'react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import SectionLabel from '../ui/SectionLabel';
import { deleteMyAccount, downloadMyData } from '../../services/athletes.api';
import { LegalLinks } from '../../pages/legal/LegalPages';

interface MyDataSectionProps {
  athleteId: string;
  // Appelé après une suppression réussie (déconnexion + retour à /login).
  onAccountDeleted: () => void;
}

const CONFIRM_WORD = 'SUPPRIMER';

// RGPD — droits de l'athlète, directement dans son Passeport : accès /
// portabilité (téléchargement JSON) et effacement (suppression définitive,
// confirmée en tapant SUPPRIMER).
function MyDataSection({ athleteId, onAccountDeleted }: MyDataSectionProps) {
  const [exporting, setExporting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleExport() {
    setError(null);
    setExporting(true);
    downloadMyData(athleteId)
      .catch((err: Error) => setError(err.message))
      .finally(() => setExporting(false));
  }

  function handleDelete() {
    setError(null);
    setDeleting(true);
    deleteMyAccount(athleteId)
      .then(onAccountDeleted)
      .catch((err: Error) => {
        setError(err.message);
        setDeleting(false);
      });
  }

  return (
    <div>
      <SectionLabel>Mes données</SectionLabel>
      <p className="mt-3 text-sm text-ekvara-black/70">
        Tu peux télécharger toutes tes données ou supprimer définitivement ton compte.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button variant="secondary" onClick={handleExport} disabled={exporting}>
          {exporting ? 'Préparation...' : 'Télécharger mes données'}
        </Button>
        <Button variant="ghost" className="text-red-600" onClick={() => setDeleteOpen(true)}>
          Supprimer mon compte
        </Button>
      </div>
      {error && !deleteOpen && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}
      <LegalLinks className="mt-6" />

      {deleteOpen && (
        <Modal title="Supprimer mon compte" onClose={() => setDeleteOpen(false)}>
          <div className="flex flex-col gap-4 p-5">
            <p className="text-sm text-ekvara-black/80">
              Ton compte et toutes tes données (séances, pesées, objectifs, mesures, résultats) seront supprimés
              définitivement. Tes coachs ne te verront plus. Cette action est irréversible.
            </p>
            <label htmlFor="delete-confirm" className="text-sm font-medium text-ekvara-black">
              Tape {CONFIRM_WORD} pour confirmer
            </label>
            <input
              id="delete-confirm"
              type="text"
              value={confirmText}
              onChange={(event) => setConfirmText(event.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setDeleteOpen(false)} disabled={deleting}>
                Annuler
              </Button>
              <Button
                className="bg-red-600 text-white hover:bg-red-700"
                onClick={handleDelete}
                disabled={deleting || confirmText.trim() !== CONFIRM_WORD}
              >
                {deleting ? 'Suppression...' : 'Supprimer définitivement'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default MyDataSection;
