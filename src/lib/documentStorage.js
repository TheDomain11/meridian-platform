// Storage writes happen server-side (netlify/functions/upload-document.js,
// send-document-email.js) via the service-role key — the browser never writes to the
// documents bucket or table directly, so this has no dependency on Storage/table RLS
// policies. Mirrors invoiceStorage.js's pattern.

/** Uploads a document via the privileged server function and returns the created record. */
export async function uploadDocument({ fileBase64, filename, orderId, clientId, docType, contentType }) {
  const res = await fetch('/.netlify/functions/upload-document', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileBase64, filename, orderId, clientId, docType, contentType }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || err.error || 'Document upload failed.')
  }

  const { document } = await res.json()
  return document
}

/** Sends a previously-uploaded document to the client via the privileged server function. */
export async function sendDocumentEmail(documentId) {
  const res = await fetch('/.netlify/functions/send-document-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ documentId }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || err.error || 'Document could not be sent.')
  }

  const { document } = await res.json()
  return document
}
