const { getSupabaseAdmin } = require('./_supabaseAdmin.js')
const { renderEmail, esc } = require('./lib/email-template.js')

// Drop the real key into the Netlify site's environment variables as RESEND_API_KEY.
// See README section "Resend / Stripe setup" for exact steps.
const RESEND_API_KEY = process.env.RESEND_API_KEY
if (!RESEND_API_KEY) throw new Error('Missing required environment variable: RESEND_API_KEY')
const FROM_ADDRESS = 'George <george@meridianinternational.io>'

// Mirrors send-invoice-email.js's pattern (Resend send + status update on success), adapted
// for a document that already exists in Storage rather than one regenerated on every send:
// takes just documentId, fetches the document + order + client itself, downloads the file
// server-side, and emails it as an attachment. This is a send-what-was-already-uploaded
// step, never a generation step — nothing here calls ai-service.js, draft-compliance-
// section-background.js, or generate-consultation-note.js.
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

  const { documentId } = payload
  if (!documentId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing required field: documentId' }) }
  }

  try {
    const supabaseAdmin = getSupabaseAdmin()

    const { data: doc, error: docError } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single()
    if (docError) throw docError

    const [{ data: order, error: orderError }, { data: client, error: clientError }] = await Promise.all([
      supabaseAdmin.from('orders').select('order_id, reference').eq('id', doc.order_id).single(),
      supabaseAdmin.from('clients').select('email, contact, company').eq('id', doc.client_id).single(),
    ])
    if (orderError) throw orderError
    if (clientError) throw clientError

    if (!client.email) {
      return { statusCode: 400, body: JSON.stringify({ error: 'This client has no email address on file.' }) }
    }

    // documents.file_url is a public Storage URL — download the bytes server-side so they
    // can be attached to the outbound email.
    const fileRes = await fetch(doc.file_url)
    if (!fileRes.ok) throw new Error(`Could not download document from storage (status ${fileRes.status})`)
    const fileBuffer = Buffer.from(await fileRes.arrayBuffer())
    const fileBase64 = fileBuffer.toString('base64')

    const orderRef = order.reference || order.order_id

    // Same closing, signature and footer as every other client email.
    const { html, text } = renderEmail({
      greeting: `Dear ${client.contact || client.company || 'Client'},`,
      paragraphs: [
        {
          html: `Please find attached the <strong>${esc(doc.doc_type)}</strong> for order <strong>${esc(orderRef)}</strong>.`,
          text: `Please find attached the ${doc.doc_type} for order ${orderRef}.`,
        },
        'If you have any questions, reply to this email.',
      ],
    })

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [client.email],
        subject: `${doc.doc_type} — ${orderRef} — Meridian International`,
        text,
        html,
        attachments: [{ filename: doc.filename, content: fileBase64 }],
      }),
    })

    const result = await res.json()
    if (!res.ok) {
      return { statusCode: res.status, body: JSON.stringify({ error: result }) }
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('documents')
      .update({ sent_at: new Date().toISOString(), sent_to: client.email })
      .eq('id', documentId)
      .select()
      .single()
    if (updateError) throw updateError

    return { statusCode: 200, body: JSON.stringify({ success: true, id: result.id, document: updated }) }
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message, code: err.code, details: err.details, hint: err.hint }),
    }
  }
}
