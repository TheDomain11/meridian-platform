import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AppContext = createContext(null)

// ── Transform helpers ────────────────────────────────────────────────────────

function toClient(row) {
  return {
    id:           row.id,
    company:      row.company,
    contact:      row.contact,
    email:        row.email,
    phone:        row.phone,
    country:      row.country,
    status:       row.status,
    source:       row.source ?? '',
    notes:        row.notes ?? '',
    openOrders:   row.open_orders ?? 0,
    lastActivity: row.last_activity,
  }
}
function fromClient(data) {
  return {
    company:       data.company,
    contact:       data.contact,
    email:         data.email,
    phone:         data.phone,
    country:       data.country,
    status:        data.status,
    source:        data.source ?? '',
    notes:         data.notes ?? '',
    open_orders:   data.openOrders ?? 0,
    last_activity: data.lastActivity,
  }
}

function toOrder(row) {
  return {
    id:          row.id,
    orderId:     row.order_id,
    clientId:    row.client_id,
    reference:   row.reference ?? '',
    category:    row.category,
    description: row.description ?? '',
    value:       row.value,
    origin:      row.origin ?? '',
    status:      row.status,
    deadline:    row.deadline,
    createdAt:   row.created_at,
    notes:       row.notes ?? '',
  }
}
function fromOrder(data) {
  return {
    order_id:    data.orderId,
    client_id:   data.clientId,
    reference:   data.reference ?? '',
    category:    data.category,
    description: data.description ?? '',
    value:       data.value,
    origin:      data.origin ?? '',
    status:      data.status,
    deadline:    data.deadline,
    notes:       data.notes ?? '',
  }
}

function toSupplier(row) {
  return {
    id:              row.id,
    name:            row.name,
    contactName:     row.contact_name ?? '',
    wechat:          row.wechat ?? '',
    phone:           row.phone ?? '',
    email:           row.email ?? '',
    location:        row.location ?? '',
    category:        row.category ?? '',
    moq:             row.moq ?? '',
    leadTime:        row.lead_time ?? null,
    paymentTerms:    row.payment_terms ?? '',
    verified:        row.verified ?? false,
    status:          row.status,
    ordersFulfilled: row.orders_fulfilled ?? 0,
    lastUsed:        row.last_used,
    notes:           row.notes ?? '',
  }
}
function fromSupplier(data) {
  return {
    name:             data.name,
    contact_name:     data.contactName ?? '',
    wechat:           data.wechat ?? '',
    phone:            data.phone ?? '',
    email:            data.email ?? '',
    location:         data.location ?? '',
    category:         data.category ?? '',
    moq:              data.moq ?? '',
    lead_time:        data.leadTime ?? null,
    payment_terms:    data.paymentTerms ?? '',
    verified:         data.verified ?? false,
    status:           data.status,
    orders_fulfilled: data.ordersFulfilled ?? 0,
    last_used:        data.lastUsed,
    notes:            data.notes ?? '',
  }
}

// Some rows have line_items written with "unit" (and a precomputed "total") rather than
// the "unitPrice" key the app's own invoice form writes — normalize both shapes here.
function normalizeLineItems(items) {
  return (items ?? []).map(item => ({
    description: item.description ?? '',
    qty:         item.qty ?? 0,
    unitPrice:   item.unitPrice ?? item.unit ?? 0,
  }))
}

function toInvoice(row) {
  return {
    id:             row.id,
    invoiceNo:      row.invoice_no,
    clientId:       row.client_id,
    orderId:        row.order_id,
    status:         row.status,
    issueDate:      row.issue_date,
    dueDate:        row.due_date,
    currency:       row.currency ?? 'USD',
    lineItems:      normalizeLineItems(row.line_items),
    notes:          row.notes ?? '',
    pdfUrl:         row.pdf_url ?? null,
    paymentLinkUrl: row.payment_link_url ?? null,
  }
}
function fromInvoice(data) {
  return {
    invoice_no:        data.invoiceNo,
    client_id:         data.clientId,
    order_id:          data.orderId ?? null,
    status:            data.status,
    issue_date:        data.issueDate,
    due_date:          data.dueDate,
    currency:          data.currency ?? 'USD',
    line_items:        data.lineItems ?? [],
    notes:             data.notes ?? '',
    pdf_url:           data.pdfUrl ?? null,
    payment_link_url:  data.paymentLinkUrl ?? null,
  }
}

function toMember(row) {
  return {
    id:         row.id,
    name:       row.name,
    email:      row.email,
    phone:      row.phone ?? '',
    whatsapp:   row.whatsapp ?? '',
    role:       row.role,
    department: row.department,
    status:     row.status,
    lastActive: row.last_active,
    notes:      row.notes ?? '',
  }
}
function fromMember(data) {
  return {
    name:        data.name,
    email:       data.email,
    phone:       data.phone ?? '',
    whatsapp:    data.whatsapp ?? '',
    role:        data.role,
    department:  data.department,
    status:      data.status,
    last_active: data.lastActive,
    notes:       data.notes ?? '',
  }
}

