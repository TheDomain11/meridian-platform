// Per-record export for the Trash view — a single trashed record to CSV or PDF.
// Reuses the existing CSV helpers and the jspdf/jspdf-autotable pair already bundled for
// invoice PDFs; no new dependencies.
import { escapeCsv, downloadCsv } from './csvExport.js'

const NAVY = [12, 35, 64]
const GOLD = [196, 151, 59]

// Human labels for the entity, used in filenames and PDF headers.
const ENTITY_LABEL = {
  clients: 'Client',
  orders: 'Order',
  suppliers: 'Supplier',
  invoices: 'Invoice',
  team: 'Team Member',
  enquiries: 'Enquiry',
}

// Fields not worth showing to a human in an exported record.
const HIDDEN_FIELDS = new Set(['deletedBy'])

function labelFromKey(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, c => c.toUpperCase())
    .trim()
}

function stringifyValue(value) {
  if (value === null || value === undefined) return ''
  if (Array.isArray(value) || typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

/** Field/value pairs for a record, in stable insertion order, minus hidden internals. */
function fieldPairs(record) {
  return Object.entries(record)
    .filter(([key]) => !HIDDEN_FIELDS.has(key))
    .map(([key, value]) => [labelFromKey(key), stringifyValue(value)])
}

function baseFilename(entity, record) {
  const label = ENTITY_LABEL[entity] || entity
  const ref = record.invoiceNo || record.orderId || record.company || record.name || record.email || record.id || 'record'
  const safeRef = String(ref).replace(/[^\w.-]+/g, '-')
  return `meridian-${label.toLowerCase().replace(/\s+/g, '-')}-${safeRef}`
}

/** Downloads a two-column Field,Value CSV for a single trashed record. */
export function exportRecordCsv(entity, record) {
  const lines = ['Field,Value']
  for (const [label, value] of fieldPairs(record)) {
    lines.push([label, value].map(escapeCsv).join(','))
  }
  downloadCsv(`${baseFilename(entity, record)}.csv`, lines.join('\n'))
}

/** Downloads a branded single-record PDF (Field/Value table) for a trashed record. */
export async function exportRecordPdf(entity, record) {
  const { jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const label = ENTITY_LABEL[entity] || entity

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...NAVY)
  doc.text('Meridian International', 14, 18)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(...GOLD)
  doc.text(`${label} record`, 14, 25)

  autoTable(doc, {
    startY: 32,
    head: [['Field', 'Value']],
    body: fieldPairs(record),
    styles: { fontSize: 9, cellPadding: 2, overflow: 'linebreak' },
    headStyles: { fillColor: NAVY, textColor: [255, 255, 255] },
    columnStyles: { 0: { cellWidth: 50, fontStyle: 'bold' } },
    theme: 'grid',
  })

  const blob = doc.output('blob')
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${baseFilename(entity, record)}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
