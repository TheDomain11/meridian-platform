import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, FileText, Pencil, RefreshCw, FileDown, Send, Link2, Copy, Check } from 'lucide-react'
import { useInvoices, useClients, useOrders } from '../context/AppContext'
import InvoiceStatusBadge from '../components/invoicing/InvoiceStatusBadge.jsx'
import NewInvoicePanel from '../components/invoicing/NewInvoicePanel.jsx'
import { formatInvoiceNumber } from '../lib/pdf/invoiceNumber.js'
import { uploadInvoicePdf, blobToBase64 } from '../lib/invoiceStorage.js'

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function calcTotal(lineItems = []) {
  return lineItems.reduce((sum, l) => sum + (parseFloat(l.qty) || 0) * (parseFloat(l.unitPrice) || 0), 0)
}

function fmt(n) {
  return `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function InvoiceDetail() {
  const { id } = useParams()
  const { invoices, updateInvoice } = useInvoices()
  const { clients } = useClients()
  const { orders } = useOrders()
  const [editOpen, setEditOpen] = useState(false)

  const [busy, setBusy] = useState(null) // 'generate' | 'send' | 'link' | null
  const [feedback, setFeedback] = useState(null) // { type: 'error'|'success', text }
  const [copied, setCopied] = useState(false)

  const invoice = invoices.find(inv => inv.id === id)
  const client  = invoice ? clients.find(c => c.id === invoice.clientId) : null
  const order   = invoice ? orders.find(o => o.id === invoice.orderId)   : null

  if (!invoice) {
    return (
      <div className="p-8">
        <Link to="/invoicing" className="flex items-center gap-1.5 text-sm text-slate/55 hover:text-navy transition-colors duration-150 font-body mb-6 w-fit">
          <ArrowLeft size={14} /> Invoicing
        </Link>
        <p className="text-slate/40 font-body text-sm">Invoice not found.</p>
      </div>
    )
  }

  const total = calcTotal(invoice.lineItems)
  const displayNo = formatInvoiceNumber(invoice)

  function nextInvoiceNo() {
    const max = invoices.reduce((m, inv) => {
      const n = parseInt(inv.invoiceNo?.replace('INV-', '') || '0')
      return Math.max(m, n)
    }, 0)
    return `INV-${String(max + 1).padStart(3, '0')}`
  }

  const canMarkSent = invoice.status === 'Draft'
  const canMarkPaid = invoice.status === 'Sent' || invoice.status === 'Overdue'

  async function handleGenerate() {
    setBusy('generate')
    setFeedback(null)
    try {
      const { generateInvoicePdf } = await import('../lib/pdf/generateInvoicePdf.js')
      const { blob, filename } = generateInvoicePdf({ invoice, client, order })
      const pdfUrl = await uploadInvoicePdf(blob, filename)
      await updateInvoice(invoice.id, { ...invoice, pdfUrl })
      setFeedback({ type: 'success', text: 'PDF generated and saved.' })
    } catch (err) {
      setFeedback({ type: 'error', text: `Could not generate PDF: ${err.message}` })
    } finally {
      setBusy(null)
    }
  }

  async function handleSend() {
    if (!client?.email) {
      setFeedback({ type: 'error', text: 'This client has no email address on file.' })
      return
    }
    setBusy('send')
    setFeedback(null)
    try {
      const { generateInvoicePdf } = await import('../lib/pdf/generateInvoicePdf.js')
      const { blob, filename } = generateInvoicePdf({ invoice, client, order })
      const pdfUrl = await uploadInvoicePdf(blob, filename)
      const pdfBase64 = await blobToBase64(blob)

      const res = await fetch('/.netlify/functions/send-invoice-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: client.email,
          clientName: client.contact || client.company,
          displayNo,
          total: fmt(total).replace('$', ''),
          currency: invoice.currency || 'USD',
          dueDate: formatDate(invoice.dueDate),
          pdfBase64,
          pdfFilename: filename,
          paymentLink: invoice.paymentLinkUrl || null,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error?.message || err.error || 'Email could not be sent.')
      }

      await updateInvoice(invoice.id, { ...invoice, pdfUrl, status: invoice.status === 'Draft' ? 'Sent' : invoice.status })
      setFeedback({ type: 'success', text: `Invoice emailed to ${client.email}.` })
    } catch (err) {
      setFeedback({ type: 'error', text: `Could not send invoice: ${err.message}` })
    } finally {
      setBusy(null)
    }
  }

  async function handleCreatePaymentLink() {
    setBusy('link')
    setFeedback(null)
    try {
      const res = await fetch('/.netlify/functions/create-payment-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayNo,
          amount: total,
          currency: invoice.currency || 'usd',
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error?.message || err.error || 'Payment link could not be created.')
      }

      const { url } = await res.json()
      await updateInvoice(invoice.id, { ...invoice, paymentLinkUrl: url })
      setFeedback({ type: 'success', text: 'Stripe payment link created.' })
    } catch (err) {
      setFeedback({ type: 'error', text: `Could not create payment link: ${err.message}` })
    } finally {
      setBusy(null)
    }
  }

  function copyPaymentLink() {
    if (!invoice.paymentLinkUrl) return
    navigator.clipboard.writeText(invoice.paymentLinkUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="p-8">
      {/* Back */}
      <Link
        to="/invoicing"
        className="flex items-center gap-1.5 text-sm text-slate/55 hover:text-navy transition-colors duration-150 font-body mb-6 w-fit"
      >
        <ArrowLeft size={14} />
        Invoicing
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-navy/6 flex items-center justify-center flex-shrink-0">
            <FileText size={18} strokeWidth={1.5} className="text-navy/50" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-heading text-2xl text-navy">{invoice.invoiceNo}</h1>
              <InvoiceStatusBadge status={invoice.status} />
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              {client && (
                <Link
                  to={`/clients/${client.id}`}
                  className="text-sm font-body text-teal hover:text-navy transition-colors duration-150"
                >
                  {client.company}
                </Link>
              )}
              {order && (
                <>
                  <span className="text-slate/30">·</span>
                  <Link
                    to={`/orders/${order.id}`}
                    className="text-sm font-body text-slate/60 hover:text-navy transition-colors duration-150"
                  >
                    {order.orderId}
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Zoho placeholder */}
          <button
            disabled
            className="flex items-center gap-2 px-4 py-2 border border-slate/15 text-sm font-body text-slate/30 cursor-not-allowed"
            title="Zoho Books integration coming soon"
          >
            <RefreshCw size={13} strokeWidth={1.75} />
            Sync to Zoho Books
          </button>

          {canMarkSent && (
            <button
              onClick={() => updateInvoice(invoice.id, { ...invoice, status: 'Sent' })}
              className="px-4 py-2 border border-teal/40 text-sm font-body text-teal hover:bg-teal/5 transition-colors duration-150"
            >
              Mark as Sent
            </button>
          )}

          {canMarkPaid && (
            <button
              onClick={() => updateInvoice(invoice.id, { ...invoice, status: 'Paid' })}
              className="px-4 py-2 bg-navy text-white text-sm font-body font-medium hover:bg-slate transition-colors duration-150"
            >
              Mark as Paid
            </button>
          )}

          <button
            onClick={() => setEditOpen(true)}
            className="flex items-center gap-2 px-4 py-2 border border-navy/15 text-sm font-body text-slate hover:text-navy hover:border-navy/30 transition-colors duration-150"
          >
            <Pencil size={13} strokeWidth={1.75} />
            Edit
          </button>
        </div>
      </div>

      {/* PDF / Email / Payment actions */}
      <div className="bg-white border border-navy/8 mb-4 px-5 py-4 flex flex-wrap items-center gap-3">
        <button
          onClick={handleGenerate}
          disabled={busy !== null}
          className="flex items-center gap-2 px-4 py-2 border border-navy/15 text-sm font-body text-slate hover:text-navy hover:border-navy/30 transition-colors duration-150 disabled:opacity-50"
        >
          <FileDown size={14} strokeWidth={1.75} />
          {busy === 'generate' ? 'Generating…' : 'Generate Invoice'}
        </button>

        <button
          onClick={handleSend}
          disabled={busy !== null}
          className="flex items-center gap-2 px-4 py-2 bg-navy text-white text-sm font-body font-medium hover:bg-slate transition-colors duration-150 disabled:opacity-50"
        >
          <Send size={13} strokeWidth={1.75} />
          {busy === 'send' ? 'Sending…' : 'Send Invoice'}
        </button>

        <button
          onClick={handleCreatePaymentLink}
          disabled={busy !== null}
          className="flex items-center gap-2 px-4 py-2 border border-gold/50 text-sm font-body text-gold hover:bg-gold/5 transition-colors duration-150 disabled:opacity-50"
        >
          <Link2 size={13} strokeWidth={1.75} />
          {busy === 'link' ? 'Creating…' : 'Create Payment Link'}
        </button>

        {invoice.pdfUrl && (
          <a
            href={invoice.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-body text-teal hover:text-navy transition-colors duration-150 ml-auto"
          >
            View PDF →
          </a>
        )}

        {feedback && (
          <p className={`w-full text-sm font-body ${feedback.type === 'error' ? 'text-red-700' : 'text-teal'}`}>
            {feedback.text}
          </p>
        )}

        {invoice.paymentLinkUrl && (
          <div className="w-full flex items-center gap-2 bg-cream/60 border border-navy/8 px-3 py-2">
            <Link2 size={13} className="text-gold flex-shrink-0" />
            <a
              href={invoice.paymentLinkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-body text-slate truncate flex-1 hover:text-navy transition-colors duration-150"
            >
              {invoice.paymentLinkUrl}
            </a>
            <button
              onClick={copyPaymentLink}
              className="text-slate/50 hover:text-navy transition-colors duration-150 flex-shrink-0"
              title="Copy link"
            >
              {copied ? <Check size={13} className="text-teal" /> : <Copy size={13} />}
            </button>
          </div>
        )}
      </div>

      {/* Invoice body */}
      <div className="bg-white border border-navy/8 mb-4">
        {/* Meta row */}
        <div className="grid grid-cols-4 border-b border-navy/8">
          {[
            { label: 'Issue Date', value: formatDate(invoice.issueDate) },
            { label: 'Due Date',   value: formatDate(invoice.dueDate) },
            { label: 'Currency',   value: invoice.currency || 'USD' },
            { label: 'Order Ref',  value: order?.orderId ?? '—' },
          ].map(({ label, value }) => (
            <div key={label} className="px-5 py-4 border-r border-navy/8 last:border-0">
              <p className="text-xs font-body text-slate/50 uppercase tracking-wider mb-1">{label}</p>
              <p className="text-sm font-body text-navy font-medium">{value}</p>
            </div>
          ))}
        </div>

        {/* Line items */}
        <table className="w-full text-sm font-body">
          <thead>
            <tr className="border-b border-navy/8">
              <th className="text-left px-5 py-3 text-xs font-medium text-slate/50 uppercase tracking-wider">Description</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-slate/50 uppercase tracking-wider w-20">Qty</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-slate/50 uppercase tracking-wider w-32">Unit Price</th>
              <th className="text-right px-5 py-3 text-xs font-medium text-slate/50 uppercase tracking-wider w-32">Total</th>
            </tr>
          </thead>
          <tbody>
            {(invoice.lineItems ?? []).map((item, i) => {
              const rowTotal = (parseFloat(item.qty) || 0) * (parseFloat(item.unitPrice) || 0)
              return (
                <tr key={i} className="border-b border-navy/5 last:border-0">
                  <td className="px-5 py-3 text-navy">{item.description}</td>
                  <td className="px-4 py-3 text-right text-slate tabular-nums">{item.qty}</td>
                  <td className="px-4 py-3 text-right text-slate tabular-nums">{fmt(item.unitPrice)}</td>
                  <td className="px-5 py-3 text-right text-navy tabular-nums font-medium">{fmt(rowTotal)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Totals */}
        <div className="border-t border-navy/8 px-5 py-4 flex justify-end">
          <div className="w-64">
            <div className="flex justify-between py-1.5 text-sm font-body text-slate/60 border-b border-navy/6">
              <span>Subtotal</span>
              <span className="tabular-nums">{fmt(total)}</span>
            </div>
            <div className="flex justify-between py-2 text-base font-body font-semibold text-navy">
              <span>Total (USD)</span>
              <span className="tabular-nums">{fmt(total)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="border-t border-navy/8 px-5 py-4">
            <p className="text-xs font-body text-slate/50 uppercase tracking-wider mb-1.5">Notes</p>
            <p className="text-sm font-body text-slate leading-relaxed">{invoice.notes}</p>
          </div>
        )}
      </div>

      {/* Placeholder sections */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <div className="bg-white border border-navy/8 p-5">
            <p className="text-xs font-body font-medium text-slate/55 uppercase tracking-wider mb-4">Activity Log</p>
            <p className="text-sm text-slate/35 font-body">No data yet.</p>
          </div>
        </div>
        <div className="col-span-1">
          <div className="bg-white border border-navy/8 p-5">
            <p className="text-xs font-body font-medium text-slate/55 uppercase tracking-wider mb-4">Documents</p>
            {invoice.pdfUrl ? (
              <a
                href={invoice.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm font-body text-teal hover:text-navy transition-colors duration-150"
              >
                <FileText size={14} strokeWidth={1.75} />
                {displayNo}.pdf
              </a>
            ) : (
              <p className="text-sm text-slate/35 font-body">No data yet.</p>
            )}
          </div>
        </div>
      </div>

      <NewInvoicePanel
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSave={data => updateInvoice(invoice.id, data)}
        initialData={invoice}
        clients={clients}
        orders={orders}
        nextInvoiceNo={nextInvoiceNo()}
      />
    </div>
  )
}
