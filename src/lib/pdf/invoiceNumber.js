/** Derives the INV-YYYY-NNN display number used for filenames and the PDF body. */
export function formatInvoiceNumber(invoice) {
  const year = invoice.issueDate ? new Date(invoice.issueDate).getFullYear() : new Date().getFullYear()
  const seq = (invoice.invoiceNo?.match(/(\d+)$/)?.[1] ?? '000').padStart(3, '0')
  return `INV-${year}-${seq}`
}

export function invoicePdfFilename(invoice, client) {
  const displayNo = formatInvoiceNumber(invoice)
  const safeClient = (client?.company ?? 'Client').replace(/[^a-zA-Z0-9]+/g, '')
  return `${displayNo}_${safeClient}.pdf`
}
