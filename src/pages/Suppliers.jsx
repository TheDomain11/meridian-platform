import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ChevronUp, ChevronDown, ChevronsUpDown, CheckCircle } from 'lucide-react'
import { useSuppliers } from '../context/AppContext'
import PageHeader from '../components/PageHeader.jsx'
import SupplierStatusBadge from '../components/suppliers/SupplierStatusBadge.jsx'
import AddSupplierPanel from '../components/suppliers/AddSupplierPanel.jsx'

const COLUMNS = [
  { key: 'name',            label: 'Supplier Name' },
  { key: 'location',        label: 'Location' },
  { key: 'category',        label: 'Category' },
  { key: 'status',          label: 'Status' },
  { key: 'verified',        label: 'Verified' },
  { key: 'ordersFulfilled', label: 'Orders Fulfilled' },
  { key: 'lastUsed',        label: 'Last Used' },
]

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function Suppliers() {
  const { suppliers, addSupplier } = useSuppliers()
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [sort, setSort] = useState({ key: 'name', dir: 'asc' })
  const [panelOpen, setPanelOpen] = useState(false)

  const categories = useMemo(() => {
    const cats = [...new Set(suppliers.map(s => s.category).filter(Boolean))].sort()
    return ['All', ...cats]
  }, [suppliers])

  function toggleSort(key) {
    setSort(prev =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' }
    )
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return suppliers.filter(s => {
      const matchesSearch =
        s.name.toLowerCase().includes(q) ||
        (s.location ?? '').toLowerCase().includes(q) ||
        (s.category ?? '').toLowerCase().includes(q) ||
        (s.contactName ?? '').toLowerCase().includes(q)
      const matchesCategory = categoryFilter === 'All' || s.category === categoryFilter
      return matchesSearch && matchesCategory
    })
  }, [suppliers, search, categoryFilter])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sort.key] ?? ''
      const bv = b[sort.key] ?? ''
      const cmp = typeof av === 'boolean'
        ? Number(bv) - Number(av)
        : typeof av === 'number'
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
        title="Suppliers"
        subtitle="Supplier contacts and quote log"
        action={
          <button
            onClick={() => setPanelOpen(true)}
            className="px-4 py-2 bg-navy text-white text-sm font-body font-medium hover:bg-slate transition-colors duration-150"
          >
            Add Supplier
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
            placeholder="Search suppliers…"
            className="w-full pl-8 pr-3 py-2 text-sm font-body bg-white border border-navy/10 text-navy placeholder:text-slate/35 focus:outline-none focus:border-navy/30"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="px-3 py-2 text-sm font-body bg-white border border-navy/10 text-navy focus:outline-none focus:border-navy/30"
        >
          {categories.map(c => (
            <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>
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
                <td colSpan={7} className="px-4 py-10 text-center text-slate/40">
                  {search || categoryFilter !== 'All' ? 'No suppliers match your filters.' : 'No suppliers yet.'}
                </td>
              </tr>
            ) : (
              sorted.map((supplier, i) => (
                <tr
                  key={supplier.id}
                  onClick={() => navigate(`/suppliers/${supplier.id}`)}
                  className={`border-b border-navy/5 last:border-0 cursor-pointer hover:bg-navy/[0.025] transition-colors duration-100 ${
                    i % 2 === 0 ? '' : 'bg-slate/[0.015]'
                  }`}
                >
                  <td className="px-4 py-3 font-medium text-navy">{supplier.name}</td>
                  <td className="px-4 py-3 text-slate">{supplier.location || <span className="text-slate/35">—</span>}</td>
                  <td className="px-4 py-3 text-slate">{supplier.category || <span className="text-slate/35">—</span>}</td>
                  <td className="px-4 py-3"><SupplierStatusBadge status={supplier.status} /></td>
                  <td className="px-4 py-3">
                    {supplier.verified
                      ? <CheckCircle size={15} className="text-gold" strokeWidth={2} />
                      : <span className="text-slate/30">—</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-slate tabular-nums">
                    {supplier.ordersFulfilled ?? <span className="text-slate/35">0</span>}
                  </td>
                  <td className="px-4 py-3 text-slate/70">{formatDate(supplier.lastUsed)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {sorted.length > 0 && (
        <p className="mt-3 text-xs text-slate/40 font-body">
          {sorted.length} {sorted.length === 1 ? 'supplier' : 'suppliers'}
          {categoryFilter !== 'All' && ` · ${categoryFilter}`}
        </p>
      )}

      <AddSupplierPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        onSave={addSupplier}
      />
    </div>
  )
}
