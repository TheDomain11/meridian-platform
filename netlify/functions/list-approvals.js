const { getSupabaseAdmin } = require('./_supabaseAdmin.js')

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { data, error } = await supabaseAdmin
      .from('email_approvals')
      .select('id, created_at, from_email, from_name, subject, summary, draft_response, status, intent, client_id, clients(company)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    if (error) throw error

    const approvals = data.map(row => ({
      id: row.id,
      createdAt: row.created_at,
      fromEmail: row.from_email,
      fromName: row.from_name,
      subject: row.subject,
      summary: row.summary,
      draftResponse: row.draft_response,
      status: row.status,
      intent: row.intent,
      clientCompany: row.clients?.company ?? null,
    }))

    return { statusCode: 200, body: JSON.stringify({ approvals }) }
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message, code: err.code, details: err.details, hint: err.hint }) }
  }
}
