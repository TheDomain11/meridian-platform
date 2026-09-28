import { useMemo, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Package, DollarSign, MapPin, Calendar, Tag, Pencil, Upload, Send, Check } from 'lucide-react'
import { useOrders, useClients, useInvoices, useDocuments } from '../context/AppContext'
import OrderStatusBadge from '../components/orders/OrderStatusBadge.jsx'
import EngagementTimeline from '../components/orders/EngagementTimeline.jsx'
import { stepsFor } from '../lib/engagements.js'
import NewOrderPanel from '../components/orders/NewOrderPanel.jsx'
import NewInvoicePanel from '../components/invoicing/NewInvoicePanel.jsx'
import DeleteRecordControl from '../components/DeleteRecordControl.jsx'
import { getInvoiceTrigger } from '../lib/advisoryInvoiceTriggers.js'
import { blobToBase64 } from '../lib/invoiceStorage.js'
import { uploadDocument, sendDocumentEmail } from '../lib/documentStorage.js'

const DOC_TYPES = ['CSN', 'Engagement Letter', 'Compliance Advisory Note', 'Other']

// Whenever advisory_stage moves onto one of these goods-equivalent stages, orders.status
// is kept in sync so anything still reading the old field (Dashboard open-orders logic,
// Orders.jsx filters) doesn't go stale. The four advisory-only stages (Consultation,
// Engagement Letter, Contract, Compliance Review) have no goods-status equivalent, so
// status is left untouched when advisory_stage moves through those.
const GOODS_STATUS_BY_STAGE = {
  'Supplier Sourcing & Verification': 'Sourcing',
  Sampling: 'Sampling',
  Production: 'Production',
  'Inspection / QC': 'QC',
  Shipped: 'Shipped',
  Delivered: 'Delivered',
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatCurrency(val) {
  if (val === undefined || val === null || val === '') return '—'
  return `$${Number(val).toLocaleString('en-US')}`
}

function DetailRow({ icon: Icon, label, value }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 py-3 border-b border-navy/6 last:border-0">
      <Icon size={15} strokeWidth={1.5} className="text-slate/40 mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-xs font-body text-slate/50 uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-sm font-body text-navy">{value}</p>
      </div>
    </div>
  )
}

function PlaceholderSection({ title }) {
  return (
    <div className="bg-white border border-navy/8 p-5">
      <p className="text-xs font-body font-medium text-slate/55 uppercase tracking-wider mb-4">{title}</p>
      <p className="text-sm text-slate/35 font-body">No data yet.</p>
    </div>
  )
}

