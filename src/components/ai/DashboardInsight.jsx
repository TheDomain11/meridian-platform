import { useEffect, useState } from 'react'

function calcInvoiceTotal(lineItems = []) {
  return lineItems.reduce((sum, l) => sum + (parseFloat(l.qty) || 0) * (parseFloat(l.unitPrice) || 0), 0)
}

export default function DashboardInsight({ clients, orders, invoices }) {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const today = new Date().toISOString().slice(0, 10)
        const clientMap = Object.fromEntries(clients.map(c => [c.id, c.company]))

        const openOrders = orders.filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled')
        const overdueOrders = openOrders.filter(o => o.deadline && o.deadline < today)
        const pendingInvoices = invoices.filter(i => i.status === 'Draft' || i.status === 'Sent')
        const overdueInvoices = invoices.filter(i => i.status === 'Sent' && i.dueDate && i.dueDate < today)

        let newApprovals = 0
        try {
          const approvalsRes = await fetch('/.netlify/functions/list-approvals')
          if (approvalsRes.ok) {
            const { approvals } = await approvalsRes.json()
            newApprovals = approvals.length
          }
        } catch {
          // Non-fatal — the summary still works without the approvals count.
        }

        const payload = {
          openOrders: openOrders.length,
          pendingInvoices: pendingInvoices.length,
          newApprovals,
          overdueOrders: overdueOrders.map(o => ({
            orderId: o.orderId,
            client: clientMap[o.clientId] ?? null,
            deadline: o.deadline,
          })),
          overdueInvoices: overdueInvoices.map(i => ({
            invoiceNo: i.invoiceNo,
            client: clientMap[i.clientId] ?? null,
            dueDate: i.dueDate,
            total: calcInvoiceTotal(i.lineItems),
          })),
        }

        const res = await fetch('/.netlify/functions/ai-service', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ feature: 'dashboard_summary', payload }),
        })
        const json = await res.json()
        if (!res.ok || json.error) {
          throw new Error(json.error || 'Could not generate a summary right now.')
        }
        if (!cancelled) setSummary(json.result?.summary ?? null)
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [clients, orders, invoices])

  return (
    <div className="bg-cream border border-navy/8 border-l-4 border-l-gold px-5 py-4 mb-8">
      <p className="text-xs font-body font-medium text-slate/55 uppercase tracking-wider mb-2">Meridian AI</p>
      {loading && <p className="text-sm font-body text-slate/40">Thinking…</p>}
      {error && <p className="text-sm font-body text-red-700">{error}</p>}
      {!loading && !error && summary && (
        <p className="text-sm font-body text-navy leading-relaxed">{summary}</p>
      )}
    </div>
  )
}
