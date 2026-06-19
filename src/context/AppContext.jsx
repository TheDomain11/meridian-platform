import { createContext, useContext, useState } from 'react'
import { INITIAL_CLIENTS } from '../lib/clientsData'
import { INITIAL_ORDERS } from '../lib/ordersData'
import { INITIAL_SUPPLIERS } from '../lib/suppliersData'
import { INITIAL_INVOICES } from '../lib/invoicesData'
import { INITIAL_TEAM } from '../lib/teamData'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [clients,   setClients]   = useState(INITIAL_CLIENTS)
  const [orders,    setOrders]    = useState(INITIAL_ORDERS)
  const [suppliers, setSuppliers] = useState(INITIAL_SUPPLIERS)
  const [invoices,  setInvoices]  = useState(INITIAL_INVOICES)
  const [team,      setTeam]      = useState(INITIAL_TEAM)

  // --- Clients ---
  function addClient(data) {
    setClients(prev => [
      ...prev,
      { ...data, id: String(Date.now()), openOrders: 0, lastActivity: new Date().toISOString().slice(0, 10) },
    ])
  }
  function updateClient(id, data) {
    setClients(prev => prev.map(c => (c.id === id ? { ...c, ...data } : c)))
  }

  // --- Orders ---
  function addOrder(data) {
    setOrders(prev => [
      ...prev,
      { ...data, id: String(Date.now()), createdAt: new Date().toISOString().slice(0, 10) },
    ])
  }
  function updateOrder(id, data) {
    setOrders(prev => prev.map(o => (o.id === id ? { ...o, ...data } : o)))
  }

  // --- Suppliers ---
  function addSupplier(data) {
    setSuppliers(prev => [
      ...prev,
      { ...data, id: String(Date.now()), ordersFulfilled: 0, lastUsed: null },
    ])
  }
  function updateSupplier(id, data) {
    setSuppliers(prev => prev.map(s => (s.id === id ? { ...s, ...data } : s)))
  }

  // --- Invoices ---
  function addInvoice(data) {
    setInvoices(prev => [
      ...prev,
      { ...data, id: String(Date.now()), status: data.status ?? 'Draft' },
    ])
  }
  function updateInvoice(id, data) {
    setInvoices(prev => prev.map(i => (i.id === id ? { ...i, ...data } : i)))
  }

  // --- Team ---
  function addMember(data) {
    setTeam(prev => [
      ...prev,
      { ...data, id: String(Date.now()), lastActive: new Date().toISOString().slice(0, 10) },
    ])
  }
  function updateMember(id, data) {
    setTeam(prev => prev.map(m => (m.id === id ? { ...m, ...data } : m)))
  }

  return (
    <AppContext.Provider
      value={{
        clients,   addClient,   updateClient,
        orders,    addOrder,    updateOrder,
        suppliers, addSupplier, updateSupplier,
        invoices,  addInvoice,  updateInvoice,
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

// Scoped hooks — each module imports only what it needs
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
  const { invoices, addInvoice, updateInvoice } = useContext(AppContext)
  return { invoices, addInvoice, updateInvoice }
}
export const useTeam = () => {
  const { team, addMember, updateMember } = useContext(AppContext)
  return { team, addMember, updateMember }
}
