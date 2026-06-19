import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

const ORIGINS = ['Guangzhou', 'Shenzhen', 'Yiwu', 'Foshan', 'Dongguan', 'Hangzhou', 'Shanghai', 'Other']
const STATUSES = ['Sourcing', 'Sampling', 'Production', 'QC', 'Shipped', 'Delivered', 'Cancelled']

const EMPTY = {
  clientId: '',
  reference: '',
  category: '',
  description: '',
  value: '',
  origin: '',
  status: 'Sourcing',
  deadline: '',
  notes: '',
}

export default function NewOrderPanel({ open, onClose, onSave, initialData, clients, nextOrderId }) {
  const [form, setForm] = useState(EMPTY)

  useEffect(() => {
    if (open) {
      setForm(
        initialData
          ? { ...initialData, value: initialData.value ?? '' }
          : { ...EMPTY, reference: nextOrderId }
      )
    }
  }, [open, initialData, nextOrderId])

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.clientId || !form.category.trim()) return
    onSave({ ...form, value: parseFloat(form.value) || 0 })
    onClose()
  }

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
        className={`fixed top-0 right-0 h-full w-[480px] bg-cream z-50 flex flex-col transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-navy/10">
          <h2 className="font-heading text-lg text-navy">
            {isEdit ? 'Edit Order' : 'New Order'}
          </h2>
          <button onClick={onClose} className="text-slate/40 hover:text-navy transition-colors duration-150">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-5">
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

          <div className="grid grid-cols-2 gap-4">
            <Field label="Order Reference">
              <input
                type="text"
                value={form.reference}
                onChange={e => set('reference', e.target.value)}
                className="input"
                placeholder="e.g. ORD-006"
              />
            </Field>

            <Field label="Origin Region">
              <select
                value={form.origin}
                onChange={e => set('origin', e.target.value)}
                className="input"
              >
                <option value="">Select…</option>
                {ORIGINS.map(o => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Product Category" required>
            <input
              type="text"
              value={form.category}
              onChange={e => set('category', e.target.value)}
              className="input"
              placeholder="e.g. Homeware & Textiles"
              required
            />
          </Field>

          <Field label="Product Description">
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              className="input resize-none"
              rows={3}
              placeholder="Quantity, spec, packaging requirements…"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Estimated Value (USD)">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.value}
                onChange={e => set('value', e.target.value)}
                className="input"
                placeholder="0.00"
              />
            </Field>

            <Field label="Target Deadline">
              <input
                type="date"
                value={form.deadline}
                onChange={e => set('deadline', e.target.value)}
                className="input"
              />
            </Field>
          </div>

          <Field label="Status">
            <div className="flex flex-wrap gap-2">
              {STATUSES.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => set('status', s)}
                  className={`px-3 py-1.5 text-xs font-body font-medium border transition-colors duration-150 ${
                    form.status === s
                      ? 'bg-navy text-white border-navy'
                      : 'bg-white text-slate border-slate/25 hover:border-navy/40'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Notes">
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              className="input resize-none"
              rows={3}
              placeholder="Factory contacts, inspection notes, shipping details…"
            />
          </Field>
        </form>

        <div className="px-6 py-4 border-t border-navy/10 flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-body text-slate hover:text-navy transition-colors duration-150"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            className="px-5 py-2 bg-navy text-white text-sm font-body font-medium hover:bg-slate transition-colors duration-150"
          >
            {isEdit ? 'Save Changes' : 'Create Order'}
          </button>
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
