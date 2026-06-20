import { supabase } from './supabase.js'

const BUCKET = 'invoices'

/** Uploads a generated invoice PDF and returns its public URL. */
export async function uploadInvoicePdf(blob, filename) {
  const { error } = await supabase.storage.from(BUCKET).upload(filename, blob, {
    contentType: 'application/pdf',
    upsert: true,
  })
  if (error) throw error

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename)
  return data.publicUrl
}

/** Converts a Blob to a base64 string (for emailing as an attachment). */
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
