const { getSupabaseAdmin } = require('./_supabaseAdmin.js')

const RESEND_API_KEY = process.env.RESEND_API_KEY || 'PLACEHOLDER_RESEND_API_KEY'
const GEORGE_EMAIL = 'george@meridianinternational.io'
const FROM_ADDRESS = 'Meridian International <enquiries@meridianinternational.io>'

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

    // The enquiry is already saved at this point — a Resend hiccup shouldn't surface as a
    // failure to the visitor, so log it rather than let it fail the response.
    try {
      await sendResendEmail({
        to: GEORGE_EMAIL,
        subject: `New enquiry — ${data.name}${data.company ? ' / ' + data.company : ''}`,
        text: `Name: ${data.name}\nCompany: ${data.company || '—'}\nEmail: ${data.email}\nPhone: ${data.phone || '—'}\nType: ${data.enquiry_type || '—'}\nProduct/category: ${data.product_category || '—'}\nDestination market: ${data.destination_market || '—'}\nApprox order value: ${data.order_value || '—'}\nTimeline: ${data.timeline || '—'}\nExisting suppliers: ${data.existing_suppliers || '—'}\n\nMessage:\n${data.message}`,
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
