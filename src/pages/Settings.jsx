import { useState, useRef } from 'react'
import { Plug } from 'lucide-react'

const DEFAULTS = {
  // Company
  companyName:     'Meridian International',
  legalEntity:     'Meridian Capital Holdings Limited',
  primaryEmail:    'george@meridianinternational.io',
  whatsapp:        '+852 6297 1699',
  baseCurrency:    'USD',
  countryOp:       'China',
  // Platform
  invoicePrefix:   'INV-',
  orderPrefix:     'ORD-',
  paymentTerms:    'Net 30',
  invoiceCurrency: 'USD',
}

const INTEGRATIONS = [
  { key: 'zoho',      label: 'Zoho Books',              description: 'Sync invoices and payments.' },
  { key: 'whatsapp',  label: 'WhatsApp Business API',   description: 'Send order updates and client notifications.' },
  { key: 'claude',    label: 'Claude AI',               description: 'AI-assisted sourcing and document analysis.' },
]

function Section({ title, children }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-3">
        <p className="text-xs font-body font-semibold text-slate/45 uppercase tracking-widest whitespace-nowrap">
          {title}
        </p>
        <div className="flex-1 h-px bg-navy/8" />
      </div>
      <div className="bg-white border border-navy/8 divide-y divide-navy/6">
        {children}
      </div>
    </div>
  )
}

function Row({ label, description, children }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5 gap-8">
      <div className="min-w-0">
        <p className="text-sm font-body text-navy">{label}</p>
        {description && (
          <p className="text-xs font-body text-slate/45 mt-0.5">{description}</p>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

function FieldInput({ value, onChange, placeholder, readOnly }) {
  return (
    <input
      type="text"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      readOnly={readOnly}
      className={`w-64 px-3 py-1.5 text-sm font-body border text-navy focus:outline-none transition-colors duration-150 ${
        readOnly
          ? 'bg-navy/[0.03] border-navy/8 text-slate/50 cursor-default'
          : 'bg-white border-navy/12 focus:border-navy/30'
      }`}
    />
  )
}

function FieldSelect({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={onChange}
      className="w-48 px-3 py-1.5 text-sm font-body bg-white border border-navy/12 text-navy focus:outline-none focus:border-navy/30 transition-colors duration-150"
    >
      {options.map(o => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  )
}

export default function Settings() {
  const [form, setForm] = useState(DEFAULTS)
  const [saved, setSaved] = useState(false)
  const timerRef = useRef(null)

  function set(field) {
    return e => setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  function handleSave() {
    if (timerRef.current) clearTimeout(timerRef.current)
    setSaved(true)
    timerRef.current = setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="flex flex-col min-h-full">
      <div className="flex-1 p-8">
        <div className="mb-8">
          <h1 className="font-heading text-2xl text-navy">Settings</h1>
          <p className="mt-1 text-sm text-slate/60 font-body">Platform configuration</p>
        </div>

        {/* Company */}
        <Section title="Company">
          <Row label="Company Name">
            <FieldInput value={form.companyName} onChange={set('companyName')} />
          </Row>
          <Row label="Legal Entity">
            <FieldInput value={form.legalEntity} onChange={set('legalEntity')} />
          </Row>
          <Row label="Primary Email">
            <FieldInput value={form.primaryEmail} onChange={set('primaryEmail')} />
          </Row>
          <Row label="WhatsApp">
            <FieldInput value={form.whatsapp} onChange={set('whatsapp')} placeholder="+852 0000 0000" />
          </Row>
          <Row label="Base Currency">
            <FieldSelect
              value={form.baseCurrency}
              onChange={set('baseCurrency')}
              options={['USD', 'EUR', 'GBP', 'ZAR', 'HKD', 'CNY']}
            />
          </Row>
          <Row label="Country of Operation">
            <FieldInput value={form.countryOp} onChange={set('countryOp')} />
          </Row>
        </Section>

        {/* Integrations */}
        <Section title="Integrations">
          {INTEGRATIONS.map(intg => (
            <Row key={intg.key} label={intg.label} description={intg.description}>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate/25" />
                  <span className="text-xs font-body text-slate/40">Not connected</span>
                </div>
                <button
                  disabled
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-body font-medium border border-slate/15 text-slate/30 cursor-not-allowed"
                  title="Coming soon"
                >
                  <Plug size={11} strokeWidth={1.75} />
                  Connect
                </button>
              </div>
            </Row>
          ))}
        </Section>

        {/* Platform */}
        <Section title="Platform">
          <Row label="Invoice Prefix" description="Prefix applied to all new invoice numbers.">
            <FieldInput value={form.invoicePrefix} onChange={set('invoicePrefix')} />
          </Row>
          <Row label="Order Prefix" description="Prefix applied to all new order numbers.">
            <FieldInput value={form.orderPrefix} onChange={set('orderPrefix')} />
          </Row>
          <Row label="Default Payment Terms">
            <FieldSelect
              value={form.paymentTerms}
              onChange={set('paymentTerms')}
              options={['Net 30', 'Net 15', 'Due on Receipt']}
            />
          </Row>
          <Row label="Default Invoice Currency">
            <FieldSelect
              value={form.invoiceCurrency}
              onChange={set('invoiceCurrency')}
              options={['USD', 'EUR', 'GBP', 'ZAR']}
            />
          </Row>
        </Section>

        {/* Account */}
        <Section title="Account">
          <Row label="Name">
            <FieldInput value="George" onChange={() => {}} readOnly />
          </Row>
          <Row label="Role">
            <FieldInput value="Operations Director" readOnly />
          </Row>
          <Row label="Email">
            <FieldInput value="george@meridianinternational.io" readOnly />
          </Row>
        </Section>
      </div>

      {/* Sticky save bar */}
      <div className="sticky bottom-0 bg-cream border-t border-navy/8 px-8 py-4 flex items-center justify-end gap-4">
        {saved && (
          <span className="text-sm font-body text-teal">
            Changes saved.
          </span>
        )}
        <button
          onClick={handleSave}
          className="px-5 py-2 bg-navy text-white text-sm font-body font-medium hover:bg-slate transition-colors duration-150"
        >
          Save Changes
        </button>
      </div>
    </div>
  )
}
