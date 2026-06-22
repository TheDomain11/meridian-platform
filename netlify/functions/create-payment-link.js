const { getSupabaseAdmin } = require('./_supabaseAdmin.js')

// Drop the real key into the Netlify site's environment variables as STRIPE_SECRET_KEY.
// See README section "Resend / Stripe setup" for exact steps.
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'PLACEHOLDER_STRIPE_SECRET_KEY'

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

  const { invoiceId, displayNo, amount, currency = 'usd' } = payload

  if (!invoiceId || !amount || amount <= 0) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields: invoiceId, amount' }) }
  }

  const params = new URLSearchParams()
  params.append('line_items[0][price_data][currency]', currency.toLowerCase())
  params.append('line_items[0][price_data][product_data][name]', `Invoice ${displayNo} — Meridian International`)
  params.append('line_items[0][price_data][unit_amount]', String(Math.round(amount * 100)))
  params.append('line_items[0][quantity]', '1')

  try {
    const res = await fetch('https://api.stripe.com/v1/payment_links', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    })

    const result = await res.json()
    if (!res.ok) {
      return { statusCode: res.status, body: JSON.stringify({ error: result }) }
    }

    const supabaseAdmin = getSupabaseAdmin()
    const { error: updateError } = await supabaseAdmin
      .from('invoices')
      .update({ payment_link_url: result.url })
      .eq('id', invoiceId)
    if (updateError) throw updateError

    return { statusCode: 200, body: JSON.stringify({ url: result.url, id: result.id }) }
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message, code: err.code, details: err.details, hint: err.hint }),
    }
  }
}
