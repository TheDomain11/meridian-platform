import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { useClients } from '../context/AppContext'
import PageHeader from '../components/PageHeader.jsx'
import StatusBadge from '../components/clients/StatusBadge.jsx'
import AddClientPanel from '../components/clients/AddClientPanel.jsx'

const COLUMNS = [
  { key: 'company', label: 'Company' },
  { key: 'contact', label: 'Contact' },
  { key: 'country', label: 'Country' },
  { key: 'status', label: 'Status' },
  { key: 'openOrders', label: 'Open Orders' },
  { key: 'lastActivity', label: 'Last Activity' },
]

function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function Clients() {
  const { clients, addClient } = useClients()
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [sort, setSort] = useState({ key: 'company', dir: 'asc' })
  const [panelOpen, setPanelOpen] = useState(false)

  function toggleSort(key) {
    setSort(prev =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' }
    )
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return clients.filter(
      c =>
        c.company.toLowerCase().includes(q) ||
        c.contact.toLowerCase().includes(q) ||
        c.country.toLowerCase().includes(q)
    )
  }, [clients, search])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sort.key] ?? ''
      const bv = b[sort.key] ?? ''
      const cmp = typeof av === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv))
      return sort.dir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sort])

  function SortIcon({ col }) {
    if (sort.key !== col) return <ChevronsUpDown size={12} className="text-slate/30 ml-1 inline" />
    return sort.dir === 'asc'
      ? <ChevronUp size={12} className="text-navy ml-1 inline" />
      : <ChevronDown size={12} className="text-navy ml-1 inline" />
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Clients"
        subtitle="Pipeline and client records"
        action={
          <button
            onClick={() => setPanelOpen(true)}
            className="px-4 py-2 bg-navy text-white text-sm font-body font-medium hover:bg-slate transition-colors duration-150"
          >
            Add Client
          </button>
        }
      />

      {/* Search bar */}
      <div className="relative mb-4 w-72">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate/40" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search clients…"
          className="w-full pl-8 pr-3 py-2 text-sm font-body bg-white border border-navy/10 text-navy placeholder:text-slate/35 focus:outline-none focus:border-navy/30"
        />
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
                  {search ? 'No clients match your search.' : 'No clients yet.'}
                </td>
              </tr>
            ) : (
              sorted.map((client, i) => (
                <tr
                  key={client.id}
                  onClick={() => navigate(`/clients/${client.id}`)}
                  className={`border-b border-navy/5 last:border-0 cursor-pointer hover:bg-navy/[0.025] transition-colors duration-100 ${
                    i % 2 === 0 ? '' : 'bg-slate/[0.015]'
                  }`}
                >
                  <td className="px-4 py-3 font-medium text-navy">{client.company}</td>
                  <td className="px-4 py-3 text-slate">{client.contact}</td>
                  <td className="px-4 py-3 text-slate">{client.country}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={client.status} />
                  </td>
                  <td className="px-4 py-3 text-slate">
                    {client.openOrders > 0 ? client.openOrders : <span className="text-slate/35">—</span>}
                  </td>
                  <td className="px-4 py-3 text-slate/70">{formatDate(client.lastActivity)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Count */}
      {sorted.length > 0 && (
        <p className="mt-3 text-xs text-slate/40 font-body">
          {sorted.length} {sorted.length === 1 ? 'client' : 'clients'}
          {search && ` matching "${search}"`}
        </p>
      )}

      <AddClientPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        onSave={addClient}
      />
    </div>
  )
}
