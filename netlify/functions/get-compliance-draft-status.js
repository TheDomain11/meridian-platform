// ═══════════════════════════════════════════════════════════════
// Meridian International — Poll for compliance draft status
// netlify/functions/get-compliance-draft-status.js
//
// Lightweight, fast, synchronous — safe within normal timeouts.
// The UI calls this every few seconds after kicking off
// draft-compliance-section-background.js, until status is no
// longer "pending".
// ═══════════════════════════════════════════════════════════════

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event) => {
  const engagementRef = event.queryStringParameters?.engagementRef;
  if (!engagementRef) {
    return { statusCode: 400, body: JSON.stringify({ error: 'engagementRef query parameter is required' }) };
  }

  const { data, error } = await supabase
    .from('compliance_drafts')
    .select('*')
    .eq('engagement_ref', engagementRef)
    .single();

  if (error && error.code === 'PGRST116') {
    // No row yet — background function hasn't started or hasn't written anything
    return { statusCode: 200, body: JSON.stringify({ status: 'pending' }) };
  }
  if (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }

  return { statusCode: 200, body: JSON.stringify(data) };
};
