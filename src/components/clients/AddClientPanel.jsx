import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

const COUNTRIES = [
  'South Africa', 'United Kingdom', 'Germany', 'France', 'Netherlands',
  'Belgium', 'Australia', 'United States', 'Canada', 'Other',
]

const SOURCES = ['Referral', 'Website', 'Outreach', 'Other']
const STATUSES = ['Pipeline', 'Active', 'On Hold', 'Closed']

const EMPTY = {
  company: '',
  contact: '',
  email: '',
  phone: '',
  country: '',
  source: '',
  status: 'Pipeline',
  notes: '',
}

export default function AddClientPanel({ open, onClose, onSave, initialData }) {
  const [form, setForm] = useState(EMPTY)

  useEffect(() => {
    if (open) {
      setForm(initialData ? { ...initialData } : EMPTY)
    }
  }, [open, initialData])

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.company.trim() || !form.contact.trim()) return
    onSave(form)
    onClose()
  }

  const isEdit = !!initialData

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-navy/20 z-40 transition-opacity duration-200 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-[440px] bg-cream z-50 flex flex-col transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-navy/10">
          <h2 className="font-heading text-lg text-navy">
            {isEdit ? 'Edit Client' : 'Add Client'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate/40 hover:text-navy transition-colors duration-150"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-5">
          <Field label="Company Name" required>
            <input
              type="text"
              value={form.company}
              onChange={e => set('company', e.target.value)}
              className="input"
              placeholder="e.g. Cape Trade Imports"
              required
            />
          </Field>

          <Field label="Primary Contact Name" required>
            <input
              type="text"
              value={form.contact}
              onChange={e => set('contact', e.target.value)}
              className="input"
              placeholder="Full name"
              required
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Email">
              <input
                type="email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                className="input"
                placeholder="name@company.com"
              />
            </Field>

            <Field label="Phone (WhatsApp)">
              <input
                type="tel"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                className="input"
                placeholder="+27 82 000 0000"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Country">
              <select
                value={form.country}
                onChange={e => set('country', e.target.value)}
                className="input"
              >
                <option value="">Select…</option>
                {COUNTRIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>

            <Field label="Source">
              <select
                value={form.source}
                onChange={e => set('source', e.target.value)}
                className="input"
              >
                <option value="">Select…</option>
                {SOURCES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Status">
            <div className="flex gap-2 flex-wrap">
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
              rows={4}
              placeholder="Background, preferences, anything relevant…"
            />
          </Field>
        </form>

        {/* Footer */}
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
            form="client-form"
            onClick={handleSubmit}
            className="px-5 py-2 bg-navy text-white text-sm font-body font-medium hover:bg-slate transition-colors duration-150"
          >
            {isEdit ? 'Save Changes' : 'Add Client'}
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
