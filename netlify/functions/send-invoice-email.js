const { getSupabaseAdmin } = require('./_supabaseAdmin.js')

// Drop the real key into the Netlify site's environment variables as RESEND_API_KEY.
// See README section "Resend / Stripe setup" for exact steps.
const RESEND_API_KEY = process.env.RESEND_API_KEY || 'PLACEHOLDER_RESEND_API_KEY'
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

  const paymentBlock = paymentLink
    ? `<p style="margin:28px 0;">
         <a href="${paymentLink}" style="background:#0C2340;color:#ffffff;padding:12px 24px;text-decoration:none;font-family:Georgia,serif;display:inline-block;">
           Pay Invoice ${displayNo}
         </a>
       </p>`
    : ''

  const html = `
    <div style="font-family:Arial,sans-serif;color:#0C2340;max-width:560px;margin:0 auto;line-height:1.6;">
      <p>Dear ${clientName || 'Client'},</p>
      <p>Please find attached invoice <strong>${displayNo}</strong> for <strong>${currency} ${total}</strong>, due ${dueDate}.</p>
      ${paymentBlock}
      <p>If you have any questions about this invoice, simply reply to this email.</p>
      <p>Thank you for your business.</p>
      <p style="margin-top:32px;color:#3D4F5F;">
        George<br/>
        Meridian International<br/>
        george@meridianinternational.io | +852 6297 1699
      </p>
    </div>
  `

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
      const { error: updateError } = await supabaseAdmin.from('invoices').update({ status }).eq('id', invoiceId)
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
