import { useEffect, useState } from 'react'
import { X, Check } from 'lucide-react'

const LOCATIONS = ['Guangzhou', 'Shenzhen', 'Yiwu', 'Foshan', 'Dongguan', 'Hangzhou', 'Shanghai', 'Other']
const PAYMENT_TERMS = ['T/T 30%', 'T/T 100%', 'L/C', 'Other']
const STATUSES = ['Active', 'Probation', 'Blacklisted', 'Inactive']

const EMPTY = {
  name: '',
  contactName: '',
  wechat: '',
  phone: '',
  email: '',
  location: '',
  category: '',
  moq: '',
  leadTime: '',
  paymentTerms: '',
  verified: false,
  status: 'Active',
  notes: '',
}

export default function AddSupplierPanel({ open, onClose, onSave, initialData }) {
  const [form, setForm] = useState(EMPTY)

  useEffect(() => {
    if (open) setForm(initialData ? { ...initialData } : EMPTY)
  }, [open, initialData])

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    onSave({ ...form, leadTime: parseInt(form.leadTime) || 0 })
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
            {isEdit ? 'Edit Supplier' : 'Add Supplier'}
          </h2>
          <button onClick={onClose} className="text-slate/40 hover:text-navy transition-colors duration-150">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-5">
          <Field label="Supplier Name" required>
            <input
              type="text"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              className="input"
              placeholder="e.g. Guangzhou Artisan Ceramics Co."
              required
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Contact Name">
              <input
                type="text"
                value={form.contactName}
                onChange={e => set('contactName', e.target.value)}
                className="input"
                placeholder="Full name"
              />
            </Field>
            <Field label="WeChat ID">
              <input
                type="text"
                value={form.wechat}
                onChange={e => set('wechat', e.target.value)}
                className="input"
                placeholder="wechat_id"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Phone">
              <input
                type="tel"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                className="input"
                placeholder="+86 20 0000 0000"
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                className="input"
                placeholder="contact@factory.cn"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Location">
              <select value={form.location} onChange={e => set('location', e.target.value)} className="input">
                <option value="">Select…</option>
                {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </Field>
            <Field label="Product Category">
              <input
                type="text"
                value={form.category}
                onChange={e => set('category', e.target.value)}
                className="input"
                placeholder="e.g. Hardware & Tools"
              />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Field label="MOQ">
              <input
                type="text"
                value={form.moq}
                onChange={e => set('moq', e.target.value)}
                className="input"
                placeholder="e.g. 200 units"
              />
            </Field>
            <Field label="Lead Time (days)">
              <input
                type="number"
                min="0"
                value={form.leadTime}
                onChange={e => set('leadTime', e.target.value)}
                className="input"
                placeholder="30"
              />
            </Field>
            <Field label="Payment Terms">
              <select value={form.paymentTerms} onChange={e => set('paymentTerms', e.target.value)} className="input">
                <option value="">Select…</option>
                {PAYMENT_TERMS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
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

            <Field label="Verified">
              <button
                type="button"
                onClick={() => set('verified', !form.verified)}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-body border transition-colors duration-150 w-fit ${
                  form.verified
                    ? 'bg-gold/10 text-gold border-gold/40'
                    : 'bg-white text-slate/50 border-slate/20 hover:border-navy/30'
                }`}
              >
                <div className={`w-4 h-4 border flex items-center justify-center flex-shrink-0 ${
                  form.verified ? 'bg-gold border-gold' : 'border-slate/30'
                }`}>
                  {form.verified && <Check size={10} strokeWidth={3} className="text-white" />}
                </div>
                {form.verified ? 'Verified' : 'Not Verified'}
              </button>
            </Field>
          </div>

          <Field label="Notes">
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              className="input resize-none"
              rows={4}
              placeholder="Quality notes, audit status, relationship history…"
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
            onClick={handleSubmit}
            className="px-5 py-2 bg-navy text-white text-sm font-body font-medium hover:bg-slate transition-colors duration-150"
          >
            {isEdit ? 'Save Changes' : 'Add Supplier'}
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
