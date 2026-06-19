import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { useTeam } from '../context/AppContext'
import { DEPARTMENTS } from '../lib/teamData'
import PageHeader from '../components/PageHeader.jsx'
import AddMemberPanel from '../components/team/AddMemberPanel.jsx'

const COLUMNS = [
  { key: 'name',       label: 'Name' },
  { key: 'role',       label: 'Role' },
  { key: 'department', label: 'Department' },
  { key: 'email',      label: 'Email' },
  { key: 'status',     label: 'Status' },
  { key: 'lastActive', label: 'Last Active' },
]

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function StatusPill({ status }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-body font-medium border ${
      status === 'Active'
        ? 'text-teal border-teal/40'
        : 'text-slate/40 border-slate/20'
    }`}>
      {status}
    </span>
  )
}

function RolePill({ role }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 text-xs font-body font-medium text-teal border border-teal/35">
      {role}
    </span>
  )
}

export default function Team() {
  const { team, addMember } = useTeam()
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('All')
  const [sort, setSort] = useState({ key: 'name', dir: 'asc' })
  const [panelOpen, setPanelOpen] = useState(false)

  function toggleSort(key) {
    setSort(prev => prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' })
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return team.filter(m => {
      const matchSearch =
        m.name.toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        (m.department ?? '').toLowerCase().includes(q)
      const matchDept = deptFilter === 'All' || m.department === deptFilter
      return matchSearch && matchDept
    })
  }, [team, search, deptFilter])

  const sorted = useMemo(() =>
    [...filtered].sort((a, b) => {
      const av = a[sort.key] ?? ''
      const bv = b[sort.key] ?? ''
      const cmp = String(av).localeCompare(String(bv))
      return sort.dir === 'asc' ? cmp : -cmp
    }),
    [filtered, sort]
  )

  function SortIcon({ col }) {
    if (sort.key !== col) return <ChevronsUpDown size={12} className="text-slate/30 ml-1 inline" />
    return sort.dir === 'asc'
      ? <ChevronUp size={12} className="text-navy ml-1 inline" />
      : <ChevronDown size={12} className="text-navy ml-1 inline" />
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Team"
        subtitle="User and role management"
        action={
          <button
            onClick={() => setPanelOpen(true)}
            className="px-4 py-2 bg-navy text-white text-sm font-body font-medium hover:bg-slate transition-colors duration-150"
          >
            Add Member
          </button>
        }
      />

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate/40" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search team…"
            className="w-full pl-8 pr-3 py-2 text-sm font-body bg-white border border-navy/10 text-navy placeholder:text-slate/35 focus:outline-none focus:border-navy/30"
          />
        </div>
        <select
          value={deptFilter}
          onChange={e => setDeptFilter(e.target.value)}
          className="px-3 py-2 text-sm font-body bg-white border border-navy/10 text-navy focus:outline-none focus:border-navy/30"
        >
          <option value="All">All Departments</option>
          {DEPARTMENTS.map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-navy/8">
        <table className="w-full text-sm font-body">
          <thead>
            <tr className="border-b border-navy/8">
              {COLUMNS.map(col => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  className="text-left px-4 py-3 text-xs font-medium text-slate/55 uppercase tracking-wider cursor-pointer select-none hover:text-navy transition-colors duration-150 whitespace-nowrap"
                >
                  {col.label}
                  <SortIcon col={col.key} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate/40">
                  {search || deptFilter !== 'All' ? 'No team members match your filters.' : 'No team members yet.'}
                </td>
              </tr>
            ) : (
              sorted.map((member, i) => (
                <tr
                  key={member.id}
                  onClick={() => navigate(`/team/${member.id}`)}
                  className={`border-b border-navy/5 last:border-0 cursor-pointer hover:bg-navy/[0.025] transition-colors duration-100 ${
                    i % 2 === 0 ? '' : 'bg-slate/[0.015]'
                  }`}
                >
                  <td className="px-4 py-3 font-medium text-navy">{member.name}</td>
                  <td className="px-4 py-3"><RolePill role={member.role} /></td>
                  <td className="px-4 py-3 text-slate">{member.department}</td>
                  <td className="px-4 py-3 text-slate/70">{member.email}</td>
                  <td className="px-4 py-3"><StatusPill status={member.status} /></td>
                  <td className="px-4 py-3 text-slate/70">{formatDate(member.lastActive)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {sorted.length > 0 && (
        <p className="mt-3 text-xs text-slate/40 font-body">
          {sorted.length} {sorted.length === 1 ? 'member' : 'members'}
          {deptFilter !== 'All' && ` · ${deptFilter}`}
        </p>
      )}

      <AddMemberPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        onSave={addMember}
      />
    </div>
  )
}
