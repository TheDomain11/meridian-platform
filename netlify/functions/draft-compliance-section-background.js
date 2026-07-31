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
// Status values written to compliance_drafts:
//   pending  — row not yet written / job in flight
//   complete — all four sections present and validated
//   partial  — a subset was drafted (via `sections`) and validated,
//              but not every section is present yet
//   failed   — an API error, parse failure, or citation validation
//              rejection occurred; see the errors column
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
7. Output ONLY the JSON structure specified. No prose, no markdown fences.
8. Keep each claim to 3-4 sentences. State the finding and its basis — do not build an extended case, cite multiple precedents, or restate the reasoning. Concision is a hard requirement, not a style preference: overlong claims get truncated mid-JSON and the entire section is discarded.`;

const SUB_DRAFTERS = {
  sars: {
    system: `You are drafting the SARS section of a Meridian International compliance note.\n\n${BASE_RULES}\n\nOUTPUT SHAPE:\n{ "importer_registration": {"claim":"...","citation":{...}|null,"status":"verified"|"unverified"}, "invoice_requirements": {"claim":"...","citation":{...}|null,"status":"verified"|"unverified"} }`,
    prompt: (p) => `Research SARS importer registration requirements (Section 59A) and commercial invoice requirements (SC-CF-30) for a business importing ${p.productSpec} into ${p.destinationMarket}. Today is ${p.today}.`,
    maxTokens: 4000,
  },
  nrcs: {
    system: `You are drafting the NRCS section of a Meridian International compliance note.\n\n${BASE_RULES}\n\nOUTPUT SHAPE:\n{ "applicability": {"claim":"...","citation":{...}|null,"status":"verified"|"unverified"}, "processing_time": {"claim":"...","citation":{...}|null,"status":"verified"|"unverified"} }`,
    prompt: (p) => `Research whether NRCS compulsory specifications apply to ${p.productSpec} imported into ${p.destinationMarket}, which VC number if so, and current LOA processing time. Today is ${p.today}.`,
    maxTokens: 4000,
  },
  icasa: {
    system: `You are drafting the ICASA section of a Meridian International compliance note.\n\n${BASE_RULES}\n\nOUTPUT SHAPE:\n{ "applicability": {"claim":"...","citation":{...}|null,"status":"verified"|"unverified"} }`,
    prompt: (p) => `Research whether ICASA type approval applies to ${p.productSpec} imported into ${p.destinationMarket}. Today is ${p.today}.`,
    maxTokens: 4000,
  },
  hs_classification: {
    system: `You are drafting the HS classification section of a Meridian International compliance note.\n\n${BASE_RULES}\n\nOUTPUT SHAPE:\n{ "code": {"claim":"...","citation":{...}|null,"status":"verified"|"unverified"}, "duty_rate": {"claim":"...","citation":{...}|null,"status":"verified"|"unverified"} }`,
    prompt: (p) => `Research the correct HS classification code and applicable SACU duty rate for ${p.productSpec} imported into ${p.destinationMarket}. Today is ${p.today}.`,
    maxTokens: 6000, // HS classification reasoning tends to run longer than other sections
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
      model: 'claude-opus-4-8',
      max_tokens: drafter.maxTokens || 4000,
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

/**
 * Single write path for this function. Every status write goes through here.
 *
 * Critically: it never clears the `compliance` column. Error paths that don't
 * pass new compliance data will preserve whatever was already stored, so a
 * failed partial re-run cannot wipe sections that previously validated. This
 * is enforced here rather than remembered at each call site.
 */
async function writeStatus(engagementRef, clientId, fields) {
  let compliance = fields.compliance;

  if (compliance === undefined) {
    const { data: existing, error: readErr } = await supabase
      .from('compliance_drafts')
      .select('compliance')
      .eq('engagement_ref', engagementRef)
      .maybeSingle();
    if (readErr) {
      console.error(`writeStatus: failed reading existing compliance for ${engagementRef}`, readErr);
    }
    compliance = existing?.compliance ?? null;
  }

  const { error: writeErr } = await supabase.from('compliance_drafts').upsert({
    engagement_ref: engagementRef,
    client_id: clientId,
    completed_at: new Date().toISOString(),
    ...fields,
    compliance,
  });

  // A failed write means the research was paid for but the result is lost and
  // the UI will poll 'pending' indefinitely. Surface it in the function log.
  if (writeErr) {
    console.error(`writeStatus: FAILED to persist status for ${engagementRef}`, writeErr);
  }
}

// Background Functions in Netlify: the handler's return value is
// ignored by the original caller (who already got a 202). We write
// the real result to Supabase instead.
exports.handler = async (event) => {
  let clientId, productSpec, destinationMarket, engagementRef, sections;

  // Parse defensively: if this throws, we have no engagement_ref to write a
  // failure row against, so the job would die invisibly and the UI would poll
  // forever. Fail loudly to the function log instead.
  try {
    ({ clientId, productSpec, destinationMarket, engagementRef, sections } = JSON.parse(event.body));
  } catch (parseErr) {
    console.error('draft-compliance-section-background: malformed request body', parseErr);
    return;
  }

  if (!engagementRef) {
    console.error('draft-compliance-section-background: engagementRef is required — cannot record status without it');
    return;
  }

  try {
    const payload = { productSpec, destinationMarket, today: new Date().toISOString().split('T')[0] };

    // Optional `sections` array lets you draft a subset — e.g. ["hs_classification"].
    // Debugging one broken section shouldn't cost four API calls plus four web
    // searches. Omit the parameter entirely for a full production draft.
    const selected = Array.isArray(sections) && sections.length > 0
      ? Object.entries(SUB_DRAFTERS).filter(([key]) => sections.includes(key))
      : Object.entries(SUB_DRAFTERS);

    if (selected.length === 0) {
      await writeStatus(engagementRef, clientId, {
        status: 'failed',
        errors: [{ message: `No valid sections matched: ${JSON.stringify(sections)}. Valid keys: ${Object.keys(SUB_DRAFTERS).join(', ')}` }],
      });
      return;
    }

    const results = await Promise.all(
      selected.map(([key, drafter]) => draftOneSection(key, drafter, payload))
    );

    const sectionErrors = results.filter(r => r.error);
    if (sectionErrors.length > 0) {
      await writeStatus(engagementRef, clientId, {
        status: 'failed',
        errors: sectionErrors,
      });
      return;
    }

    const draft = {};
    const validationErrors = [];
    for (const r of results) {
      draft[r.key] = r.section;
      validationErrors.push(...validateSection(r.key, r.section));
    }

    // When drafting a subset (via `sections`), merge into whatever is already
    // stored for this engagement rather than replacing it — otherwise re-running
    // one section would silently discard the other three.
    const isPartial = Array.isArray(sections) && sections.length > 0;
    let mergedDraft = draft;
    if (isPartial) {
      const { data: existing } = await supabase
        .from('compliance_drafts')
        .select('compliance')
        .eq('engagement_ref', engagementRef)
        .maybeSingle();
      mergedDraft = { ...(existing?.compliance || {}), ...draft };
    }

    if (validationErrors.length > 0) {
      await writeStatus(engagementRef, clientId, {
        status: 'failed',
        errors: validationErrors,
        compliance: mergedDraft, // kept for debugging, not for use
      });
      return;
    }

    // A partial draft is only "complete" if every section is now present.
    const allSectionsPresent = Object.keys(SUB_DRAFTERS)
      .every(key => mergedDraft[key]);

    await writeStatus(engagementRef, clientId, {
      status: allSectionsPresent ? 'complete' : 'partial',
      compliance: mergedDraft,
      errors: null,
    });

  } catch (err) {
    await writeStatus(engagementRef, clientId, {
      status: 'failed',
      errors: [{ message: err.message }],
    });
  }
};
