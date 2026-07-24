const { getSupabaseAdmin } = require('./_supabaseAdmin.js')

const RESEND_API_KEY = process.env.RESEND_API_KEY
if (!RESEND_API_KEY) throw new Error('Missing required environment variable: RESEND_API_KEY')

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

  const { approvalId, finalResponseText } = payload
  if (!approvalId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing required field: approvalId' }) }
  }

  try {
    const supabaseAdmin = getSupabaseAdmin()

    const { data: approval, error: fetchError } = await supabaseAdmin
      .from('email_approvals')
      .select('*')
      .eq('id', approvalId)
      .single()
    if (fetchError) throw fetchError

    const responseText = finalResponseText?.trim() || approval.draft_response

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'George <george@meridianinternational.io>',
        to: [approval.from_email],
        subject: approval.subject ? `Re: ${approval.subject}` : 'Re: your enquiry',
        text: responseText,
      }),
    })

    const result = await res.json()
    if (!res.ok) {
      return { statusCode: res.status, body: JSON.stringify({ error: result }) }
    }

    const { error: updateError } = await supabaseAdmin
      .from('email_approvals')
      .update({ status: 'sent', sent_at: new Date().toISOString(), draft_response: responseText })
      .eq('id', approvalId)
    if (updateError) throw updateError

    return { statusCode: 200, body: JSON.stringify({ ok: true }) }
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message, code: err.code, details: err.details, hint: err.hint }) }
  }
}
