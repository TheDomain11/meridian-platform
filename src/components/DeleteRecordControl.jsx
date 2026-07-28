import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { useTrash } from '../context/AppContext.jsx'
import ConfirmDialog from './ConfirmDialog.jsx'

/**
 * "Delete" button for a record detail page. Confirms, soft-deletes (moves to Trash),
 * then redirects back to the module list.
 *
 * Props:
 *   entity     — table name ('clients' | 'orders' | 'suppliers' | 'invoices' | 'team')
 *   id         — record id
 *   name       — human label shown in the confirm dialog
 *   redirectTo — path to navigate to after a successful delete
 */
export default function DeleteRecordControl({ entity, id, name, redirectTo }) {
  const { softDelete } = useTrash()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function handleConfirm() {
    setBusy(true)
    setError(null)
    try {
      await softDelete(entity, id)
      navigate(redirectTo)
    } catch (err) {
      setError(err.message || 'Could not delete this record.')
      setBusy(false)
    }
  }

  return (
    <>
      <button
        onClick={() => { setError(null); setOpen(true) }}
        className="flex items-center gap-2 px-4 py-2 border border-red-600/30 text-sm font-body text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 transition-colors duration-150"
      >
        <Trash2 size={13} strokeWidth={1.75} />
        Delete
      </button>

      <ConfirmDialog
        open={open}
        title="Move to Trash?"
        message={`"${name}" will be moved to Trash. It will be hidden from all views but kept for 30 days, after which it becomes eligible for permanent deletion. You can restore it any time before then.`}
        confirmLabel="Move to Trash"
        danger
        busy={busy}
        error={error}
        onConfirm={handleConfirm}
        onCancel={() => setOpen(false)}
      />
    </>
  )
}
