import { useMemo } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { useClients, useOrders, useSuppliers, useInvoices, useTeam } from '../../context/AppContext.jsx'

const MODULE_BY_SEGMENT = {
  dashboard: 'Dashboard',
  clients: 'Clients',
  orders: 'Orders',
  suppliers: 'Suppliers',
  invoicing: 'Invoicing',
  team: 'Team',
  settings: 'Settings',
}

function calcInvoiceTotal(lineItems = []) {
  return lineItems.reduce((sum, l) => sum + (parseFloat(l.qty) || 0) * (parseFloat(l.unitPrice) || 0), 0)
}

/** Derives { module, entity, label } describing what the user is currently looking at. */
export function useAIContext() {
  const location = useLocation()
  const params = useParams()
  const { clients } = useClients()
  const { orders } = useOrders()
  const { suppliers } = useSuppliers()
  const { invoices } = useInvoices()
  const { team } = useTeam()

  return useMemo(() => {
    const segment = location.pathname.split('/').filter(Boolean)[0] ?? 'dashboard'
    const module = MODULE_BY_SEGMENT[segment] ?? 'Dashboard'
    const id = params.id

    let entity = null

    if (id && module === 'Clients') {
      const c = clients.find(c => c.id === id)
      if (c) entity = { type: 'Client', company: c.company, contact: c.contact, status: c.status, country: c.country }
    }
    if (id && module === 'Orders') {
      const o = orders.find(o => o.id === id)
      if (o) {
        const client = clients.find(c => c.id === o.clientId)
        entity = {
          type: 'Order',
          orderId: o.orderId,
          status: o.status,
          category: o.category,
          clientName: client?.company ?? null,
        }
      }
    }
    if (id && module === 'Suppliers') {
      const s = suppliers.find(s => s.id === id)
      if (s) entity = { type: 'Supplier', name: s.name, status: s.status, category: s.category, location: s.location }
    }
    if (id && module === 'Invoicing') {
      const inv = invoices.find(inv => inv.id === id)
      if (inv) {
        const client = clients.find(c => c.id === inv.clientId)
        entity = {
          type: 'Invoice',
          invoiceNo: inv.invoiceNo,
          status: inv.status,
          currency: inv.currency || 'USD',
          total: calcInvoiceTotal(inv.lineItems),
          dueDate: inv.dueDate,
          clientName: client?.company ?? null,
        }
      }
    }
    if (id && module === 'Team') {
      const m = team.find(m => m.id === id)
      if (m) entity = { type: 'Team Member', name: m.name, role: m.role, department: m.department, status: m.status }
    }

    return { module, entity }
  }, [location.pathname, params.id, clients, orders, suppliers, invoices, team])
}
