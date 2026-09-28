import { useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Building2, Mail, Phone, MapPin, Tag, Pencil, Check } from 'lucide-react'
import { useClients, useOrders, useInvoices, useDocuments } from '../context/AppContext'
import StatusBadge from '../components/clients/StatusBadge.jsx'
import AddClientPanel from '../components/clients/AddClientPanel.jsx'
import DeleteRecordControl from '../components/DeleteRecordControl.jsx'
import AdvisoryStageBadge from '../components/orders/AdvisoryStageBadge.jsx'
import InvoiceStatusBadge from '../components/invoicing/InvoiceStatusBadge.jsx'

function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatCurrency(val) {
  if (val === undefined || val === null || val === '') return '—'
  return `$${Number(val).toLocaleString('en-US')}`
}

function invoiceTotal(lineItems = []) {
  return lineItems.reduce((sum, l) => sum + (parseFloat(l.qty) || 0) * (parseFloat(l.unitPrice) || 0), 0)
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

function LinkedOrdersSection({ orders }) {
  return (
    <div className="bg-white border border-navy/8 p-5">
      <p className="text-xs font-body font-medium text-slate/55 uppercase tracking-wider mb-4">Linked Orders</p>
      {orders.length === 0 ? (
        <p className="text-sm text-slate/35 font-body">No orders yet.</p>
      ) : (
        <div className="flex flex-col gap-1">
          {orders.map(order => (
            <Link
              key={order.id}
              to={`/orders/${order.id}`}
              className="flex items-center justify-between gap-3 py-2 border-b border-navy/6 last:border-0 hover:bg-navy/[0.025] transition-colors duration-100 -mx-1 px-1"
            >
              <div className="min-w-0">
                <p className="text-sm font-body text-navy font-medium truncate">{order.orderId}</p>
                <p className="text-xs font-body text-slate/50 truncate">{order.category}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <AdvisoryStageBadge stage={order.advisoryStage} engagementType={order.engagementType} />
                <span className="text-sm font-body text-slate tabular-nums">{formatCurrency(order.value)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function KindTag({ children }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-body font-medium border text-slate/55 border-slate/25">
      {children}
    </span>
  )
}

// Combines invoices and documents (uploaded via OrderDetail's Documents section) into one
// list, each row tagged with its kind (Invoice, or the document's doc_type) so the two are
// distinguishable, sorted by date — invoice issueDate or document uploadedAt.
function DocumentsSection({ invoices, documents }) {
  const entries = useMemo(() => {
    const invoiceEntries = invoices.map(inv => ({
      key: `invoice-${inv.id}`,
      date: inv.issueDate,
      to: `/invoicing/${inv.id}`,
      primary: inv.invoiceNo,
      kind: 'Invoice',
      badge: <InvoiceStatusBadge status={inv.status} />,
      amount: formatCurrency(invoiceTotal(inv.lineItems)),
    }))
    const documentEntries = documents.map(doc => ({
      key: `document-${doc.id}`,
      date: doc.uploadedAt,
      to: `/orders/${doc.orderId}`,
      primary: doc.filename,
      kind: doc.docType,
      badge: doc.sentAt ? (
        <span className="flex items-center gap-1 text-xs font-body text-slate/40">
          <Check size={12} strokeWidth={1.75} />
          Sent
        </span>
      ) : (
        <span className="text-xs font-body text-slate/35">Not sent</span>
      ),
      amount: null,
    }))
    return [...invoiceEntries, ...documentEntries].sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [invoices, documents])

  return (
    <div className="bg-white border border-navy/8 p-5">
      <p className="text-xs font-body font-medium text-slate/55 uppercase tracking-wider mb-4">Documents</p>
      {entries.length === 0 ? (
        <p className="text-sm text-slate/35 font-body">No invoices or documents yet.</p>
      ) : (
        <div className="flex flex-col gap-1">
          {entries.map(entry => (
            <Link
              key={entry.key}
              to={entry.to}
              className="flex items-center justify-between gap-3 py-2 border-b border-navy/6 last:border-0 hover:bg-navy/[0.025] transition-colors duration-100 -mx-1 px-1"
            >
              <div className="min-w-0">
                <p className="text-sm font-body text-navy font-medium truncate">{entry.primary}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <KindTag>{entry.kind}</KindTag>
                  <p className="text-xs font-body text-slate/50 truncate">{formatDate(entry.date)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {entry.badge}
                {entry.amount && <span className="text-sm font-body text-slate tabular-nums">{entry.amount}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ClientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { clients, updateClient } = useClients()
  const { orders } = useOrders()
  const { invoices } = useInvoices()
  const { documents } = useDocuments()
  const [editOpen, setEditOpen] = useState(false)

  const client = clients.find(c => c.id === id)
  const clientOrders = useMemo(
    () => orders.filter(o => o.clientId === id),
    [orders, id]
  )
  const clientInvoices = useMemo(
    () => invoices.filter(i => i.clientId === id),
    [invoices, id]
  )
  const clientDocuments = useMemo(
    () => documents.filter(d => d.clientId === id),
    [documents, id]
  )

  if (!client) {
    return (
      <div className="p-8">
        <Link to="/clients" className="flex items-center gap-2 text-sm text-slate/60 hover:text-navy transition-colors duration-150 font-body mb-6">
          <ArrowLeft size={15} /> Back to Clients
        </Link>
        <p className="text-slate/40 font-body text-sm">Client not found.</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Back */}
      <Link
        to="/clients"
        className="flex items-center gap-1.5 text-sm text-slate/55 hover:text-navy transition-colors duration-150 font-body mb-6 w-fit"
      >
        <ArrowLeft size={14} />
        Clients
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-navy/6 flex items-center justify-center flex-shrink-0">
            <Building2 size={18} strokeWidth={1.5} className="text-navy/50" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-heading text-2xl text-navy">{client.company}</h1>
              <StatusBadge status={client.status} />
            </div>
            <p className="text-sm font-body text-slate/60 mt-0.5">{client.contact} · {client.country}</p>
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
          <DeleteRecordControl entity="clients" id={client.id} name={client.company} redirectTo="/clients" />
        </div>
      </div>

      {/* Body */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {/* Contact details */}
        <div className="col-span-1 bg-white border border-navy/8 px-5 py-4">
          <p className="text-xs font-body font-medium text-slate/55 uppercase tracking-wider mb-2">Contact Details</p>
          <DetailRow icon={Mail} label="Email" value={client.email} />
          <DetailRow icon={Phone} label="Phone" value={client.phone} />
          <DetailRow icon={MapPin} label="Country" value={client.country} />
          <DetailRow icon={Tag} label="Source" value={client.source} />
        </div>

        {/* Notes + meta */}
        <div className="col-span-2 bg-white border border-navy/8 px-5 py-4">
          <p className="text-xs font-body font-medium text-slate/55 uppercase tracking-wider mb-3">Notes</p>
          {client.notes ? (
            <p className="text-sm font-body text-slate leading-relaxed">{client.notes}</p>
          ) : (
            <p className="text-sm font-body text-slate/35">No notes.</p>
          )}
          <div className="mt-4 pt-4 border-t border-navy/6 flex gap-6">
            <div>
              <p className="text-xs font-body text-slate/45 uppercase tracking-wider mb-0.5">Open Orders</p>
              <p className="text-sm font-body text-navy font-medium">{client.openOrders || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-body text-slate/45 uppercase tracking-wider mb-0.5">Last Activity</p>
              <p className="text-sm font-body text-navy font-medium">{formatDate(client.lastActivity)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Placeholder sections */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <PlaceholderSection title="Activity Timeline" />
        </div>
        <div className="col-span-1 flex flex-col gap-4">
          <LinkedOrdersSection orders={clientOrders} />
          <DocumentsSection invoices={clientInvoices} documents={clientDocuments} />
        </div>
      </div>

      <AddClientPanel
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSave={data => updateClient(client.id, data)}
        initialData={client}
      />
    </div>
  )
}
