const { getSupabaseAdmin } = require('./_supabaseAdmin.js')

const RESEND_API_KEY = process.env.RESEND_API_KEY
if (!RESEND_API_KEY) throw new Error('Missing required environment variable: RESEND_API_KEY')

const GEORGE_EMAIL = 'enquiries@meridianinternational.io'
const FROM_ADDRESS = 'Meridian International <enquiries@meridianinternational.io>'
// ai-service.js is the only place in the platform that calls the AI provider directly —
// this function calls it over HTTP rather than hitting Claude itself.
const SITE_URL = process.env.URL || process.env.DEPLOY_URL || 'http://localhost:8888'

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://meridianinternational.io',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

async function sendResendEmail({ to, subject, text }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM_ADDRESS, to: [to], subject, text }),
  })

  if (!res.ok) {
    const result = await res.json().catch(() => ({}))
    throw new Error(`Resend error: ${result.message || JSON.stringify(result)}`)
  }
}

// Mirrors inbound-email.js's classifyAndDraft — reuses ai-service.js's email_process
// feature so web-form enquiries get the same Claude-drafted summary/reply as inbound
// emails, rather than duplicating that prompt logic here.
async function classifyAndDraft({ fromName, fromEmail, subject, bodyText }) {
  const fallback = { summary: subject, draftResponse: '' }

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
    // Degrade gracefully rather than lose the enquiry — the raw enquiry row is already saved.
    console.error('[submit-enquiry] ai-service call failed:', err)
    return fallback
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders, body: '' }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: corsHeaders, body: 'Method Not Allowed' }

  let data
  try {
    data = JSON.parse(event.body)
  } catch {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid JSON body' }) }
  }

  // Honeypot — a hidden field real visitors never fill in; bots that fill every field trip it.
  if (data.website_hp) {
    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ ok: true }) }
  }

  if (!data.name || !data.email || !data.message) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Missing required fields' }) }
  }

  const subject = `New enquiry — ${data.name}${data.company ? ' / ' + data.company : ''}`
  const bodyText = `Name: ${data.name}\nCompany: ${data.company || '—'}\nEmail: ${data.email}\nPhone: ${data.phone || '—'}\nType: ${data.enquiry_type || '—'}\nProduct/category: ${data.product_category || '—'}\nDestination market: ${data.destination_market || '—'}\nApprox order value: ${data.order_value || '—'}\nTimeline: ${data.timeline || '—'}\nExisting suppliers: ${data.existing_suppliers || '—'}\n\nMessage:\n${data.message}`

  try {
    const supabaseAdmin = getSupabaseAdmin()

    const { error } = await supabaseAdmin.from('enquiries').insert([{
      name: data.name,
      company: data.company || null,
      email: data.email,
      phone: data.phone || null,
      enquiry_type: data.enquiry_type || null,
      product_category: data.product_category || null,
      destination_market: data.destination_market || null,
      order_value: data.order_value || null,
      timeline: data.timeline || null,
      existing_suppliers: data.existing_suppliers || null,
      message: data.message,
    }])

    if (error) throw error

    // Route the enquiry through the same client + email_approvals pattern inbound-email.js
    // uses, so web-form enquiries show up on the Approvals page like inbound emails do.
    // Best-effort: the enquiry row above is already saved, so a failure here shouldn't
    // fail the visitor's submission — it just means this one won't surface on Approvals.
    try {
      const parsed = await classifyAndDraft({ fromName: data.name, fromEmail: data.email, subject, bodyText })

      // Ignore soft-deleted clients — a trashed client must not be resurrected by a new
      // web enquiry; a fresh client row is created instead.
      const { data: existingClient, error: lookupError } = await supabaseAdmin
        .from('clients')
        .select('id, company')
        .eq('email', data.email)
        .is('deleted_at', null)
        .maybeSingle()
      if (lookupError) throw lookupError

      let clientId = existingClient?.id ?? null

      if (!existingClient) {
        const { data: newClient, error: insertClientError } = await supabaseAdmin
          .from('clients')
          .insert({
            company: data.company || '',
            contact: data.name,
            email: data.email,
            phone: data.phone || '',
            country: '',
            status: 'Pipeline',
            source: 'web_enquiry',
            notes: '',
            open_orders: 0,
          })
          .select()
          .single()
        if (insertClientError) throw insertClientError
        clientId = newClient.id
      }

      const { error: approvalError } = await supabaseAdmin
        .from('email_approvals')
        .insert({
          from_email: data.email,
          from_name: data.name,
          subject,
          body_raw: bodyText,
          intent: 'NEW_ENQUIRY',
          client_id: clientId,
          summary: parsed.summary,
          draft_response: parsed.draftResponse,
          status: 'pending',
        })
      if (approvalError) throw approvalError
    } catch (approvalErr) {
      console.error('[submit-enquiry] approvals routing failed:', approvalErr)
    }

    // The enquiry is already saved at this point — a Resend hiccup shouldn't surface as a
    // failure to the visitor, so log it rather than let it fail the response.
    try {
      await sendResendEmail({
        to: GEORGE_EMAIL,
        subject,
        text: bodyText,
      })

      await sendResendEmail({
        to: data.email,
        subject: 'Enquiry received — Meridian International',
        text: `Dear ${data.name},\n\nThank you for your enquiry. Meridian responds to all enquiries within one business day (China Standard Time, UTC+8). Where an enquiry is suitable for a Meridian engagement, a structured consultation will be proposed as the next step.\n\nKind regards,\nMeridian International`,
      })
    } catch (emailErr) {
      console.error('[submit-enquiry] Resend send failed:', emailErr)
    }

    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ ok: true }) }
  } catch (err) {
    console.error('[submit-enquiry] processing failed:', err)
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Failed to save enquiry' }) }
  }
}
