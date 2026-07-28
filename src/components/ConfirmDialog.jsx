import { useEffect } from 'react'

/**
 * Shared confirmation modal, used for both the soft-delete confirm (detail pages) and the
 * second permanent-delete confirm (trash view). Renders nothing when `open` is false.
 *
 * Props:
 *   open, title, message, confirmLabel, cancelLabel, danger, busy, error,
 *   onConfirm, onCancel
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  busy = false,
  error = null,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (!open) return
    function onKey(e) {
      if (e.key === 'Escape' && !busy) onCancel?.()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, busy, onCancel])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-navy/40"
        onClick={() => !busy && onCancel?.()}
      />
      <div className="relative bg-white border border-navy/10 shadow-xl w-full max-w-md mx-4 p-6">
        <h2 className="font-heading text-lg text-navy mb-2">{title}</h2>
        {message && <p className="text-sm font-body text-slate mb-4 whitespace-pre-wrap">{message}</p>}
        {error && <p className="text-sm font-body text-red-700 mb-4">{error}</p>}

        <div className="flex items-center gap-3 justify-end">
          <button
            onClick={() => onCancel?.()}
            disabled={busy}
            className="px-4 py-2 text-sm font-body text-slate hover:text-navy transition-colors duration-150 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => onConfirm?.()}
            disabled={busy}
            className={`px-4 py-2 text-sm font-body font-medium text-white transition-colors duration-150 disabled:opacity-50 ${
              danger ? 'bg-red-600 hover:bg-red-700' : 'bg-navy hover:bg-slate'
            }`}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
