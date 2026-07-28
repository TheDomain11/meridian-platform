import { useEffect, useState } from 'react'
import { RotateCcw, Trash2, FileText, FileDown } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import { useTrash } from '../context/AppContext.jsx'
import { exportRecordCsv, exportRecordPdf } from '../lib/trashExport.js'

const RETENTION_DAYS = 30

const TABS = [
  { key: 'clients',   label: 'Clients' },
  { key: 'orders',    label: 'Orders' },
  { key: 'suppliers', label: 'Suppliers' },
  { key: 'invoices',  label: 'Invoices' },
  { key: 'team',      label: 'Team' },
  { key: 'enquiries', label: 'Enquiries' },
]

// How each entity's row is labelled in the trash list.
const RENDER = {
  clients:   r => ({ primary: r.company || '—',   secondary: [r.contact, r.email].filter(Boolean).join(' · ') }),
  orders:    r => ({ primary: r.orderId || '—',   secondary: [r.category, r.origin].filter(Boolean).join(' · ') }),
  suppliers: r => ({ primary: r.name || '—',      secondary: [r.location, r.category].filter(Boolean).join(' · ') }),
  invoices:  r => ({ primary: r.invoiceNo || '—', secondary: r.status || '' }),
  team:      r => ({ primary: r.name || '—',      secondary: [r.role, r.department].filter(Boolean).join(' · ') }),
  enquiries: r => ({ primary: r.name || '—',      secondary: [r.company, r.email].filter(Boolean).join(' · ') }),
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// Days left in the 30-day window before a record becomes eligible for permanent deletion.
function trashMeta(deletedAt) {
  if (!deletedAt) return { daysRemaining: RETENTION_DAYS, eligible: false }
  const daysElapsed = Math.floor((Date.now() - new Date(deletedAt).getTime()) / 86400000)
  const daysRemaining = RETENTION_DAYS - daysElapsed
  return { daysRemaining, eligible: daysRemaining <= 0 }
}

export default function Trash() {
  const { trash, trashLoading, trashError, loadTrash, restore, permanentDelete } = useTrash()
  const [tab, setTab] = useState('clients')
  const [busyId, setBusyId] = useState(null)
  const [actionError, setActionError] = useState(null)

  // Second-confirmation dialog for permanent delete.
  const [confirm, setConfirm] = useState(null) // { entity, id, name }
  const [confirmBusy, setConfirmBusy] = useState(false)
  const [confirmError, setConfirmError] = useState(null)

  useEffect(() => { loadTrash() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const items = trash[tab] ?? []

  async function handleRestore(entity, id) {
    setBusyId(id)
    setActionError(null)
    try {
      await restore(entity, id)
    } catch (err) {
      setActionError(err.message || 'Could not restore this record.')
    } finally {
      setBusyId(null)
    }
  }

  async function handlePermanentDelete() {
    if (!confirm) return
    setConfirmBusy(true)
    setConfirmError(null)
    try {
      await permanentDelete(confirm.entity, confirm.id)
      setConfirm(null)
    } catch (err) {
      setConfirmError(err.message || 'Could not permanently delete this record.')
    } finally {
      setConfirmBusy(false)
    }
  }

  return (
    <div className="p-8">
      <PageHeader title="Trash" subtitle="Deleted records are kept for 30 days, then flagged for permanent deletion. Nothing is removed automatically." />

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-navy/8">
        {TABS.map(t => {
          const count = (trash[t.key] ?? []).length
          return (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setActionError(null) }}
              className={`px-4 py-2 text-sm font-body font-medium border-b-2 -mb-px transition-colors duration-150 ${
                tab === t.key
                  ? 'border-navy text-navy'
                  : 'border-transparent text-slate/55 hover:text-navy'
              }`}
            >
              {t.label}
              {count > 0 && <span className="ml-1.5 text-xs text-slate/45">({count})</span>}
            </button>
          )
        })}
      </div>

      {trashLoading && <p className="text-sm text-slate/40 font-body">Loading…</p>}
      {trashError && <p className="text-sm text-red-700 font-body">{trashError}</p>}
      {actionError && <p className="text-sm text-red-700 font-body mb-4">{actionError}</p>}

      {!trashLoading && !trashError && items.length === 0 && (
        <p className="text-sm text-slate/40 font-body">Nothing in trash for this module.</p>
      )}

      <div className="flex flex-col gap-3">
        {items.map(record => {
          const { primary, secondary } = RENDER[tab](record)
          const { daysRemaining, eligible } = trashMeta(record.deletedAt)
          const isBusy = busyId === record.id
          const isEnquiry = tab === 'enquiries'

          return (
            <div key={record.id} className="bg-white border border-navy/8 px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-heading text-base text-navy truncate">{primary}</p>
                  {secondary && <p className="text-sm font-body text-slate/60 mt-0.5 truncate">{secondary}</p>}
                  <p className="text-xs font-body text-slate/45 mt-1">Deleted {formatDate(record.deletedAt)}</p>
                </div>

                <div className="flex-shrink-0">
                  {eligible ? (
                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-body font-medium text-red-700 border border-red-600/40 whitespace-nowrap">
                      Eligible for permanent deletion
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-body font-medium text-slate/55 border border-slate/25 whitespace-nowrap">
                      {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} left
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2 mt-4">
                <button
                  onClick={() => handleRestore(tab, record.id)}
                  disabled={isBusy}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-navy/15 text-xs font-body font-medium text-slate hover:text-navy hover:border-navy/30 transition-colors duration-150 disabled:opacity-50"
                  title={isEnquiry ? 'Restore (via service role)' : 'Restore'}
                >
                  <RotateCcw size={13} strokeWidth={1.75} />
                  {isBusy ? 'Restoring…' : 'Restore'}
                </button>

                <button
                  onClick={() => exportRecordCsv(tab, record)}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-navy/15 text-xs font-body font-medium text-slate hover:text-navy hover:border-navy/30 transition-colors duration-150"
                >
                  <FileText size={13} strokeWidth={1.75} />
                  CSV
                </button>

                <button
                  onClick={() => exportRecordPdf(tab, record)}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-navy/15 text-xs font-body font-medium text-slate hover:text-navy hover:border-navy/30 transition-colors duration-150"
                >
                  <FileDown size={13} strokeWidth={1.75} />
                  PDF
                </button>

                <button
                  onClick={() => { setConfirmError(null); setConfirm({ entity: tab, id: record.id, name: primary }) }}
                  disabled={isBusy}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-red-600/30 text-xs font-body font-medium text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 transition-colors duration-150 disabled:opacity-50 ml-auto"
                >
                  <Trash2 size={13} strokeWidth={1.75} />
                  Delete permanently
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <ConfirmDialog
        open={!!confirm}
        title="Permanently delete?"
        message={confirm ? `"${confirm.name}" will be permanently deleted. This cannot be undone.` : ''}
        confirmLabel="Delete permanently"
        danger
        busy={confirmBusy}
        error={confirmError}
        onConfirm={handlePermanentDelete}
        onCancel={() => setConfirm(null)}
      />
    </div>
  )
}
