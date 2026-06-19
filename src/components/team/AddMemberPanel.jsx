import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { ROLES, ROLE_NAMES } from '../../lib/teamData'

const EMPTY = {
  name: '',
  email: '',
  phone: '',
  whatsapp: '',
  role: '',
  department: '',
  status: 'Active',
  notes: '',
}

export default function AddMemberPanel({ open, onClose, onSave, initialData }) {
  const [form, setForm] = useState(EMPTY)

  useEffect(() => {
    if (open) setForm(initialData ? { ...initialData } : EMPTY)
  }, [open, initialData])

  function set(field, value) {
    setForm(prev => {
      const next = { ...prev, [field]: value }
      if (field === 'role') next.department = ROLES[value]?.department ?? ''
      return next
    })
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.role) return
    onSave(form)
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
        className={`fixed top-0 right-0 h-full w-[440px] bg-cream z-50 flex flex-col transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-navy/10">
          <h2 className="font-heading text-lg text-navy">
            {isEdit ? 'Edit Member' : 'Add Member'}
          </h2>
          <button onClick={onClose} className="text-slate/40 hover:text-navy transition-colors duration-150">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-5">
          <Field label="Full Name" required>
            <input
              type="text"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              className="input"
              placeholder="First and last name"
              required
            />
          </Field>

          <Field label="Email" required>
            <input
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              className="input"
              placeholder="name@meridian-intl.com"
              required
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Phone">
              <input
                type="tel"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                className="input"
                placeholder="+27 82 000 0000"
              />
            </Field>
            <Field label="WhatsApp">
              <input
                type="tel"
                value={form.whatsapp}
                onChange={e => set('whatsapp', e.target.value)}
                className="input"
                placeholder="+27 82 000 0000"
              />
            </Field>
          </div>

          <Field label="Role" required>
            <select
              value={form.role}
              onChange={e => set('role', e.target.value)}
              className="input"
              required
            >
              <option value="">Select role…</option>
              {ROLE_NAMES.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </Field>

          <Field label="Department">
            <input
              type="text"
              value={form.department}
              readOnly
              className="input bg-navy/[0.03] text-slate/60 cursor-default"
              placeholder="Auto-filled from role"
            />
          </Field>

          <Field label="Status">
            <div className="flex gap-2">
              {['Active', 'Inactive'].map(s => (
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
              placeholder="Responsibilities, location, anything relevant…"
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
            {isEdit ? 'Save Changes' : 'Add Member'}
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