// Upload Document (file picker + doc_type selector) plus a list of this order's documents,
// each with its own "Send to Client" action. Uploading only stores the file — sending is a
// separate, deliberate click, same confirm-before-send spirit as invoices; nothing here
// auto-sends on upload.
function OrderDocumentsSection({ documents, onUpload, onSend }) {
  const [docType, setDocType] = useState('Other')
  const [uploading, setUploading] = useState(false)
  const [sendingId, setSendingId] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const fileInputRef = useRef(null)

  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file again later
    if (!file) return

    setUploading(true)
    setFeedback(null)
    try {
      await onUpload(file, docType)
      setFeedback({ type: 'success', text: 'Document uploaded.' })
    } catch (err) {
      setFeedback({ type: 'error', text: err.message })
    } finally {
      setUploading(false)
    }
  }

  async function handleSend(doc) {
    setSendingId(doc.id)
    setFeedback(null)
    try {
      const sentTo = await onSend(doc.id)
      setFeedback({ type: 'success', text: `Sent to ${sentTo}.` })
    } catch (err) {
      setFeedback({ type: 'error', text: err.message })
    } finally {
      setSendingId(null)
    }
  }

  return (
    <div className="bg-white border border-navy/8 p-5">
      <p className="text-xs font-body font-medium text-slate/55 uppercase tracking-wider mb-4">Documents</p>

      <div className="flex items-center gap-2 mb-4">
        <select
          value={docType}
          onChange={e => setDocType(e.target.value)}
          className="input text-xs py-1.5 w-auto flex-shrink-0"
        >
          {DOC_TYPES.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-navy/15 text-xs font-body font-medium text-slate hover:text-navy hover:border-navy/30 transition-colors duration-150 disabled:opacity-50"
        >
          <Upload size={13} strokeWidth={1.75} />
          {uploading ? 'Uploading…' : 'Upload Document'}
        </button>
        <input ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden" />
      </div>

      {feedback && (
        <p className={`text-xs font-body mb-3 ${feedback.type === 'error' ? 'text-red-700' : 'text-teal'}`}>
          {feedback.text}
        </p>
      )}

      {documents.length === 0 ? (
        <p className="text-sm text-slate/35 font-body">No documents yet.</p>
      ) : (
        <div className="flex flex-col gap-1">
          {documents.map(doc => (
            <div key={doc.id} className="flex items-center justify-between gap-2 py-2 border-b border-navy/6 last:border-0">
              <div className="min-w-0">
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm font-body text-navy font-medium truncate hover:text-teal transition-colors duration-150"
                >
                  {doc.filename}
                </a>
                <p className="text-xs font-body text-slate/50 truncate">
                  {doc.docType} · {formatDate(doc.uploadedAt)}
                  {doc.sentAt && ` · Sent ${formatDate(doc.sentAt)}`}
                </p>
              </div>
              {doc.sentAt ? (
                <span className="flex items-center gap-1 text-xs font-body text-slate/40 flex-shrink-0">
                  <Check size={12} strokeWidth={1.75} />
                  Sent
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSend(doc)}
                  disabled={sendingId === doc.id}
                  className="flex items-center gap-1 px-2.5 py-1 border border-navy/15 text-xs font-body text-slate hover:text-navy hover:border-navy/30 transition-colors duration-150 disabled:opacity-50 flex-shrink-0"
                >
                  <Send size={11} strokeWidth={1.75} />
                  {sendingId === doc.id ? 'Sending…' : 'Send to Client'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function OrderDetail() {
  const { id } = useParams()
  const { orders, updateOrder } = useOrders()
  const { clients } = useClients()
  const { invoices, addInvoice } = useInvoices()
  const { documents, addDocumentLocal, patchDocumentLocal } = useDocuments()
  const [editOpen, setEditOpen] = useState(false)
  const [invoicePanelOpen, setInvoicePanelOpen] = useState(false)
  const [invoicePrefill, setInvoicePrefill] = useState(null)

  const order = orders.find(o => o.id === id)
  const client = order ? clients.find(c => c.id === order.clientId) : null
  const orderDocuments = useMemo(() => documents.filter(d => d.orderId === id), [documents, id])

  if (!order) {
    return (
      <div className="p-8">
        <Link to="/orders" className="flex items-center gap-2 text-sm text-slate/60 hover:text-navy transition-colors duration-150 font-body mb-6">
          <ArrowLeft size={15} /> Back to Orders
        </Link>
        <p className="text-slate/40 font-body text-sm">Order not found.</p>
      </div>
    )
  }

  function nextOrderId() {
    const max = orders.reduce((m, o) => {
      const n = parseInt(o.orderId?.replace('ORD-', '') || '0')
      return Math.max(m, n)
    }, 0)
    return `ORD-${String(max + 1).padStart(3, '0')}`
  }

  function nextInvoiceNo() {
    const max = invoices.reduce((m, inv) => {
      const n = parseInt(inv.invoiceNo?.replace('INV-', '') || '0')
      return Math.max(m, n)
    }, 0)
    return `INV-${String(max + 1).padStart(3, '0')}`
  }

  // Moves advisory_stage one step at a time in either direction via updateOrder
  // (current-or-adjacent-only enforced by EngagementTimeline itself for Files and Full
  // Mandates; a legacy Standalone order's Mark Complete targets 'Delivered' directly) — going back a step
  // lets a mistake be corrected without the Edit panel. Whenever the new stage is one of
  // the goods-equivalent stages, status is kept in sync in the same write, regardless of
  // direction — that's a pure data-consistency rule, not a business trigger. Only an actual
  // forward move checks whether the new stage should prompt a draft invoice and, if so,
  // opens NewInvoicePanel pre-filled — never creates or sends anything automatically.
  // Stepping backward never re-triggers an invoice prompt for a stage already passed
  // through.
  async function handleStageClick(nextStage) {
    if (nextStage === order.advisoryStage) return

    const steps = stepsFor(order.engagementType)
    const isForward = steps.indexOf(nextStage) > steps.indexOf(order.advisoryStage)
    const syncedStatus = GOODS_STATUS_BY_STAGE[nextStage]

    await updateOrder(order.id, {
      ...order,
      advisoryStage: nextStage,
      ...(syncedStatus ? { status: syncedStatus } : {}),
    })
    if (!isForward) return

    const trigger = getInvoiceTrigger(order.engagementType, nextStage)
    if (!trigger) return

    setInvoicePrefill({
      clientId: order.clientId,
      orderId: order.id,
      status: 'Draft',
      lineItems: [{ description: trigger.description, qty: trigger.qty, unitPrice: trigger.unitPrice }],
    })
    setInvoicePanelOpen(true)
  }

  // Uploads a document via the privileged server function (upload-document.js) and syncs
  // local state with the returned row — never touches Storage/the documents table directly.
  async function handleDocumentUpload(file, docType) {
    const fileBase64 = await blobToBase64(file)
    const document = await uploadDocument({
      fileBase64,
      filename: file.name,
      orderId: order.id,
      clientId: order.clientId,
      docType,
      contentType: file.type || undefined,
    })
    addDocumentLocal(document)
  }

  // Sends a previously-uploaded document via the privileged server function
  // (send-document-email.js) and syncs sentAt/sentTo locally. Returns the address it was
  // sent to, for the caller's confirmation message.
  async function handleDocumentSend(documentId) {
    const document = await sendDocumentEmail(documentId)
    patchDocumentLocal(documentId, { sentAt: document.sent_at, sentTo: document.sent_to })
    return document.sent_to
  }

  return (
    <div className="p-8">
      {/* Back */}
      <Link
        to="/orders"
        className="flex items-center gap-1.5 text-sm text-slate/55 hover:text-navy transition-colors duration-150 font-body mb-6 w-fit"
      >
        <ArrowLeft size={14} />
        Orders
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-navy/6 flex items-center justify-center flex-shrink-0">
            <Package size={18} strokeWidth={1.5} className="text-navy/50" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-heading text-2xl text-navy">{order.orderId}</h1>
              <OrderStatusBadge status={order.status} />
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <p className="text-sm font-body text-slate/60">{order.category}</p>
              {client && (
                <>
                  <span className="text-slate/30">·</span>
                  <Link
                    to={`/clients/${client.id}`}
                    className="text-sm font-body text-teal hover:text-navy transition-colors duration-150"
                  >
                    {client.company}
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setEditOpen(true)}
            className="flex items-center gap-2 px-4 py-2 border border-navy/15 text-sm font-body text-slate hover:text-navy hover:border-navy/30 transition-colors duration-150"
          >
            <Pencil size={13} strokeWidth={1.75} />
            Edit
          </button>
          <DeleteRecordControl entity="orders" id={order.id} name={order.orderId} redirectTo="/orders" />
        </div>
      </div>

      {/* Engagement timeline — single merged progress UI, replaces the old separate
          goods StatusTracker + advisory AdvisoryStageTracker blocks */}
      <div className="bg-white border border-navy/8 px-8 py-5 mb-4">
        <p className="text-xs font-body font-medium text-slate/55 uppercase tracking-wider mb-4">
          Engagement Timeline
        </p>
        <EngagementTimeline
          engagementType={order.engagementType}
          stage={order.advisoryStage}
          onStageClick={handleStageClick}
        />
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="col-span-1 bg-white border border-navy/8 px-5 py-4">
          <p className="text-xs font-body font-medium text-slate/55 uppercase tracking-wider mb-2">Order Details</p>
          <DetailRow icon={Tag}         label="Reference"   value={order.reference} />
          <DetailRow icon={MapPin}      label="Origin"      value={order.origin} />
          <DetailRow icon={DollarSign}  label="Value"       value={formatCurrency(order.value)} />
          <DetailRow icon={Calendar}    label="Created"     value={formatDate(order.createdAt)} />
          <DetailRow icon={Calendar}    label="Deadline"    value={formatDate(order.deadline)} />
        </div>

        <div className="col-span-2 bg-white border border-navy/8 px-5 py-4">
          <p className="text-xs font-body font-medium text-slate/55 uppercase tracking-wider mb-3">Description</p>
          {order.description ? (
            <p className="text-sm font-body text-slate leading-relaxed mb-4">{order.description}</p>
          ) : (
            <p className="text-sm font-body text-slate/35 mb-4">No description.</p>
          )}
          {order.notes && (
            <>
              <p className="text-xs font-body font-medium text-slate/55 uppercase tracking-wider mb-2 pt-3 border-t border-navy/6">Notes</p>
              <p className="text-sm font-body text-slate leading-relaxed">{order.notes}</p>
            </>
          )}
        </div>
      </div>

      {/* Placeholder sections */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <PlaceholderSection title="Activity Log" />
        </div>
        <div className="col-span-1 flex flex-col gap-4">
          <OrderDocumentsSection
            documents={orderDocuments}
            onUpload={handleDocumentUpload}
            onSend={handleDocumentSend}
          />
          <PlaceholderSection title="Team" />
        </div>
      </div>

      <NewOrderPanel
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSave={data => updateOrder(order.id, data)}
        initialData={order}
        clients={clients}
        nextOrderId={nextOrderId()}
      />

      <NewInvoicePanel
        open={invoicePanelOpen}
        onClose={() => setInvoicePanelOpen(false)}
        onSave={addInvoice}
        clients={clients}
        orders={orders}
        nextInvoiceNo={nextInvoiceNo()}
        prefillData={invoicePrefill}
      />
    </div>
  )
}
