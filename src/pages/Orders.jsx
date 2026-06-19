import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { useOrders, useClients } from '../context/AppContext'
import PageHeader from '../components/PageHeader.jsx'
import OrderStatusBadge from '../components/orders/OrderStatusBadge.jsx'
import NewOrderPanel from '../components/orders/NewOrderPanel.jsx'

const STATUSES = ['All', 'Sourcing', 'Sampling', 'Production', 'QC', 'Shipped', 'Delivered', 'Cancelled']

const COLUMNS = [
  { key: 'orderId',    label: 'Order ID' },
  { key: 'clientName', label: 'Client' },
  { key: 'category',   label: 'Category' },
  { key: 'origin',     label: 'Origin' },
  { key: 'status',     label: 'Status' },
  { key: 'value',      label: 'Value (USD)' },
  { key: 'createdAt',  label: 'Created' },
  { key: 'deadline',   label: 'Deadline' },
]

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatCurrency(val) {
  if (val === undefined || val === null || val === '') return '—'
  return `$${Number(val).toLocaleString('en-US')}`
}

export default function Orders() {
  const { orders, addOrder } = useOrders()
  const { clients } = useClients()
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [sort, setSort] = useState({ key: 'createdAt', dir: 'desc' })
  const [panelOpen, setPanelOpen] = useState(false)

  // Enrich orders with client name for display/sorting
  const enriched = useMemo(() => {
    const clientMap = Object.fromEntries(clients.map(c => [c.id, c.company]))
    return orders.map(o => ({ ...o, clientName: clientMap[o.clientId] ?? '—' }))
  }, [orders, clients])

  function toggleSort(key) {
    setSort(prev =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' }
    )
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return enriched.filter(o => {
      const matchesSearch =
        o.orderId.toLowerCase().includes(q) ||
        o.clientName.toLowerCase().includes(q) ||
        o.category.toLowerCase().includes(q) ||
        (o.origin || '').toLowerCase().includes(q)
      const matchesStatus = statusFilter === 'All' || o.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [enriched, search, statusFilter])

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

  function nextOrderId() {
    const max = orders.reduce((m, o) => {
      const n = parseInt(o.orderId?.replace('ORD-', '') || '0')
      return Math.max(m, n)
    }, 0)
    return `ORD-${String(max + 1).padStart(3, '0')}`
  }

  function SortIcon({ col }) {
    if (sort.key !== col) return <ChevronsUpDown size={12} className="text-slate/30 ml-1 inline" />
    return sort.dir === 'asc'
      ? <ChevronUp size={12} className="text-navy ml-1 inline" />
      : <ChevronDown size={12} className="text-navy ml-1 inline" />
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Orders"
        subtitle="Sourcing job tracker"
        action={
          <button
            onClick={() => setPanelOpen(true)}
            className="px-4 py-2 bg-navy text-white text-sm font-body font-medium hover:bg-slate transition-colors duration-150"
          >
            New Order
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
            placeholder="Search orders…"
            className="w-full pl-8 pr-3 py-2 text-sm font-body bg-white border border-navy/10 text-navy placeholder:text-slate/35 focus:outline-none focus:border-navy/30"
          />
        </div>

        <div className="flex items-center gap-1">
          {STATUSES.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-body font-medium border transition-colors duration-150 ${
                statusFilter === s
                  ? 'bg-navy text-white border-navy'
                  : 'bg-white text-slate/60 border-slate/20 hover:border-navy/30 hover:text-navy'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
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
                <td colSpan={8} className="px-4 py-10 text-center text-slate/40">
                  {search || statusFilter !== 'All' ? 'No orders match your filters.' : 'No orders yet.'}
                </td>
              </tr>
            ) : (
              sorted.map((order, i) => (
                <tr
                  key={order.id}
                  onClick={() => navigate(`/orders/${order.id}`)}
                  className={`border-b border-navy/5 last:border-0 cursor-pointer hover:bg-navy/[0.025] transition-colors duration-100 ${
                    i % 2 === 0 ? '' : 'bg-slate/[0.015]'
                  }`}
                >
                  <td className="px-4 py-3 font-medium text-navy">{order.orderId}</td>
                  <td className="px-4 py-3 text-slate">{order.clientName}</td>
                  <td className="px-4 py-3 text-slate">{order.category}</td>
                  <td className="px-4 py-3 text-slate">{order.origin || <span className="text-slate/35">—</span>}</td>
                  <td className="px-4 py-3"><OrderStatusBadge status={order.status} /></td>
                  <td className="px-4 py-3 text-slate tabular-nums">{formatCurrency(order.value)}</td>
                  <td className="px-4 py-3 text-slate/70">{formatDate(order.createdAt)}</td>
                  <td className="px-4 py-3 text-slate/70">{formatDate(order.deadline)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {sorted.length > 0 && (
        <p className="mt-3 text-xs text-slate/40 font-body">
          {sorted.length} {sorted.length === 1 ? 'order' : 'orders'}
          {statusFilter !== 'All' && ` · ${statusFilter}`}
        </p>
      )}

      <NewOrderPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        onSave={addOrder}
        clients={clients}
        nextOrderId={nextOrderId()}
      />
    </div>
  )
}
