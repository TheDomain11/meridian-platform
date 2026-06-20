// Storage writes happen server-side (netlify/functions/upload-invoice-pdf.js) via the
// service-role key — the browser never writes to the invoices bucket or table directly,
// so this has no dependency on Storage/table RLS policies.

/** Converts a Blob to a base64 string (for uploading and for emailing as an attachment). */
export async function blobToBase64(blob) {
  const buffer = await blob.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}

/** Uploads a generated invoice PDF via the privileged server function and returns its public URL. */
export async function uploadInvoicePdf(pdfBase64, filename, invoiceId) {
  const res = await fetch('/.netlify/functions/upload-invoice-pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ invoiceId, filename, pdfBase64 }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || err.error || 'PDF upload failed.')
  }

  const { pdfUrl } = await res.json()
  return pdfUrl
}
