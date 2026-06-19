import { useEffect, useState, useMemo } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'

const EMPTY_LINE = () => ({ description: '', qty: 1, unitPrice: '' })

function addDays(isoDate, days) {
  const d = new Date(isoDate)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

const today = new Date().toISOString().slice(0, 10)

const EMPTY = () => ({
  clientId: '',
  orderId: '',
  invoiceNo: '',
  issueDate: today,
  dueDate: addDays(today, 30),
  currency: 'USD',
  status: 'Draft',
  lineItems: [EMPTY_LINE(), EMPTY_LINE()],
  notes: '',
})

function lineTotal(item) {
  const qty = parseFloat(item.qty) || 0
  const price = parseFloat(item.unitPrice) || 0
  return qty * price
}

function subtotal(lineItems) {
  return lineItems.reduce((sum, item) => sum + lineTotal(item), 0)
}

function fmt(n) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function NewInvoicePanel({ open, onClose, onSave, initialData, clients, orders, nextInvoiceNo }) {
  const [form, setForm] = useState(EMPTY())

  useEffect(() => {
    if (!open) return
    if (initialData) {
      setForm({ ...initialData })
    } else {
      setForm({ ...EMPTY(), invoiceNo: nextInvoiceNo })
    }
  }, [open, initialData, nextInvoiceNo])

  function set(field, value) {
    setForm(prev => {
      const next = { ...prev, [field]: value }
      if (field === 'issueDate') next.dueDate = addDays(value, 30)
      if (field === 'clientId') next.orderId = ''
      return next
    })
  }

  const clientOrders = useMemo(
    () => orders.filter(o => o.clientId === form.clientId),
    [orders, form.clientId]
  )

  function setLine(idx, field, value) {
    setForm(prev => {
      const lineItems = prev.lineItems.map((item, i) =>
        i === idx ? { ...item, [field]: value } : item
      )
      return { ...prev, lineItems }
    })
  }

  function addLine() {
    setForm(prev => ({ ...prev, lineItems: [...prev.lineItems, EMPTY_LINE()] }))
  }

  function removeLine(idx) {
    setForm(prev => ({
      ...prev,
      lineItems: prev.lineItems.filter((_, i) => i !== idx),
    }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.clientId || !form.invoiceNo.trim()) return
    onSave({
      ...form,
      lineItems: form.lineItems.map(l => ({
        ...l,
        qty: parseFloat(l.qty) || 0,
        unitPrice: parseFloat(l.unitPrice) || 0,
      })),
    })
    onClose()
  }

  const total = subtotal(form.lineItems)
  const isEdit = !!initialData

  return (
    <>
      <div
        className={`fixed inset-0 bg-navy/20 z-40 transition-opacity duration-200 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      <div
        className={`fixed top-0 right-0 h-full w-[560px] bg-cream z-50 flex flex-col transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-navy/10">
          <h2 className="font-heading text-lg text-navy">
            {isEdit ? 'Edit Invoice' : 'New Invoice'}
          </h2>
          <button onClick={onClose} className="text-slate/40 hover:text-navy transition-colors duration-150">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-5">
          {/* Client + order */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Client" required>
              <select
                value={form.clientId}
                onChange={e => set('clientId', e.target.value)}
                className="input"
                required
              >
                <option value="">Select client…</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.company}</option>
                ))}
              </select>
            </Field>

            <Field label="Linked Order">
              <select
                value={form.orderId}
                onChange={e => set('orderId', e.target.value)}
                className="input"
                disabled={!form.clientId}
              >
                <option value="">None</option>
                {clientOrders.map(o => (
                  <option key={o.id} value={o.id}>{o.orderId} — {o.category}</option>
                ))}
              </select>
            </Field>
          </div>

          {/* Invoice meta */}
          <div className="grid grid-cols-3 gap-4">
            <Field label="Invoice No." required>
              <input
                type="text"
                value={form.invoiceNo}
                onChange={e => set('invoiceNo', e.target.value)}
                className="input"
                required
              />
            </Field>
            <Field label="Issue Date">
              <input
                type="date"
                value={form.issueDate}
                onChange={e => set('issueDate', e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Due Date">
              <input
                type="date"
                value={form.dueDate}
                onChange={e => set('dueDate', e.target.value)}
                className="input"
              />
            </Field>
          </div>

          {/* Line items */}
          <div>
            <label className="text-xs font-body font-medium text-slate/70 uppercase tracking-wider block mb-2">
              Line Items
            </label>
            <div className="bg-white border border-navy/10">
              {/* Header */}
              <div className="grid grid-cols-[1fr_60px_90px_80px_32px] gap-2 px-3 py-2 border-b border-navy/8">
                {['Description', 'Qty', 'Unit Price', 'Total', ''].map(h => (
                  <span key={h} className="text-xs font-body text-slate/50 uppercase tracking-wider">{h}</span>
                ))}
              </div>

              {/* Rows */}
              {form.lineItems.map((item, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_60px_90px_80px_32px] gap-2 px-3 py-2 border-b border-navy/5 last:border-0 items-center">
                  <input
                    type="text"
                    value={item.description}
                    onChange={e => setLine(idx, 'description', e.target.value)}
                    className="input text-xs py-1.5"
                    placeholder="Item description"
                  />
                  <input
                    type="number"
                    min="0"
                    value={item.qty}
                    onChange={e => setLine(idx, 'qty', e.target.value)}
                    className="input text-xs py-1.5 text-center"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={e => setLine(idx, 'unitPrice', e.target.value)}
                    className="input text-xs py-1.5"
                    placeholder="0.00"
                  />
                  <span className="text-xs font-body text-navy tabular-nums px-1">
                    {fmt(lineTotal(item))}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeLine(idx)}
                    disabled={form.lineItems.length === 1}
                    className="text-slate/30 hover:text-slate/60 disabled:opacity-20 transition-colors duration-150 flex items-center justify-center"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            {/* Add line + subtotal */}
            <div className="flex items-center justify-between mt-2">
              <button
                type="button"
                onClick={addLine}
                className="flex items-center gap-1.5 text-xs font-body text-slate/50 hover:text-navy transition-colors duration-150"
              >
                <Plus size={13} />
                Add line item
              </button>
              <div className="text-right">
                <div className="flex items-center gap-6 text-xs font-body text-slate/60 mb-0.5">
                  <span>Subtotal</span>
                  <span className="tabular-nums w-24 text-right">{fmt(total)}</span>
                </div>
                <div className="flex items-center gap-6 text-sm font-body font-medium text-navy border-t border-navy/10 pt-1">
                  <span>Total (USD)</span>
                  <span className="tabular-nums w-24 text-right">{fmt(total)}</span>
                </div>
              </div>
            </div>
          </div>

          <Field label="Notes">
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              className="input resize-none"
              rows={3}
              placeholder="Payment instructions, references, terms…"
            />
          </Field>
        </form>

        <div className="px-6 py-4 border-t border-navy/10 flex items-center justify-between">
          <span className="text-xs font-body text-slate/40">Total: {fmt(total)}</span>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-body text-slate hover:text-navy transition-colors duration-150"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-5 py-2 bg-navy text-white text-sm font-body font-medium hover:bg-slate transition-colors duration-150"
            >
              {isEdit ? 'Save Changes' : 'Create Invoice'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function Field({ label, required, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-body font-medium text-slate/70 uppercase tracking-wider">
        {label}{required && <span className="text-gold ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}
