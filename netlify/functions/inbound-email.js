const { getSupabaseAdmin } = require('./_supabaseAdmin.js')

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'PLACEHOLDER_ANTHROPIC_API_KEY'
const RESEND_API_KEY = process.env.RESEND_API_KEY || 'PLACEHOLDER_RESEND_API_KEY'
const MODEL = 'claude-sonnet-4-6'
const GEORGE_EMAIL = 'george@meridianinternational.io'
const APPROVALS_BASE_URL = 'https://platform.meridianinternational.io/approvals'

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

function stripMarkdownFences(text) {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
}

async function classifyAndDraft({ fromName, fromEmail, subject, bodyText }) {
  const systemPrompt = `You are an inbound email triage assistant for Meridian International, a B2B China sourcing and procurement agency based in Hong Kong, run by founder George. Meridian sources factories, negotiates pricing, and manages quality control and logistics for B2B clients on a commission basis — it does not hold inventory itself.

You will be given the text of an inbound email. Do all of the following:
1. Classify the intent as exactly one of: NEW_ENQUIRY, RFQ, STATUS_UPDATE, GENERAL
2. Extract the sender's name, company (if mentioned or reasonably inferable), product interest, and budget (if mentioned)
3. Write a one-line summary of the enquiry
4. Draft a professional reply in George's voice — first person ("I"), specific and concrete (reference exactly what they asked about), warm but business-like, signed "George" with no placeholder brackets left for the user to fill in

Respond with ONLY a JSON object — no markdown code fences, no commentary before or after — in exactly this shape:
{
  "intent": "NEW_ENQUIRY" | "RFQ" | "STATUS_UPDATE" | "GENERAL",
  "clientName": string,
  "company": string or null,
  "productInterest": string or null,
  "budget": string or null,
  "summary": string,
  "draftResponse": string
}`

  const userMessage = `From: ${fromName} <${fromEmail}>\nSubject: ${subject}\n\n${bodyText}`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  })

  const result = await res.json()
  if (!res.ok) {
    throw new Error(`Claude API error: ${result.error?.message || JSON.stringify(result)}`)
  }

  const raw = result.content?.[0]?.text ?? ''
  try {
    return JSON.parse(stripMarkdownFences(raw))
  } catch {
    // Degrade gracefully rather than lose the enquiry — the raw email is still saved either way.
    return {
      intent: 'GENERAL',
      clientName: fromName,
      company: null,
      productInterest: null,
      budget: null,
      summary: subject || 'Inbound email could not be auto-summarized.',
      draftResponse: '',
    }
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

  try {
    const supabaseAdmin = getSupabaseAdmin()

    const parsed = await classifyAndDraft({ fromName, fromEmail, subject, bodyText })

    const { data: existingClient, error: lookupError } = await supabaseAdmin
      .from('clients')
      .select('id, company')
      .eq('email', fromEmail)
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
