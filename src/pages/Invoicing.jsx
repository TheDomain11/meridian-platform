import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { useInvoices, useClients, useOrders } from '../context/AppContext'
import PageHeader from '../components/PageHeader.jsx'
import InvoiceStatusBadge from '../components/invoicing/InvoiceStatusBadge.jsx'
import NewInvoicePanel from '../components/invoicing/NewInvoicePanel.jsx'

const STATUS_TABS = ['All', 'Draft', 'Sent', 'Paid', 'Overdue']

const COLUMNS = [
  { key: 'invoiceNo',  label: 'Invoice No.' },
  { key: 'clientName', label: 'Client' },
  { key: 'orderRef',   label: 'Order' },
  { key: 'total',      label: 'Amount (USD)' },
  { key: 'status',     label: 'Status' },
  { key: 'issueDate',  label: 'Issue Date' },
  { key: 'dueDate',    label: 'Due Date' },
]

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function calcTotal(lineItems = []) {
  return lineItems.reduce((sum, l) => sum + (parseFloat(l.qty) || 0) * (parseFloat(l.unitPrice) || 0), 0)
}

function fmt(n) {
  return `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function Invoicing() {
  const { invoices, addInvoice } = useInvoices()
  const { clients } = useClients()
  const { orders } = useOrders()
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [statusTab, setStatusTab] = useState('All')
  const [sort, setSort] = useState({ key: 'issueDate', dir: 'desc' })
  const [panelOpen, setPanelOpen] = useState(false)

  const clientMap = useMemo(() => Object.fromEntries(clients.map(c => [c.id, c.company])), [clients])
  const orderMap  = useMemo(() => Object.fromEntries(orders.map(o => [o.id, o.orderId])),   [orders])

  const enriched = useMemo(() =>
    invoices.map(inv => ({
      ...inv,
      clientName: clientMap[inv.clientId] ?? '—',
      orderRef:   orderMap[inv.orderId]   ?? '—',
      total:      calcTotal(inv.lineItems),
    })),
    [invoices, clientMap, orderMap]
  )

  function toggleSort(key) {
    setSort(prev => prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' })
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return enriched.filter(inv => {
      const matchSearch =
        inv.invoiceNo.toLowerCase().includes(q) ||
        inv.clientName.toLowerCase().includes(q) ||
        (inv.orderRef ?? '').toLowerCase().includes(q)
      const matchStatus = statusTab === 'All' || inv.status === statusTab
      return matchSearch && matchStatus
    })
  }, [enriched, search, statusTab])

  const sorted = useMemo(() =>
    [...filtered].sort((a, b) => {
      const av = a[sort.key] ?? ''
      const bv = b[sort.key] ?? ''
      const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv))
      return sort.dir === 'asc' ? cmp : -cmp
    }),
    [filtered, sort]
  )

  function nextInvoiceNo() {
    const max = invoices.reduce((m, inv) => {
      const n = parseInt(inv.invoiceNo?.replace('INV-', '') || '0')
      return Math.max(m, n)
    }, 0)
    return `INV-${String(max + 1).padStart(3, '0')}`
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
        title="Invoicing"
        subtitle="Client billing and payment tracking"
        action={
          <button
            onClick={() => setPanelOpen(true)}
            className="px-4 py-2 bg-navy text-white text-sm font-body font-medium hover:bg-slate transition-colors duration-150"
          >
            New Invoice
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
            placeholder="Search invoices…"
            className="w-full pl-8 pr-3 py-2 text-sm font-body bg-white border border-navy/10 text-navy placeholder:text-slate/35 focus:outline-none focus:border-navy/30"
          />
        </div>
        <div className="flex items-center gap-1">
          {STATUS_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setStatusTab(tab)}
              className={`px-3 py-1.5 text-xs font-body font-medium border transition-colors duration-150 ${
                statusTab === tab
                  ? 'bg-navy text-white border-navy'
                  : 'bg-white text-slate/60 border-slate/20 hover:border-navy/30 hover:text-navy'
              }`}
            >
              {tab}
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
                <td colSpan={7} className="px-4 py-10 text-center text-slate/40">
                  {search || statusTab !== 'All' ? 'No invoices match your filters.' : 'No invoices yet.'}
                </td>
              </tr>
            ) : (
              sorted.map((inv, i) => (
                <tr
                  key={inv.id}
                  onClick={() => navigate(`/invoicing/${inv.id}`)}
                  className={`border-b border-navy/5 last:border-0 cursor-pointer hover:bg-navy/[0.025] transition-colors duration-100 ${
                    i % 2 === 0 ? '' : 'bg-slate/[0.015]'
                  }`}
                >
                  <td className="px-4 py-3 font-medium text-navy">{inv.invoiceNo}</td>
                  <td className="px-4 py-3 text-slate">{inv.clientName}</td>
                  <td className="px-4 py-3 text-slate/70">{inv.orderRef}</td>
                  <td className="px-4 py-3 text-slate tabular-nums">{fmt(inv.total)}</td>
                  <td className="px-4 py-3"><InvoiceStatusBadge status={inv.status} /></td>
                  <td className="px-4 py-3 text-slate/70">{formatDate(inv.issueDate)}</td>
                  <td className="px-4 py-3 text-slate/70">{formatDate(inv.dueDate)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {sorted.length > 0 && (
        <p className="mt-3 text-xs text-slate/40 font-body">
          {sorted.length} {sorted.length === 1 ? 'invoice' : 'invoices'}
          {statusTab !== 'All' && ` · ${statusTab}`}
        </p>
      )}

      <NewInvoicePanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        onSave={addInvoice}
        clients={clients}
        orders={orders}
        nextInvoiceNo={nextInvoiceNo()}
      />
    </div>
  )
}
