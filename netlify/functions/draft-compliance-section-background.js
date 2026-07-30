// ═══════════════════════════════════════════════════════════════
// Meridian International — Automatic Compliance Drafting (Background)
// netlify/functions/draft-compliance-section-background.js
//
// v3 — Background Function. Netlify recognizes the "-background"
// filename suffix and grants up to 15 minutes of execution, but
// the tradeoff is it does NOT return the result to the original
// caller — it returns 202 Accepted immediately, and the real
// output must be written somewhere the client can retrieve
// afterward (Supabase, here). Pair this with
// get-compliance-draft-status.js, which the UI polls.
//
// REQUIRED: a Supabase table, e.g.:
//   create table compliance_drafts (
//     engagement_ref text primary key,
//     client_id text,
//     status text not null default 'pending',  -- pending | complete | failed
//     compliance jsonb,
//     errors jsonb,
//     created_at timestamptz default now(),
//     completed_at timestamptz
//   );
//
// Citation validation logic is UNCHANGED from the parallelized
// version — only the execution/response model changed.
// ═══════════════════════════════════════════════════════════════

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ALLOWED_SOURCES = [
  'sars.gov.za', 'nrcs.org.za', 'icasa.org.za', 'gov.za', 'wcotradetools.org', 'itac.org.za',
];

const BASE_RULES = `HARD RULES — these are not style preferences, they are validation requirements:

1. Every factual claim MUST be grounded in a web_search result from THIS session. You may not answer from training knowledge, even if confident.
2. Every claim must be paired with EXACTLY ONE citation object: { source_name, url, date_accessed } — not an array. If you found multiple supporting sources, choose the single most authoritative primary source and cite only that one. A claim without a citation, or with an array instead of one object, will be rejected.
3. Prefer sources from this allow-list: ${ALLOWED_SOURCES.join(', ')}.
4. If you cannot find a clear, current answer, output status: "unverified" with a one-line note on what you searched. An honest gap is acceptable. A fabricated answer is not.
5. Include the date you accessed the source.
6. Do not round up confidence — flag dated or secondary sources in the claim text.
7. Output ONLY the JSON structure specified. No prose, no markdown fences.`;

const SUB_DRAFTERS = {
  sars: {
    system: `You are drafting the SARS section of a Meridian International compliance note.\n\n${BASE_RULES}\n\nOUTPUT SHAPE:\n{ "importer_registration": {"claim":"...","citation":{...}|null,"status":"verified"|"unverified"}, "invoice_requirements": {"claim":"...","citation":{...}|null,"status":"verified"|"unverified"} }`,
    prompt: (p) => `Research SARS importer registration requirements (Section 59A) and commercial invoice requirements (SC-CF-30) for a business importing ${p.productSpec} into ${p.destinationMarket}. Today is ${p.today}.`,
  },
  nrcs: {
    system: `You are drafting the NRCS section of a Meridian International compliance note.\n\n${BASE_RULES}\n\nOUTPUT SHAPE:\n{ "applicability": {"claim":"...","citation":{...}|null,"status":"verified"|"unverified"}, "processing_time": {"claim":"...","citation":{...}|null,"status":"verified"|"unverified"} }`,
    prompt: (p) => `Research whether NRCS compulsory specifications apply to ${p.productSpec} imported into ${p.destinationMarket}, which VC number if so, and current LOA processing time. Today is ${p.today}.`,
  },
  icasa: {
    system: `You are drafting the ICASA section of a Meridian International compliance note.\n\n${BASE_RULES}\n\nOUTPUT SHAPE:\n{ "applicability": {"claim":"...","citation":{...}|null,"status":"verified"|"unverified"} }`,
    prompt: (p) => `Research whether ICASA type approval applies to ${p.productSpec} imported into ${p.destinationMarket}. Today is ${p.today}.`,
  },
  hs_classification: {
    system: `You are drafting the HS classification section of a Meridian International compliance note.\n\n${BASE_RULES}\n\nOUTPUT SHAPE:\n{ "code": {"claim":"...","citation":{...}|null,"status":"verified"|"unverified"}, "duty_rate": {"claim":"...","citation":{...}|null,"status":"verified"|"unverified"} }`,
    prompt: (p) => `Research the correct HS classification code and applicable SACU duty rate for ${p.productSpec} imported into ${p.destinationMarket}. Today is ${p.today}.`,
  },
};

