const { getSupabaseAdmin } = require('./_supabaseAdmin.js')

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

  const { id } = payload
  if (!id) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing required field: id' }) }
  }

  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { error } = await supabaseAdmin.from('email_approvals').delete().eq('id', id)
    if (error) throw error
    return { statusCode: 200, body: JSON.stringify({ ok: true }) }
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message, code: err.code, details: err.details, hint: err.hint }) }
  }
}
