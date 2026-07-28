export function escapeCsv(value) {
  const s = String(value ?? '')
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function calcTotal(lineItems = []) {
  return lineItems.reduce((sum, l) => sum + (parseFloat(l.qty) || 0) * (parseFloat(l.unitPrice) || 0), 0)
}

const HEADERS = ['Invoice No', 'Client', 'Order', 'Amount', 'Currency', 'Status', 'Issue Date', 'Due Date', 'PDF URL']

/** Builds the accountant/auditor CSV for invoices issued within [from, to] (inclusive, ISO dates). */
export function buildInvoicesCsv(invoices, clientMap, orderMap, { from, to } = {}) {
  const rows = invoices.filter(inv => {
    if (from && inv.issueDate < from) return false
    if (to && inv.issueDate > to) return false
    return true
  })

  const lines = [HEADERS.join(',')]
  for (const inv of rows) {
    lines.push([
      inv.invoiceNo,
      clientMap[inv.clientId] ?? '',
      orderMap[inv.orderId] ?? '',
      calcTotal(inv.lineItems).toFixed(2),
      inv.currency || 'USD',
      inv.status,
      inv.issueDate ?? '',
      inv.dueDate ?? '',
      inv.pdfUrl ?? '',
    ].map(escapeCsv).join(','))
  }
  return lines.join('\n')
}

export function downloadCsv(filename, content) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
