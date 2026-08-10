const { getSupabaseAdmin } = require('./_supabaseAdmin.js')

const BUCKET = 'documents'

// Mirrors upload-invoice-pdf.js's pattern: accepts base64 file content from the browser,
// uploads it via the service-role key, and records the result. Unlike invoices — which are
// regenerated from a template on every send — a document here is a one-off file a human
// already produced elsewhere (Claude Code, manual), so this is purely storage + metadata,
// never generation. Nothing in this file calls ai-service.js, draft-compliance-section-
// background.js, or generate-consultation-note.js.
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  let payload
  try {
    payload = JSON.parse(event.body)
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) }
  }

  const { orderId, clientId, docType, filename, fileBase64, contentType } = payload
  if (!orderId || !clientId || !docType || !filename || !fileBase64) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing required fields: orderId, clientId, docType, filename, fileBase64' }),
    }
  }

  try {
    const supabaseAdmin = getSupabaseAdmin()
    const buffer = Buffer.from(fileBase64, 'base64')
    // {orderId}/{filename} — namespaced by order so filenames don't collide across orders.
    const path = `${orderId}/${filename}`

    const { error: uploadError } = await supabaseAdmin.storage.from(BUCKET).upload(path, buffer, {
      contentType: contentType || 'application/octet-stream',
      upsert: true,
    })
    if (uploadError) throw uploadError

    const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path)
    const fileUrl = urlData.publicUrl

    const { data: document, error: insertError } = await supabaseAdmin
      .from('documents')
      .insert({
        order_id: orderId,
        client_id: clientId,
        doc_type: docType,
        file_url: fileUrl,
        filename,
      })
      .select()
      .single()
    if (insertError) throw insertError

    return { statusCode: 200, body: JSON.stringify({ document }) }
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message, code: err.code, details: err.details, hint: err.hint }),
    }
  }
}
