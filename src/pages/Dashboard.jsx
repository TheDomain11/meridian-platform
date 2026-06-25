import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'
import PageHeader from '../components/PageHeader.jsx'
import OrderStatusBadge from '../components/orders/OrderStatusBadge.jsx'
import DashboardInsight from '../components/ai/DashboardInsight.jsx'

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function Dashboard() {
  const { clients, orders, suppliers, invoices } = useAppContext()

  const metrics = useMemo(() => [
    {
      label: 'Active Clients',
      value: clients.filter(c => c.status === 'Active').length,
    },
    {
      label: 'Open Orders',
      value: orders.filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled').length,
    },
    {
      label: 'Pending Invoices',
      value: invoices.filter(i => i.status === 'Draft' || i.status === 'Sent').length,
    },
    {
      label: 'Active Suppliers',
      value: suppliers.filter(s => s.status === 'Active').length,
    },
  ], [clients, orders, suppliers, invoices])

  const clientMap = useMemo(
    () => Object.fromEntries(clients.map(c => [c.id, c.company])),
    [clients]
  )

  const recentOrders = useMemo(() => {
    return [...orders]
      .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
      .slice(0, 3)
  }, [orders])

  return (
    <div className="p-8">
      <PageHeader
        title="Dashboard"
        subtitle="Overview of Meridian operations"
      />

      <DashboardInsight clients={clients} orders={orders} invoices={invoices} />

      {/* Metric tiles */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {metrics.map((m) => (
          <div key={m.label} className="bg-white border border-navy/8 px-5 py-4">
            <p className="text-xs font-body font-medium text-slate/60 uppercase tracking-wider mb-2">
              {m.label}
            </p>
            <p className="font-heading text-2xl text-navy">{m.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Recent Orders */}
        <div className="bg-white border border-navy/8">
          <div className="px-5 py-4 border-b border-navy/6 flex items-center justify-between">
            <p className="text-xs font-body font-medium text-slate/60 uppercase tracking-wider">
              Recent Orders
            </p>
            <Link
              to="/orders"
              className="text-xs font-body text-slate/45 hover:text-navy transition-colors duration-150"
            >
              View all →
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <p className="px-5 py-6 text-sm text-slate/40 font-body">No orders yet.</p>
          ) : (
            <table className="w-full text-sm font-body">
              <thead>
                <tr className="border-b border-navy/5">
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-slate/45 uppercase tracking-wider">Order</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-slate/45 uppercase tracking-wider">Client</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-slate/45 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-slate/45 uppercase tracking-wider">Deadline</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map(order => (
                  <tr key={order.id} className="border-b border-navy/5 last:border-0">
                    <td className="px-5 py-3 font-medium text-navy">
                      <Link
                        to={`/orders/${order.id}`}
                        className="hover:text-teal transition-colors duration-150"
                      >
                        {order.orderId}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate/70">{clientMap[order.clientId] ?? '—'}</td>
                    <td className="px-4 py-3"><OrderStatusBadge status={order.status} /></td>
                    <td className="px-4 py-3 text-slate/60">{formatDate(order.deadline)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Upcoming Deadlines */}
        <div className="bg-white border border-navy/8">
          <div className="px-5 py-4 border-b border-navy/6">
            <p className="text-xs font-body font-medium text-slate/60 uppercase tracking-wider">
              Upcoming Deadlines
            </p>
          </div>
          <p className="px-5 py-6 text-sm text-slate/40 font-body">No data yet.</p>
        </div>
      </div>
    </div>
  )
}
