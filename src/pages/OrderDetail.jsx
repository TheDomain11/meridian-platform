import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Package, DollarSign, MapPin, Calendar, Tag, Pencil } from 'lucide-react'
import { useOrders, useClients, useInvoices } from '../context/AppContext'
import OrderStatusBadge from '../components/orders/OrderStatusBadge.jsx'
import StatusTracker from '../components/orders/StatusTracker.jsx'
import AdvisoryStageTracker from '../components/orders/AdvisoryStageTracker.jsx'
import NewOrderPanel from '../components/orders/NewOrderPanel.jsx'
import NewInvoicePanel from '../components/invoicing/NewInvoicePanel.jsx'
import DeleteRecordControl from '../components/DeleteRecordControl.jsx'
import { getInvoiceTrigger } from '../lib/advisoryInvoiceTriggers.js'

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

export default function OrderDetail() {
  const { id } = useParams()
  const { orders, updateOrder } = useOrders()
  const { clients } = useClients()
  const { invoices, addInvoice } = useInvoices()
  const [editOpen, setEditOpen] = useState(false)
  const [invoicePanelOpen, setInvoicePanelOpen] = useState(false)
  const [invoicePrefill, setInvoicePrefill] = useState(null)

  const order = orders.find(o => o.id === id)
  const client = order ? clients.find(c => c.id === order.clientId) : null

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

  // Advances advisory_stage via updateOrder (current-or-next-only enforced by
  // AdvisoryStageTracker itself). When that's an actual change, checks whether the new
  // stage should prompt a draft invoice and, if so, opens NewInvoicePanel pre-filled —
  // never creates or sends anything automatically.
  async function handleAdvisoryStageClick(nextStage) {
    const isChange = nextStage !== order.advisoryStage
    await updateOrder(order.id, { ...order, advisoryStage: nextStage })
    if (!isChange) return

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

      {/* Status tracker */}
      <div className="bg-white border border-navy/8 px-8 py-5 mb-4">
        <p className="text-xs font-body font-medium text-slate/55 uppercase tracking-wider mb-4">
          Progress
        </p>
        <StatusTracker status={order.status} />
      </div>

      {/* Advisory stage tracker */}
      <div className="bg-white border border-navy/8 px-8 py-5 mb-4">
        <p className="text-xs font-body font-medium text-slate/55 uppercase tracking-wider mb-4">
          Advisory Progress
        </p>
        <AdvisoryStageTracker stage={order.advisoryStage} onStageClick={handleAdvisoryStageClick} />
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
          <PlaceholderSection title="Documents" />
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
