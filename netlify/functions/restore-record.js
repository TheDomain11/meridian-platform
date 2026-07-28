const { getSupabaseAdmin } = require('./_supabaseAdmin.js')

// Restore a trashed record (clear deleted_at / deleted_by) via the service role.
//
// The 5 core tables restore directly from the browser (authenticated UPDATE), so the
// frontend only routes ENQUIRIES through here — enquiries originate from the public form
// and we don't assume an authenticated UPDATE policy exists on that table. The allowlist
// still covers every in-scope table so this function is safe to reuse.
const ALLOWED_TABLES = ['clients', 'orders', 'suppliers', 'invoices', 'team', 'enquiries']

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

  const { table, id } = payload
  if (!table || !id) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields: table, id' }) }
  }
  if (!ALLOWED_TABLES.includes(table)) {
    return { statusCode: 400, body: JSON.stringify({ error: `Table not permitted for restore: "${table}"` }) }
  }

  try {
    const supabaseAdmin = getSupabaseAdmin()

    const { data, error } = await supabaseAdmin
      .from(table)
      .update({ deleted_at: null, deleted_by: null })
      .eq('id', id)
      .not('deleted_at', 'is', null)
      .select()
      .single()
    if (error) throw error

    return { statusCode: 200, body: JSON.stringify({ ok: true, record: data }) }
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message, code: err.code, details: err.details, hint: err.hint }) }
  }
}
