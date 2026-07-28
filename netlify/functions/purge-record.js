const { getSupabaseAdmin } = require('./_supabaseAdmin.js')

// Permanent, irreversible delete of a single trashed record — service-role only, so the
// browser can never issue a hard DELETE against these tables directly. Mirrors the shape
// of delete-approval.js.
//
// email_approvals is deliberately absent from the allowlist: it is an audit table with its
// own hard-delete path (delete-approval.js) and is out of scope for the trash system.
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
    return { statusCode: 400, body: JSON.stringify({ error: `Table not permitted for purge: "${table}"` }) }
  }

  try {
    const supabaseAdmin = getSupabaseAdmin()

    // Only ever purge a row that is already trashed — guards against a stray call
    // permanently deleting a live record.
    const { error } = await supabaseAdmin
      .from(table)
      .delete()
      .eq('id', id)
      .not('deleted_at', 'is', null)
    if (error) throw error

    return { statusCode: 200, body: JSON.stringify({ ok: true }) }
  } catch (err) {
    // Postgres foreign-key violation (e.g. a client still referenced by orders/invoices).
    // We do NOT cascade — surface a clear message so the UI can explain the blockage.
    if (err.code === '23503') {
      return {
        statusCode: 409,
        body: JSON.stringify({
          error: 'This record is still referenced by other records and cannot be permanently deleted yet.',
          code: err.code,
          details: err.details,
        }),
      }
    }
    return { statusCode: 500, body: JSON.stringify({ error: err.message, code: err.code, details: err.details, hint: err.hint }) }
  }
}
