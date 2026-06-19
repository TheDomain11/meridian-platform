import { createContext, useContext, useState } from 'react'
import { INITIAL_CLIENTS } from '../lib/clientsData'

const ClientsContext = createContext(null)

export function ClientsProvider({ children }) {
  const [clients, setClients] = useState(INITIAL_CLIENTS)

  function addClient(data) {
    setClients(prev => [
      ...prev,
      {
        ...data,
        id: String(Date.now()),
        openOrders: 0,
        lastActivity: new Date().toISOString().slice(0, 10),
      },
    ])
  }

  function updateClient(id, data) {
    setClients(prev => prev.map(c => (c.id === id ? { ...c, ...data } : c)))
  }

  return (
    <ClientsContext.Provider value={{ clients, addClient, updateClient }}>
      {children}
    </ClientsContext.Provider>
  )
}

export function useClients() {
  return useContext(ClientsContext)
}
