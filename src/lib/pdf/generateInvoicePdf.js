import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatInvoiceNumber, invoicePdfFilename } from './invoiceNumber.js'

export { formatInvoiceNumber, invoicePdfFilename }

const NAVY = [12, 35, 64]
const GOLD = [196, 151, 59]
const SLATE = [61, 79, 95]
const CREAM = [244, 241, 235]
const WHITE = [255, 255, 255]

function fmtMoney(n, currency = 'USD') {
  return `${currency} ${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function lineTotal(item) {
  return (parseFloat(item.qty) || 0) * (parseFloat(item.unitPrice) || 0)
}

function subtotal(lineItems = []) {
  return lineItems.reduce((sum, item) => sum + lineTotal(item), 0)
}

/**
 * Builds the branded Meridian International invoice PDF.
 * Returns { blob, filename, displayNo }.
 */
export function generateInvoicePdf({ invoice, client, order }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const displayNo = formatInvoiceNumber(invoice)
  const currency = invoice.currency || 'USD'
  const total = subtotal(invoice.lineItems)

  // Full-page cream background
  doc.setFillColor(...CREAM)
  doc.rect(0, 0, pageWidth, doc.internal.pageSize.getHeight(), 'F')

  // Header band
  doc.setFillColor(...NAVY)
  doc.rect(0, 0, pageWidth, 38, 'F')

  doc.setFont('times', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(...WHITE)
  doc.text('Meridian International', 15, 18)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...GOLD)
  doc.text('China Sourcing & Procurement · Hong Kong', 15, 25)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...WHITE)
  doc.text('INVOICE', pageWidth - 15, 16, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...GOLD)
  doc.text(displayNo, pageWidth - 15, 22, { align: 'right' })

  doc.setTextColor(...WHITE)
  doc.text(`Issue Date: ${fmtDate(invoice.issueDate)}`, pageWidth - 15, 28, { align: 'right' })
  doc.text(`Due Date: ${fmtDate(invoice.dueDate)}`, pageWidth - 15, 33, { align: 'right' })

  // Bill To
  let y = 50
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(...GOLD)
  doc.text('BILL TO', 15, y)

  doc.setDrawColor(...GOLD)
  doc.setLineWidth(0.5)
  doc.line(15, y + 1.5, 35, y + 1.5)

  y += 7
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...NAVY)
  doc.text(client?.company ?? 'Client', 15, y)

  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...SLATE)
  if (client?.contact) {
    doc.text(client.contact, 15, y)
    y += 5
  }
  if (client?.country) {
    doc.text(client.country, 15, y)
    y += 5
  }
  if (order?.orderId) {
    doc.setTextColor(...SLATE)
    doc.text(`Order Ref: ${order.orderId}`, 15, y)
    y += 5
  }

  // Line items table
  const tableStartY = y + 8
  const rows = (invoice.lineItems ?? []).map(item => [
    item.description || '',
    String(item.qty ?? ''),
    fmtMoney(item.unitPrice ?? 0, currency),
    fmtMoney(lineTotal(item), currency),
  ])

  autoTable(doc, {
    startY: tableStartY,
    head: [['Description', 'Qty', 'Unit Price', 'Total']],
    body: rows,
    theme: 'plain',
    styles: {
      font: 'helvetica',
      fontSize: 9.5,
      textColor: NAVY,
      cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
    },
    headStyles: {
      fillColor: NAVY,
      textColor: WHITE,
      fontStyle: 'bold',
      fontSize: 9,
    },
    columnStyles: {
      0: { halign: 'left' },
      1: { halign: 'right', cellWidth: 20 },
      2: { halign: 'right', cellWidth: 32 },
      3: { halign: 'right', cellWidth: 32 },
    },
    alternateRowStyles: { fillColor: [255, 255, 255] },
    margin: { left: 15, right: 15 },
    tableLineColor: [12, 35, 64],
    tableLineWidth: 0.1,
  })

  let afterTableY = doc.lastAutoTable.finalY + 8

  // Totals box
  const totalsBoxWidth = 70
  const totalsX = pageWidth - 15 - totalsBoxWidth

  doc.setDrawColor(...NAVY)
  doc.setLineWidth(0.2)
  doc.line(totalsX, afterTableY, pageWidth - 15, afterTableY)

  afterTableY += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...SLATE)
  doc.text('Subtotal', totalsX, afterTableY)
  doc.text(fmtMoney(total, currency), pageWidth - 15, afterTableY, { align: 'right' })

  afterTableY += 8
  doc.setDrawColor(...GOLD)
  doc.setLineWidth(0.6)
  doc.line(totalsX, afterTableY - 4, pageWidth - 15, afterTableY - 4)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12.5)
  doc.setTextColor(...NAVY)
  doc.text(`Total (${currency})`, totalsX, afterTableY)
  doc.text(fmtMoney(total, currency), pageWidth - 15, afterTableY, { align: 'right' })

  let sectionY = afterTableY + 14

  // Notes
  if (invoice.notes) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(...GOLD)
    doc.text('NOTES', 15, sectionY)
    sectionY += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.setTextColor(...SLATE)
    const noteLines = doc.splitTextToSize(invoice.notes, pageWidth - 30)
    doc.text(noteLines, 15, sectionY)
    sectionY += noteLines.length * 4.5 + 6
  }

  // Payment instructions placeholder
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(...GOLD)
  doc.text('PAYMENT INSTRUCTIONS', 15, sectionY)
  sectionY += 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(...SLATE)
  const paymentLines = doc.splitTextToSize(
    'Bank transfer details will be provided separately, or pay securely online via the payment link included with this invoice.',
    pageWidth - 30
  )
  doc.text(paymentLines, 15, sectionY)

  // Footer
  const pageHeight = doc.internal.pageSize.getHeight()
  doc.setDrawColor(...GOLD)
  doc.setLineWidth(0.3)
  doc.line(15, pageHeight - 18, pageWidth - 15, pageHeight - 18)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...SLATE)
  doc.text(
    'george@meridianinternational.io  |  +852 6297 1699  |  meridianinternational.io',
    pageWidth / 2,
    pageHeight - 12,
    { align: 'center' }
  )

  const blob = doc.output('blob')
  const filename = invoicePdfFilename(invoice, client)

  return { blob, filename, displayNo }
}
