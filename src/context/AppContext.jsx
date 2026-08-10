import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext.jsx'

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
    id:             row.id,
    orderId:        row.order_id,
    clientId:       row.client_id,
    reference:      row.reference ?? '',
    category:       row.category,
    description:    row.description ?? '',
    value:          row.value,
    origin:         row.origin ?? '',
    status:         row.status,
    deadline:       row.deadline,
    createdAt:      row.created_at,
    notes:          row.notes ?? '',
    engagementType: row.engagement_type,
    advisoryStage:  row.advisory_stage,
  }
}
function fromOrder(data) {
  return {
    order_id:        data.orderId,
    client_id:       data.clientId,
    reference:       data.reference ?? '',
    category:        data.category,
    description:     data.description ?? '',
    value:           data.value,
    origin:          data.origin ?? '',
    status:          data.status,
    deadline:        data.deadline,
    notes:           data.notes ?? '',
    engagement_type: data.engagementType,
    advisory_stage:  data.advisoryStage,
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

// enquiries are read-only in the app (written by the public form via a Netlify function).
// They surface only in the Trash view, so we need a display transform but no fromEnquiry.
function toEnquiry(row) {
  return {
    id:                row.id,
    name:              row.name,
    company:           row.company ?? '',
    email:             row.email,
    phone:             row.phone ?? '',
    enquiryType:       row.enquiry_type ?? '',
    productCategory:   row.product_category ?? '',
    destinationMarket: row.destination_market ?? '',
    orderValue:        row.order_value ?? '',
    timeline:          row.timeline ?? '',
    existingSuppliers: row.existing_suppliers ?? '',
    message:           row.message ?? '',
    createdAt:         row.created_at ?? null,
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

const TRASH_EMPTY = { clients: [], orders: [], suppliers: [], invoices: [], team: [], enquiries: [] }

export function AppProvider({ children }) {
  const { user } = useAuth()

  const [clients,   setClients]   = useState([])
  const [orders,    setOrders]    = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [invoices,  setInvoices]  = useState([])
  const [team,      setTeam]      = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)

  const [trash,        setTrash]        = useState(TRASH_EMPTY)
  const [trashLoading, setTrashLoading] = useState(false)
  const [trashError,   setTrashError]   = useState(null)

  useEffect(() => {
    async function fetchAll() {
      try {
        // `.is('deleted_at', null)` on every live fetch is the single chokepoint that keeps
        // soft-deleted rows out of the entire normal UI — all list/detail/dashboard/AI views
        // read from these arrays and never query Supabase directly.
        const [c, o, s, i, t] = await Promise.all([
          supabase.from('clients').select('*').is('deleted_at', null).order('company'),
          supabase.from('orders').select('*').is('deleted_at', null).order('created_at', { ascending: false }),
          supabase.from('suppliers').select('*').is('deleted_at', null).order('name'),
          supabase.from('invoices').select('*').is('deleted_at', null).order('issue_date', { ascending: false }),
          supabase.from('team').select('*').is('deleted_at', null).order('name'),
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
    const client = toClient(row)
    setClients(prev => [...prev, client])
    return client
  }
  async function updateClient(id, data) {
    const { data: row, error } = await supabase
      .from('clients')
      .update(fromClient(data))
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    const client = toClient(row)
    setClients(prev => prev.map(c => (c.id === id ? client : c)))
    return client
  }

  // --- Orders ---
  async function addOrder(data) {
    const { data: row, error } = await supabase
      .from('orders')
      .insert(fromOrder(data))
      .select()
      .single()
    if (error) throw error
    const order = toOrder(row)
    setOrders(prev => [order, ...prev])
    return order
  }
  async function updateOrder(id, data) {
    const { data: row, error } = await supabase
      .from('orders')
      .update(fromOrder(data))
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    const order = toOrder(row)
    setOrders(prev => prev.map(o => (o.id === id ? order : o)))
    return order
  }

  // --- Suppliers ---
  async function addSupplier(data) {
    const { data: row, error } = await supabase
      .from('suppliers')
      .insert(fromSupplier(data))
      .select()
      .single()
    if (error) throw error
    const supplier = toSupplier(row)
    setSuppliers(prev => [...prev, supplier])
    return supplier
  }
  async function updateSupplier(id, data) {
    const { data: row, error } = await supabase
      .from('suppliers')
      .update(fromSupplier(data))
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    const supplier = toSupplier(row)
    setSuppliers(prev => prev.map(s => (s.id === id ? supplier : s)))
    return supplier
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

  // --- Soft delete / trash ---
  // Maps an entity/table name to its live-array setter and row transform. Enquiries have
  // no live array in the app (they're never fetched into normal views), so setter is null.
  const ENTITY_CONFIG = {
    clients:   { setter: setClients,   transform: toClient },
    orders:    { setter: setOrders,    transform: toOrder },
    suppliers: { setter: setSuppliers, transform: toSupplier },
    invoices:  { setter: setInvoices,  transform: toInvoice },
    team:      { setter: setTeam,      transform: toMember },
    enquiries: { setter: null,         transform: toEnquiry },
  }
  const TRASH_TABLES = Object.keys(ENTITY_CONFIG)

  // Soft-delete a live record: stamp deleted_at/deleted_by and drop it from its live array.
  // Only the 5 core tables expose this (enquiries has no user-facing trash action).
  async function softDelete(entity, id) {
    const { error } = await supabase
      .from(entity)
      .update({ deleted_at: new Date().toISOString(), deleted_by: user?.id ?? null })
      .eq('id', id)
    if (error) throw error
    ENTITY_CONFIG[entity]?.setter?.(prev => prev.filter(x => x.id !== id))
  }

  // Loads every trashed row across all in-scope tables. Lazy — called when /trash mounts.
  async function loadTrash() {
    setTrashLoading(true)
    setTrashError(null)
    try {
      const results = await Promise.all(
        TRASH_TABLES.map(t =>
          supabase.from(t).select('*').not('deleted_at', 'is', null).order('deleted_at', { ascending: false })
        )
      )
      const next = {}
      TRASH_TABLES.forEach((t, idx) => {
        const { data, error: err } = results[idx]
        if (err) throw err
        const transform = ENTITY_CONFIG[t].transform
        next[t] = data.map(row => ({ ...transform(row), deletedAt: row.deleted_at, deletedBy: row.deleted_by }))
      })
      setTrash(next)
    } catch (err) {
      setTrashError(err.message)
    } finally {
      setTrashLoading(false)
    }
  }

  // Restore a trashed record. Core tables restore via a direct authenticated UPDATE;
  // enquiries route through the service-role function (no assumed UPDATE policy on that table).
  async function restore(entity, id) {
    const record = trash[entity]?.find(r => r.id === id)

    if (entity === 'enquiries') {
      const res = await fetch('/.netlify/functions/restore-record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: entity, id }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || json.error) throw new Error(json.error || 'Could not restore this record.')
    } else {
      const { error: err } = await supabase
        .from(entity)
        .update({ deleted_at: null, deleted_by: null })
        .eq('id', id)
      if (err) throw err
    }

    setTrash(prev => ({ ...prev, [entity]: prev[entity].filter(r => r.id !== id) }))

    // Put it back into the live array (list pages sort client-side, so order here is moot).
    const setter = ENTITY_CONFIG[entity]?.setter
    if (setter && record) {
      const { deletedAt, deletedBy, ...live } = record
      setter(prev => [...prev, live])
    }
  }

  // Permanent, irreversible delete — always via the service-role function, never a direct
  // frontend DELETE. Surfaces the function's foreign-key message on a 409.
  async function permanentDelete(entity, id) {
    const res = await fetch('/.netlify/functions/purge-record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table: entity, id }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok || json.error) throw new Error(json.error || 'Could not permanently delete this record.')
    setTrash(prev => ({ ...prev, [entity]: prev[entity].filter(r => r.id !== id) }))
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
        trash, trashLoading, trashError, loadTrash, softDelete, restore, permanentDelete,
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
export const useTrash = () => {
  const { trash, trashLoading, trashError, loadTrash, softDelete, restore, permanentDelete } = useContext(AppContext)
  return { trash, trashLoading, trashError, loadTrash, softDelete, restore, permanentDelete }
}
