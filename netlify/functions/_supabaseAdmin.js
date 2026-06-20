const { createClient } = require('@supabase/supabase-js')

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Privileged client for server-side functions — bypasses RLS via the service role key.
// Never import this from client-side code; the key must stay server-only.
function getSupabaseAdmin() {
  if (!url || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables')
  }
  return createClient(url, serviceRoleKey, { auth: { persistSession: false } })
}

module.exports = { getSupabaseAdmin }