// ── Provider ─────────────────────────────────────────────────────────────────

export function AppProvider({ children }) {
  const [clients,   setClients]   = useState([])
  const [orders,    setOrders]    = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [invoices,  setInvoices]  = useState([])
  const [team,      setTeam]      = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)

  useEffect(() => {
    async function fetchAll() {
      try {
        const [c, o, s, i, t] = await Promise.all([
          supabase.from('clients').select('*').order('company'),
          supabase.from('orders').select('*').order('created_at', { ascending: false }),
          supabase.from('suppliers').select('*').order('name'),
          supabase.from('invoices').select('*').order('issue_date', { ascending: false }),
          supabase.from('team').select('*').order('name'),
        ])
        if (c.error) throw c.error
        if (o.error) throw o.error
        if (s.error) throw s.error
        if (i.error) throw i.error
        if (t.error) throw t.error
        setClients(c.data.map(toClient))
        setOrders(o.data.map(toOrder))
        setSuppliers(s.data.map(toSupplier))
        setInvoices(i.data.map(toInvoice))
        setTeam(t.data.map(toMember))
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  // --- Clients ---
  async function addClient(data) {
    const { data: row, error } = await supabase
      .from('clients')
      .insert(fromClient(data))
      .select()
      .single()
    if (error) throw error
    setClients(prev => [...prev, toClient(row)])
  }
  async function updateClient(id, data) {
    const { data: row, error } = await supabase
      .from('clients')
      .update(fromClient(data))
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    setClients(prev => prev.map(c => (c.id === id ? toClient(row) : c)))
  }

  // --- Orders ---
  async function addOrder(data) {
    const { data: row, error } = await supabase
      .from('orders')
      .insert(fromOrder(data))
      .select()
      .single()
    if (error) throw error
    setOrders(prev => [toOrder(row), ...prev])
  }
  async function updateOrder(id, data) {
    const { data: row, error } = await supabase
      .from('orders')
      .update(fromOrder(data))
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    setOrders(prev => prev.map(o => (o.id === id ? toOrder(row) : o)))
  }

  // --- Suppliers ---
  async function addSupplier(data) {
    const { data: row, error } = await supabase
      .from('suppliers')
      .insert(fromSupplier(data))
      .select()
      .single()
    if (error) throw error
    setSuppliers(prev => [...prev, toSupplier(row)])
  }
  async function updateSupplier(id, data) {
    const { data: row, error } = await supabase
      .from('suppliers')
      .update(fromSupplier(data))
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    setSuppliers(prev => prev.map(s => (s.id === id ? toSupplier(row) : s)))
  }

  // --- Invoices ---
  async function addInvoice(data) {
    const { data: row, error } = await supabase
      .from('invoices')
      .insert(fromInvoice(data))
      .select()
      .single()
    if (error) throw error
    setInvoices(prev => [toInvoice(row), ...prev])
  }
  async function updateInvoice(id, data) {
    const { data: row, error } = await supabase
      .from('invoices')
      .update(fromInvoice(data))
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    setInvoices(prev => prev.map(i => (i.id === id ? toInvoice(row) : i)))
  }
  // Syncs local state after a write already persisted server-side (e.g. via a
  // service-role Netlify function) — does not touch Supabase, so it has no RLS dependency.
  function patchInvoiceLocal(id, fields) {
    setInvoices(prev => prev.map(i => (i.id === id ? { ...i, ...fields } : i)))
  }

  // --- Team ---
  async function addMember(data) {
    const { data: row, error } = await supabase
      .from('team')
      .insert(fromMember(data))
      .select()
      .single()
    if (error) throw error
    setTeam(prev => [...prev, toMember(row)])
  }
  async function updateMember(id, data) {
    const { data: row, error } = await supabase
      .from('team')
      .update(fromMember(data))
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    setTeam(prev => prev.map(m => (m.id === id ? toMember(row) : m)))
  }

  return (
    <AppContext.Provider
      value={{
        loading, error,
        clients,   addClient,   updateClient,
        orders,    addOrder,    updateOrder,
        suppliers, addSupplier, updateSupplier,
        invoices,  addInvoice,  updateInvoice, patchInvoiceLocal,
        team,      addMember,   updateMember,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useAppContext() {
  return useContext(AppContext)
}

export const useClients = () => {
  const { clients, addClient, updateClient } = useContext(AppContext)
  return { clients, addClient, updateClient }
}
export const useOrders = () => {
  const { orders, addOrder, updateOrder } = useContext(AppContext)
  return { orders, addOrder, updateOrder }
}
export const useSuppliers = () => {
  const { suppliers, addSupplier, updateSupplier } = useContext(AppContext)
  return { suppliers, addSupplier, updateSupplier }
}
export const useInvoices = () => {
  const { invoices, addInvoice, updateInvoice, patchInvoiceLocal } = useContext(AppContext)
  return { invoices, addInvoice, updateInvoice, patchInvoiceLocal }
}
export const useTeam = () => {
  const { team, addMember, updateMember } = useContext(AppContext)
  return { team, addMember, updateMember }
}
