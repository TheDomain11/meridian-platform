const { getSupabaseAdmin } = require('./_supabaseAdmin.js')
const { renderEmail, esc } = require('./lib/email-template.js')

// Drop the real key into the Netlify site's environment variables as RESEND_API_KEY.
// See README section "Resend / Stripe setup" for exact steps.
const RESEND_API_KEY = process.env.RESEND_API_KEY
if (!RESEND_API_KEY) throw new Error('Missing required environment variable: RESEND_API_KEY')
const FROM_ADDRESS = 'George <george@meridianinternational.io>'

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

  const { invoiceId, to, clientName, displayNo, total, currency, dueDate, pdfBase64, pdfFilename, paymentLink, status } = payload

  if (!invoiceId || !to || !pdfBase64 || !pdfFilename) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields: invoiceId, to, pdfBase64, pdfFilename' }) }
  }

  const paragraphs = [
    {
      html: `Please find attached invoice <strong>${esc(displayNo)}</strong> for <strong>${esc(currency)} ${esc(total)}</strong>, due ${esc(dueDate)}.`,
      text: `Please find attached invoice ${displayNo} for ${currency} ${total}, due ${dueDate}.`,
    },
  ]
  if (paymentLink) {
    paragraphs.push({
      html: `<a href="${esc(paymentLink)}" style="background:#86632F;color:#ffffff;padding:12px 24px;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:15px;display:inline-block;">Pay invoice ${esc(displayNo)}</a>`,
      text: `Pay online: ${paymentLink}`,
    })
  }
  paragraphs.push('If you have any questions about this invoice, reply to this email.', 'Thank you for your business.')

  // Same closing, signature and footer as every other client email.
  const { html, text } = renderEmail({ greeting: `Dear ${clientName || 'Client'},`, paragraphs })

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [to],
        subject: `Invoice ${displayNo} — Meridian International`,
        text,
        html,
        attachments: [{ filename: pdfFilename, content: pdfBase64 }],
      }),
    })

    const result = await res.json()
    if (!res.ok) {
      return { statusCode: res.status, body: JSON.stringify({ error: result }) }
    }

    if (status) {
      const supabaseAdmin = getSupabaseAdmin()
      // Defensive: never touch a trashed invoice, even though the UI can't reach one.
      const { error: updateError } = await supabaseAdmin.from('invoices').update({ status }).eq('id', invoiceId).is('deleted_at', null)
      if (updateError) throw updateError
    }

    return { statusCode: 200, body: JSON.stringify({ success: true, id: result.id }) }
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message, code: err.code, details: err.details, hint: err.hint }),
    }
  }
}
