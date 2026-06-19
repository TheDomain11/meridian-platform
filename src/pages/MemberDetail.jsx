import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, User, Mail, Phone, MessageCircle, Building2, ShieldCheck, Pencil } from 'lucide-react'
import { useTeam } from '../context/AppContext'
import { ROLES } from '../lib/teamData'
import AddMemberPanel from '../components/team/AddMemberPanel.jsx'

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
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

export default function MemberDetail() {
  const { id } = useParams()
  const { team, updateMember } = useTeam()
  const [editOpen, setEditOpen] = useState(false)

  const member = team.find(m => m.id === id)

  if (!member) {
    return (
      <div className="p-8">
        <Link to="/team" className="flex items-center gap-1.5 text-sm text-slate/55 hover:text-navy transition-colors duration-150 font-body mb-6 w-fit">
          <ArrowLeft size={14} /> Team
        </Link>
        <p className="text-slate/40 font-body text-sm">Member not found.</p>
      </div>
    )
  }

  const roleConfig = ROLES[member.role]
  const permissions = roleConfig?.permissions ?? []

  // Initials for the avatar
  const initials = member.name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="p-8">
      {/* Back */}
      <Link
        to="/team"
        className="flex items-center gap-1.5 text-sm text-slate/55 hover:text-navy transition-colors duration-150 font-body mb-6 w-fit"
      >
        <ArrowLeft size={14} />
        Team
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          {/* Initials avatar */}
          <div className="w-10 h-10 bg-navy flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-body font-semibold text-white tracking-wide">{initials}</span>
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-heading text-2xl text-navy">{member.name}</h1>
              {/* Role badge */}
              <span className="inline-flex items-center px-2 py-0.5 text-xs font-body font-medium text-teal border border-teal/35">
                {member.role}
              </span>
              {/* Status badge */}
              <span className={`inline-flex items-center px-2 py-0.5 text-xs font-body font-medium border ${
                member.status === 'Active'
                  ? 'text-teal border-teal/40'
                  : 'text-slate/40 border-slate/20'
              }`}>
                {member.status}
              </span>
            </div>
            <p className="text-sm font-body text-slate/60 mt-0.5">
              {member.department} · Last active {formatDate(member.lastActive)}
            </p>
          </div>
        </div>
        <button
          onClick={() => setEditOpen(true)}
          className="flex items-center gap-2 px-4 py-2 border border-navy/15 text-sm font-body text-slate hover:text-navy hover:border-navy/30 transition-colors duration-150"
        >
          <Pencil size={13} strokeWidth={1.75} />
          Edit
        </button>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {/* Contact */}
        <div className="col-span-1 bg-white border border-navy/8 px-5 py-4">
          <p className="text-xs font-body font-medium text-slate/55 uppercase tracking-wider mb-2">Contact</p>
          <DetailRow icon={Mail}          label="Email"     value={member.email} />
          <DetailRow icon={Phone}         label="Phone"     value={member.phone} />
          <DetailRow icon={MessageCircle} label="WhatsApp"  value={member.whatsapp} />
          <DetailRow icon={Building2}     label="Department" value={member.department} />
          <DetailRow icon={User}          label="Status"    value={member.status} />
        </div>

        {/* Permissions */}
        <div className="col-span-1 bg-white border border-navy/8 px-5 py-4">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck size={14} strokeWidth={1.5} className="text-slate/40" />
            <p className="text-xs font-body font-medium text-slate/55 uppercase tracking-wider">Permissions</p>
          </div>
          <div className="flex flex-col gap-2 mb-4">
            {permissions.map(perm => (
              <div key={perm} className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-teal/50 flex-shrink-0" />
                <span className="text-sm font-body text-slate">{perm}</span>
              </div>
            ))}
          </div>
          <p className="text-xs font-body text-slate/35 pt-3 border-t border-navy/6">
            Role-based access control will be enforced when authentication is configured.
          </p>
        </div>

        {/* Notes */}
        <div className="col-span-1 bg-white border border-navy/8 px-5 py-4">
          <p className="text-xs font-body font-medium text-slate/55 uppercase tracking-wider mb-3">Notes</p>
          {member.notes ? (
            <p className="text-sm font-body text-slate leading-relaxed">{member.notes}</p>
          ) : (
            <p className="text-sm font-body text-slate/35">No notes.</p>
          )}
        </div>
      </div>

      {/* Placeholder sections */}
      <div className="grid grid-cols-2 gap-4">
        <PlaceholderSection title="Assigned Orders" />
        <PlaceholderSection title="Activity Log" />
      </div>

      <AddMemberPanel
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSave={data => updateMember(member.id, data)}
        initialData={member}
      />
    </div>
  )
}
