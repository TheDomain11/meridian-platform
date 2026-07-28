const { getSupabaseAdmin } = require('./_supabaseAdmin.js')

const RESEND_API_KEY = process.env.RESEND_API_KEY
if (!RESEND_API_KEY) throw new Error('Missing required environment variable: RESEND_API_KEY')
const GEORGE_EMAIL = 'george@meridianinternational.io'
const APPROVALS_BASE_URL = 'https://platform.meridianinternational.io/approvals'
// ai-service.js is the only place in the platform that calls the AI provider directly —
// this function calls it over HTTP rather than hitting Claude itself.
const SITE_URL = process.env.URL || process.env.DEPLOY_URL || 'http://localhost:8888'

// Resend's inbound webhook nests the message under `data`, with `from` as either a
// "Name <email>" string or a { name, email } object — this normalizes both shapes,
// and also tolerates a flatter payload as a fallback.
function parseInboundPayload(body) {
  const data = body?.data ?? body ?? {}
  const rawFrom = data.from ?? body?.from

  let fromEmail = ''
  let fromName = ''

  if (typeof rawFrom === 'string') {
    const match = rawFrom.match(/^(.*?)\s*<(.+)>$/)
    if (match) {
      fromName = match[1].trim().replace(/^"|"$/g, '')
      fromEmail = match[2].trim()
    } else {
      fromEmail = rawFrom.trim()
    }
  } else if (rawFrom && typeof rawFrom === 'object') {
    fromEmail = rawFrom.email ?? ''
    fromName = rawFrom.name ?? ''
  }

  return {
    fromEmail: fromEmail.toLowerCase(),
    fromName: fromName || fromEmail,
    subject: data.subject ?? body?.subject ?? '',
    bodyText: data.text ?? data.html ?? body?.text ?? body?.html ?? '',
  }
}

async function classifyAndDraft({ fromName, fromEmail, subject, bodyText }) {
  const fallback = {
    intent: 'GENERAL',
    clientName: fromName,
    company: null,
    productInterest: null,
    budget: null,
    summary: subject || 'Inbound email could not be auto-summarized.',
    draftResponse: '',
  }

  try {
    const res = await fetch(`${SITE_URL}/.netlify/functions/ai-service`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        feature: 'email_process',
        payload: { fromName, fromEmail, subject, bodyText },
      }),
    })
    const json = await res.json()
    if (!res.ok || json.error) {
      throw new Error(json.error || `ai-service responded with status ${res.status}`)
    }
    return json.result ?? fallback
  } catch (err) {
    // Degrade gracefully rather than lose the enquiry — the raw email is still saved either way.
    console.error('[inbound-email] ai-service call failed:', err)
    return fallback
  }
}

async function sendNotificationEmail({ approvalId, summary, draftResponse, fromEmail, fromName }) {
  const approveLink = `${APPROVALS_BASE_URL}/${approvalId}`

  const html = `
    <div style="font-family:Arial,sans-serif;color:#0C2340;max-width:560px;margin:0 auto;line-height:1.6;">
      <p style="color:#C4973B;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">New inbound enquiry</p>
      <p><strong>${fromName}</strong> &lt;${fromEmail}&gt;</p>
      <p>${summary}</p>
      <div style="background:#F4F1EB;border:1px solid #0C234014;padding:16px;margin:20px 0;white-space:pre-wrap;">${draftResponse}</div>
      <p style="margin:28px 0;">
        <a href="${approveLink}" style="background:#0C2340;color:#ffffff;padding:12px 24px;text-decoration:none;font-family:Georgia,serif;display:inline-block;">
          Review &amp; Approve
        </a>
      </p>
    </div>
  `

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Meridian Platform <notifications@meridianinternational.io>',
      to: [GEORGE_EMAIL],
      subject: `New enquiry: ${summary}`,
      html,
    }),
  })

  if (!res.ok) {
    const result = await res.json().catch(() => ({}))
    throw new Error(`Resend notification error: ${result.message || JSON.stringify(result)}`)
  }
}

exports.handler = async (event) => {
  console.log('Resend inbound payload:', JSON.stringify(event.body ?? null).slice(0, 2000))

  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      body: JSON.stringify({ status: 'ok' }),
    }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  let body
  try {
    body = JSON.parse(event.body)
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) }
  }

  const { fromEmail, fromName, subject, bodyText } = parseInboundPayload(body)
  if (!fromEmail) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Could not determine sender email from payload' }) }
  }

  // Loop prevention — ignore emails from internal addresses or Resend
  const internalDomains = ['meridianinternational.io', 'resend.com', 'amazonses.com']
  const senderDomain = fromEmail.split('@')[1]?.toLowerCase() || ''
  if (internalDomains.some(d => senderDomain.includes(d))) {
    console.log('Loop prevention: ignoring internal email from', fromEmail)
    return {
      statusCode: 200,
      body: JSON.stringify({ status: 'ignored', reason: 'internal sender' }),
    }
  }

  try {
    const supabaseAdmin = getSupabaseAdmin()

    const parsed = await classifyAndDraft({ fromName, fromEmail, subject, bodyText })

    // Ignore soft-deleted clients here — a trashed client must not be resurrected by a new
    // inbound email; a fresh client row is created instead.
    const { data: existingClient, error: lookupError } = await supabaseAdmin
      .from('clients')
      .select('id, company')
      .eq('email', fromEmail)
      .is('deleted_at', null)
      .maybeSingle()
    if (lookupError) throw lookupError

    let clientId = existingClient?.id ?? null

    if (!existingClient) {
      const { data: newClient, error: insertClientError } = await supabaseAdmin
        .from('clients')
        .insert({
          company: parsed.company || '',
          contact: parsed.clientName || fromName,
          email: fromEmail,
          phone: '',
          country: '',
          status: 'Pipeline',
          source: 'inbound_email',
          notes: '',
          open_orders: 0,
        })
        .select()
        .single()
      if (insertClientError) throw insertClientError
      clientId = newClient.id
    }
    // If the client already existed, the email_approvals row inserted below — linked via
    // client_id, with the raw subject/body and Claude's summary — serves as the interaction log.

    const { data: approval, error: approvalError } = await supabaseAdmin
      .from('email_approvals')
      .insert({
        from_email: fromEmail,
        from_name: fromName,
        subject,
        body_raw: bodyText,
        intent: parsed.intent,
        client_id: clientId,
        summary: parsed.summary,
        draft_response: parsed.draftResponse,
        status: 'pending',
      })
      .select()
      .single()
    if (approvalError) throw approvalError

    await sendNotificationEmail({
      approvalId: approval.id,
      summary: parsed.summary,
      draftResponse: parsed.draftResponse,
      fromEmail,
      fromName,
    })

    return { statusCode: 200, body: JSON.stringify({ ok: true, approvalId: approval.id }) }
  } catch (err) {
    // Still ack the webhook so Resend doesn't retry into a queue we can't drain — but log
    // loudly so the failure is visible in Netlify's function logs.
    console.error('[inbound-email] processing failed:', err)
    return { statusCode: 200, body: JSON.stringify({ ok: false, error: err.message }) }
  }
}
