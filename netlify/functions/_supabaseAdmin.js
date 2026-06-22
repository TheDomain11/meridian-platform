const { createClient } = require('@supabase/supabase-js')

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// A Supabase JWT's middle segment carries a `role` claim — service_role keys decode to
// role: "service_role". If someone pastes the anon key into SUPABASE_SERVICE_ROLE_KEY by
// mistake, requests silently run as anon/authenticated and hit table-level permission
// errors that look like RLS failures but aren't. Catch that mix-up immediately.
function assertIsServiceRoleKey(key) {
  const payload = key.split('.')[1]
  if (!payload) return // not a JWT we can decode — let it fail naturally downstream
  let decoded
  try {
    decoded = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'))
  } catch {
    return
  }
  if (decoded.role && decoded.role !== 'service_role') {
    throw new Error(
      `SUPABASE_SERVICE_ROLE_KEY decodes to role "${decoded.role}", not "service_role". ` +
        'Copy the service_role secret from Supabase Settings > API — not the anon/public key.'
    )
  }
}

// Privileged client for server-side functions — bypasses RLS via the service role key.
// Never import this from client-side code; the key must stay server-only.
function getSupabaseAdmin() {
  if (!url || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables')
  }
  assertIsServiceRoleKey(serviceRoleKey)
  return createClient(url, serviceRoleKey, { auth: { persistSession: false } })
}

module.exports = { getSupabaseAdmin }
