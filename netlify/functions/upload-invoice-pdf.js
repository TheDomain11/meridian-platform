import { getSupabaseAdmin } from './_supabaseAdmin.js'

const BUCKET = 'invoices'

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  let payload
  try {
    payload = JSON.parse(event.body)
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) }
  }

  const { invoiceId, filename, pdfBase64 } = payload
  if (!invoiceId || !filename || !pdfBase64) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields: invoiceId, filename, pdfBase64' }) }
  }

  try {
    const supabaseAdmin = getSupabaseAdmin()
    const buffer = Buffer.from(pdfBase64, 'base64')

    const { error: uploadError } = await supabaseAdmin.storage.from(BUCKET).upload(filename, buffer, {
      contentType: 'application/pdf',
      upsert: true,
    })
    if (uploadError) throw uploadError

    const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(filename)
    const pdfUrl = urlData.publicUrl

    const { error: updateError } = await supabaseAdmin.from('invoices').update({ pdf_url: pdfUrl }).eq('id', invoiceId)
    if (updateError) throw updateError

    return { statusCode: 200, body: JSON.stringify({ pdfUrl }) }
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}