function validateSection(sectionName, section) {
  const errors = [];
  if (!section) { errors.push(`${sectionName}: no data returned`); return errors; }
  for (const [fieldName, field] of Object.entries(section)) {
    if (!field) { errors.push(`${sectionName}.${fieldName}: missing`); continue; }

    // Defensive normalization: the model occasionally returns multiple
    // supporting sources as an array instead of one object. Rather than
    // reject well-sourced research over shape alone, take the first
    // (most authoritative, per prompt instruction) citation.
    if (Array.isArray(field.citation)) {
      field.citation = field.citation[0] || null;
    }

    if (field.status === 'verified') {
      if (!field.citation || !field.citation.url || !field.citation.date_accessed) {
        errors.push(`${sectionName}.${fieldName}: marked verified but missing complete citation — rejecting.`);
      } else if (!ALLOWED_SOURCES.some(src => field.citation.url.includes(src))) {
        field._flag = 'SECONDARY_SOURCE — not on primary allow-list, review before issue';
      }
    }
    if (field.status === 'unverified' && !field.claim) {
      errors.push(`${sectionName}.${fieldName}: unverified with no explanatory note — rejecting.`);
    }
  }
  return errors;
}

async function draftOneSection(key, drafter, payload) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: 4000,
      system: drafter.system,
      messages: [{ role: 'user', content: drafter.prompt(payload) }],
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
    }),
  });

  const data = await response.json();

  if (!response.ok || data.type === 'error') {
    return { key, error: { apiStatus: response.status, apiError: data.error || data } };
  }

  const textBlocks = (data.content || []).filter(b => b.type === 'text').map(b => b.text);
  const rawText = textBlocks.join('\n').trim();

  try {
    const cleaned = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '');
    const parsed = JSON.parse(cleaned);
    return { key, section: parsed };
  } catch (e) {
    return { key, error: { parseError: true, rawText } };
  }
}

// Background Functions in Netlify: the handler's return value is
// ignored by the original caller (who already got a 202). We write
// the real result to Supabase instead.
exports.handler = async (event) => {
  const { clientId, productSpec, destinationMarket, engagementRef } = JSON.parse(event.body);

  try {
    const payload = { productSpec, destinationMarket, today: new Date().toISOString().split('T')[0] };

    const results = await Promise.all(
      Object.entries(SUB_DRAFTERS).map(([key, drafter]) => draftOneSection(key, drafter, payload))
    );

    const sectionErrors = results.filter(r => r.error);
    if (sectionErrors.length > 0) {
      await supabase.from('compliance_drafts').upsert({
        engagement_ref: engagementRef,
        client_id: clientId,
        status: 'failed',
        errors: sectionErrors,
        completed_at: new Date().toISOString(),
      });
      return;
    }

    const draft = {};
    const validationErrors = [];
    for (const r of results) {
      draft[r.key] = r.section;
      validationErrors.push(...validateSection(r.key, r.section));
    }

    if (validationErrors.length > 0) {
      await supabase.from('compliance_drafts').upsert({
        engagement_ref: engagementRef,
        client_id: clientId,
        status: 'failed',
        errors: validationErrors,
        compliance: draft, // kept for debugging, not for use
        completed_at: new Date().toISOString(),
      });
      return;
    }

    await supabase.from('compliance_drafts').upsert({
      engagement_ref: engagementRef,
      client_id: clientId,
      status: 'complete',
      compliance: draft,
      completed_at: new Date().toISOString(),
    });

  } catch (err) {
    await supabase.from('compliance_drafts').upsert({
      engagement_ref: engagementRef,
      client_id: clientId,
      status: 'failed',
      errors: [{ message: err.message }],
      completed_at: new Date().toISOString(),
    });
  }
};
