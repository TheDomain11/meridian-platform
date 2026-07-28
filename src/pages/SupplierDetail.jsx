import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Factory, MessageCircle, Phone, Mail, MapPin, Tag, Clock, CreditCard, CheckCircle, XCircle, Pencil } from 'lucide-react'
import { useSuppliers } from '../context/AppContext'
import SupplierStatusBadge from '../components/suppliers/SupplierStatusBadge.jsx'
import AddSupplierPanel from '../components/suppliers/AddSupplierPanel.jsx'
import DeleteRecordControl from '../components/DeleteRecordControl.jsx'

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function DetailRow({ icon: Icon, label, value }) {
  if (value === undefined || value === null || value === '') return null
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

export default function SupplierDetail() {
  const { id } = useParams()
  const { suppliers, updateSupplier } = useSuppliers()
  const [editOpen, setEditOpen] = useState(false)

  const supplier = suppliers.find(s => s.id === id)

  if (!supplier) {
    return (
      <div className="p-8">
        <Link to="/suppliers" className="flex items-center gap-1.5 text-sm text-slate/55 hover:text-navy transition-colors duration-150 font-body mb-6 w-fit">
          <ArrowLeft size={14} /> Suppliers
        </Link>
        <p className="text-slate/40 font-body text-sm">Supplier not found.</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Back */}
      <Link
        to="/suppliers"
        className="flex items-center gap-1.5 text-sm text-slate/55 hover:text-navy transition-colors duration-150 font-body mb-6 w-fit"
      >
        <ArrowLeft size={14} />
        Suppliers
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-navy/6 flex items-center justify-center flex-shrink-0">
            <Factory size={18} strokeWidth={1.5} className="text-navy/50" />
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-heading text-2xl text-navy">{supplier.name}</h1>
              <SupplierStatusBadge status={supplier.status} />
              {supplier.verified ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-body font-medium text-gold border border-gold/50">
                  <CheckCircle size={11} strokeWidth={2.5} />
                  Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-body font-medium text-slate/40 border border-slate/20">
                  <XCircle size={11} strokeWidth={2} />
                  Not Verified
                </span>
              )}
            </div>
            <p className="text-sm font-body text-slate/60 mt-0.5">
              {supplier.location}{supplier.category ? ` · ${supplier.category}` : ''}
            </p>
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
          <DeleteRecordControl entity="suppliers" id={supplier.id} name={supplier.name} redirectTo="/suppliers" />
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {/* Contact */}
        <div className="col-span-1 bg-white border border-navy/8 px-5 py-4">
          <p className="text-xs font-body font-medium text-slate/55 uppercase tracking-wider mb-2">Contact</p>
          <DetailRow icon={Tag}           label="Contact Name"  value={supplier.contactName} />
          <DetailRow icon={MessageCircle} label="WeChat"        value={supplier.wechat} />
          <DetailRow icon={Phone}         label="Phone"         value={supplier.phone} />
          <DetailRow icon={Mail}          label="Email"         value={supplier.email} />
          <DetailRow icon={MapPin}        label="Location"      value={supplier.location} />
        </div>

        {/* Business */}
        <div className="col-span-1 bg-white border border-navy/8 px-5 py-4">
          <p className="text-xs font-body font-medium text-slate/55 uppercase tracking-wider mb-2">Business Terms</p>
          <DetailRow icon={Tag}        label="Category"       value={supplier.category} />
          <DetailRow icon={Tag}        label="MOQ"            value={supplier.moq} />
          <DetailRow icon={Clock}      label="Lead Time"      value={supplier.leadTime ? `${supplier.leadTime} days` : null} />
          <DetailRow icon={CreditCard} label="Payment Terms"  value={supplier.paymentTerms} />
          <div className="flex items-start gap-3 py-3 border-b border-navy/6 last:border-0">
            <Tag size={15} strokeWidth={1.5} className="text-slate/40 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-body text-slate/50 uppercase tracking-wider mb-0.5">Orders Fulfilled</p>
              <p className="text-sm font-body text-navy">{supplier.ordersFulfilled ?? 0}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 py-3">
            <Clock size={15} strokeWidth={1.5} className="text-slate/40 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-body text-slate/50 uppercase tracking-wider mb-0.5">Last Used</p>
              <p className="text-sm font-body text-navy">{formatDate(supplier.lastUsed)}</p>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="col-span-1 bg-white border border-navy/8 px-5 py-4">
          <p className="text-xs font-body font-medium text-slate/55 uppercase tracking-wider mb-3">Notes</p>
          {supplier.notes ? (
            <p className="text-sm font-body text-slate leading-relaxed">{supplier.notes}</p>
          ) : (
            <p className="text-sm font-body text-slate/35">No notes.</p>
          )}
        </div>
      </div>

      {/* Placeholder sections */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <PlaceholderSection title="Orders Fulfilled" />
        </div>
        <div className="col-span-1 flex flex-col gap-4">
          <PlaceholderSection title="Documents" />
          <PlaceholderSection title="Activity Log" />
        </div>
      </div>

      <AddSupplierPanel
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSave={data => updateSupplier(supplier.id, data)}
        initialData={supplier}
      />
    </div>
  )
}
