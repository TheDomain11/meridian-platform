import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Send } from 'lucide-react'
import { useClients, useOrders, useSuppliers } from '../../context/AppContext.jsx'

async function executeAction(action, data, store) {
  if (!action || action === 'none' || action === 'query' || !data) return null

  const { clients, addClient, updateClient, orders, addOrder, updateOrder, suppliers, addSupplier, updateSupplier } = store

  switch (action) {
    case 'create_client': {
      const created = await addClient(data)
      return { label: 'Client created — view record', to: `/clients/${created.id}` }
    }
    case 'update_client': {
      const existing = clients.find(c => c.id === data.id)
      if (!existing) throw new Error('Could not find that client to update.')
      const updated = await updateClient(data.id, { ...existing, ...data })
      return { label: 'Client updated — view record', to: `/clients/${updated.id}` }
    }
    case 'create_order': {
      const created = await addOrder(data)
      return { label: 'Order created — view order', to: `/orders/${created.id}` }
    }
    case 'update_order': {
      const existing = orders.find(o => o.id === data.id)
      if (!existing) throw new Error('Could not find that order to update.')
      const updated = await updateOrder(data.id, { ...existing, ...data })
      return { label: 'Order updated — view order', to: `/orders/${updated.id}` }
    }
    case 'create_supplier': {
      const created = await addSupplier(data)
      return { label: 'Supplier created — view record', to: `/suppliers/${created.id}` }
    }
    case 'update_supplier': {
      const existing = suppliers.find(s => s.id === data.id)
      if (!existing) throw new Error('Could not find that supplier to update.')
      const updated = await updateSupplier(data.id, { ...existing, ...data })
      return { label: 'Supplier updated — view record', to: `/suppliers/${updated.id}` }
    }
    case 'send_email': {
      const to = data.approvalId ? `/approvals/${data.approvalId}` : '/approvals'
      return { label: 'Email drafted — review in approvals', to }
    }
    default:
      return null
  }
}

export default function AIShellBar() {
  const [input, setInput] = useState('')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState(null) // { text, confirmation, error }
  const containerRef = useRef(null)

  const clientsStore = useClients()
  const ordersStore = useOrders()
  const suppliersStore = useSuppliers()

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    function handleEscape(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    const instruction = input.trim()
    if (!instruction || loading) return

    setLoading(true)
    setOpen(true)
    setResponse(null)
    setInput('')

    const context = {
      clients: clientsStore.clients.map(c => ({ id: c.id, company: c.company, status: c.status })),
      orders: ordersStore.orders.map(o => ({
        id: o.id,
        orderId: o.orderId,
        clientName: clientsStore.clients.find(c => c.id === o.clientId)?.company ?? null,
        status: o.status,
      })),
      suppliers: suppliersStore.suppliers.map(s => ({ id: s.id, name: s.name, status: s.status })),
    }

    try {
      const res = await fetch('/.netlify/functions/ai-service', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature: 'shell_command', payload: { instruction, context } }),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        throw new Error(json.error || 'The AI shell could not respond.')
      }

      const confirmation = await executeAction(json.action, json.data, {
        clients: clientsStore.clients,
        addClient: clientsStore.addClient,
        updateClient: clientsStore.updateClient,
        orders: ordersStore.orders,
        addOrder: ordersStore.addOrder,
        updateOrder: ordersStore.updateOrder,
        suppliers: suppliersStore.suppliers,
        addSupplier: suppliersStore.addSupplier,
        updateSupplier: suppliersStore.updateSupplier,
      })

      setResponse({ text: json.result, confirmation, error: null })
    } catch (err) {
      setResponse({ text: null, confirmation: null, error: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div ref={containerRef} className="fixed bottom-0 left-56 right-0 z-30">
      <div
        className={`bg-cream border-t border-navy/10 px-6 overflow-hidden transition-all duration-200 ${
          open && response ? 'max-h-48 py-4' : 'max-h-0 py-0'
        }`}
      >
        {response?.error && <p className="text-sm font-body text-red-700">{response.error}</p>}
        {response?.text && <p className="text-sm font-body text-navy mb-2">{response.text}</p>}
        {response?.confirmation && (
          <Link
            to={response.confirmation.to}
            onClick={() => setOpen(false)}
            className="text-sm font-body text-teal hover:text-navy underline transition-colors duration-150"
          >
            {response.confirmation.label}
          </Link>
        )}
      </div>

      <form onSubmit={handleSubmit} className="bg-navy px-6 py-3 flex items-center gap-3">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onFocus={() => response && setOpen(true)}
          placeholder="Ask Claude anything or give an instruction..."
          disabled={loading}
          className="flex-1 bg-white/10 text-cream placeholder:text-cream/40 text-sm font-body px-4 py-2.5 focus:outline-none focus:bg-white/15 transition-colors duration-150 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="w-10 h-10 flex-shrink-0 bg-teal text-white flex items-center justify-center disabled:opacity-40 transition-opacity duration-150"
          aria-label="Send"
        >
          <Send size={15} strokeWidth={1.75} />
        </button>
      </form>
    </div>
  )
}
