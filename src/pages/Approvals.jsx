import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { Pencil, Send, Check, Trash2 } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import { linkify } from '../lib/linkify.jsx'

const INTENT_LABEL = {
  NEW_ENQUIRY: 'New enquiry',
  RFQ: 'RFQ',
  STATUS_UPDATE: 'Status update',
  GENERAL: 'General',
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function Approvals() {
  const { id: highlightId } = useParams()
  const [approvals, setApprovals] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const highlightRef = useRef(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const res = await fetch('/.netlify/functions/list-approvals')
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error?.message || err.error || 'Could not load approvals.')
        }
        const { approvals } = await res.json()
        setApprovals(approvals)
      } catch (err) {
        setLoadError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    if (highlightId && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [highlightId, approvals])

  async function handleApprove(approvalId, finalResponseText) {
    setBusyId(approvalId)
    setActionError(null)
    try {
      const res = await fetch('/.netlify/functions/approve-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvalId, finalResponseText }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error?.message || err.error || 'Could not send the response.')
      }
      setApprovals(prev => prev.filter(a => a.id !== approvalId))
      setEditingId(null)
    } catch (err) {
      setActionError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  function startEdit(approval) {
    setEditingId(approval.id)
    setEditText(approval.draftResponse || '')
    setActionError(null)
  }

  async function handleDelete(approvalId) {
    setBusyId(approvalId)
    setActionError(null)
    try {
      const res = await fetch('/.netlify/functions/delete-approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: approvalId }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error?.message || err.error || 'Could not delete this approval.')
      }
      setApprovals(prev => prev.filter(a => a.id !== approvalId))
      setConfirmDeleteId(null)
    } catch (err) {
      setActionError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="p-8">
      <PageHeader title="Approvals" subtitle="Inbound enquiries drafted by Meridian AI, awaiting your sign-off" />

      {loading && <p className="text-sm text-slate/40 font-body">Loading…</p>}
      {loadError && <p className="text-sm text-red-700 font-body">{loadError}</p>}
      {actionError && <p className="text-sm text-red-700 font-body mb-4">{actionError}</p>}

      {!loading && !loadError && approvals.length === 0 && (
        <p className="text-sm text-slate/40 font-body">No pending approvals.</p>
      )}

      <div className="flex flex-col gap-4">
        {approvals.map(approval => {
          const isEditing = editingId === approval.id
          const isBusy = busyId === approval.id

          return (
            <div
              key={approval.id}
              ref={approval.id === highlightId ? highlightRef : null}
              className={`bg-white border px-5 py-5 ${
                approval.id === highlightId ? 'border-gold' : 'border-navy/8'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-body font-medium text-teal border border-teal/40 px-2 py-0.5">
                      {INTENT_LABEL[approval.intent] ?? approval.intent ?? 'General'}
                    </span>
                    <span className="text-xs font-body text-slate/40">{formatDate(approval.createdAt)}</span>
                  </div>
                  <p className="font-heading text-base text-navy">
                    {approval.fromName} <span className="text-slate/50 font-body text-sm">&lt;{approval.fromEmail}&gt;</span>
                  </p>
                  {approval.clientCompany && (
                    <p className="text-xs font-body text-slate/50 mt-0.5">{approval.clientCompany}</p>
                  )}
                  <p className="text-sm font-body text-slate mt-1">{approval.subject}</p>
                </div>
              </div>

              <p className="text-sm font-body text-navy mb-4">{approval.summary}</p>

              {isEditing ? (
                <textarea
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2.5 bg-cream border border-navy/15 text-sm font-body text-navy focus:outline-none focus:border-navy/30 resize-none mb-3"
                />
              ) : (
                <div className="bg-cream border border-navy/8 px-4 py-3 mb-3">
                  <p className="text-sm font-body text-slate whitespace-pre-wrap">{linkify(approval.draftResponse)}</p>
                </div>
              )}

              {confirmDeleteId === approval.id ? (
                <div className="flex items-center gap-3">
                  <span className="text-sm font-body text-navy">Are you sure?</span>
                  <button
                    onClick={() => handleDelete(approval.id)}
                    disabled={isBusy}
                    className="px-4 py-2 bg-red-600 text-white text-sm font-body font-medium hover:bg-red-700 transition-colors duration-150 disabled:opacity-50"
                  >
                    {isBusy ? 'Deleting…' : 'Confirm'}
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    disabled={isBusy}
                    className="px-4 py-2 text-sm font-body text-slate hover:text-navy transition-colors duration-150"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  {isEditing ? (
                    <>
                      <button
                        onClick={() => handleApprove(approval.id, editText)}
                        disabled={isBusy}
                        className="flex items-center gap-2 px-4 py-2 bg-navy text-white text-sm font-body font-medium hover:bg-slate transition-colors duration-150 disabled:opacity-50"
                      >
                        <Send size={13} strokeWidth={1.75} />
                        {isBusy ? 'Sending…' : 'Send'}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        disabled={isBusy}
                        className="px-4 py-2 text-sm font-body text-slate hover:text-navy transition-colors duration-150"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleApprove(approval.id)}
                        disabled={isBusy}
                        className="flex items-center gap-2 px-4 py-2 bg-navy text-white text-sm font-body font-medium hover:bg-slate transition-colors duration-150 disabled:opacity-50"
                      >
                        <Check size={13} strokeWidth={1.75} />
                        {isBusy ? 'Sending…' : 'Approve'}
                      </button>
                      <button
                        onClick={() => startEdit(approval)}
                        disabled={isBusy}
                        className="flex items-center gap-2 px-4 py-2 border border-navy/15 text-sm font-body text-slate hover:text-navy hover:border-navy/30 transition-colors duration-150 disabled:opacity-50"
                      >
                        <Pencil size={13} strokeWidth={1.75} />
                        Edit &amp; Approve
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setConfirmDeleteId(approval.id)}
                    disabled={isBusy}
                    className="flex items-center gap-2 px-4 py-2 border border-red-600 text-sm font-body text-red-600 hover:bg-red-600 hover:text-white transition-colors duration-150 disabled:opacity-50 ml-auto"
                  >
                    <Trash2 size={13} strokeWidth={1.75} />
                    Delete
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
