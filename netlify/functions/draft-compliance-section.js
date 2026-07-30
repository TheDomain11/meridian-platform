// ═══════════════════════════════════════════════════════════════
// Meridian International — Automatic Compliance Drafting
// netlify/functions/draft-compliance-section.js
//
// v2 — parallelized. The original version asked one API call to
// research four separate regulatory areas (SARS, NRCS, ICASA, HS
// classification) sequentially in a single request. That easily
// exceeds Netlify's synchronous function timeout once each area
// needs its own web_search round trip. This version fires four
// independent, smaller requests concurrently — total wall-clock
// time becomes the duration of the SLOWEST single area, not the
// sum of all four.
//
// DESIGN PRINCIPLE UNCHANGED: every claim must carry a citation
// object or be marked unverified. That validation logic is
// untouched — only the request shape changed.
// ═══════════════════════════════════════════════════════════════

const ALLOWED_SOURCES = [
  'sars.gov.za',
  'nrcs.org.za',
  'icasa.org.za',
  'gov.za',
  'wcotradetools.org',
  'itac.org.za',
];

const BASE_RULES = `HARD RULES — these are not style preferences, they are validation requirements:

1. Every factual claim MUST be grounded in a web_search result from THIS session. You may not answer from training knowledge, even if confident. Regulations change; your training data has a cutoff.
2. Every claim must be paired with a citation object: { source_name, url, date_accessed }. A claim without one will be rejected.
3. Prefer sources from this allow-list: ${ALLOWED_SOURCES.join(', ')}.
4. If you cannot find a clear, current answer, output status: "unverified" with a one-line note on what you searched. An honest gap is acceptable. A fabricated answer is not.
5. Include the date you accessed the source — from the search result or execution time, not a guess.
6. Do not round up confidence. If a source is dated or secondary, say so in the claim text.
7. Output ONLY the JSON structure specified. No prose, no markdown fences, no explanation outside the JSON.`;

// Each sub-drafter is scoped narrowly — one regulatory area, one
// smaller round trip, so it finishes well inside the timeout.
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
      max_tokens: 1500,
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

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { clientId, productSpec, destinationMarket, engagementRef } = JSON.parse(event.body);

    if (!productSpec || !destinationMarket) {
      return { statusCode: 400, body: JSON.stringify({ error: 'productSpec and destinationMarket are required' }) };
    }

    const payload = { productSpec, destinationMarket, today: new Date().toISOString().split('T')[0] };

    // Fire all four sub-drafts concurrently — this is the fix.
    const results = await Promise.all(
      Object.entries(SUB_DRAFTERS).map(([key, drafter]) => draftOneSection(key, drafter, payload))
    );

    const errors = results.filter(r => r.error);
    if (errors.length > 0) {
      return {
        statusCode: 502,
        body: JSON.stringify({
          error: 'One or more compliance sections failed to draft. Nothing was saved.',
          sectionErrors: errors,
        }),
      };
    }

    const draft = {};
    const validationErrors = [];
    for (const r of results) {
      draft[r.key] = r.section;
      validationErrors.push(...validateSection(r.key, r.section));
    }

    if (validationErrors.length > 0) {
      return {
        statusCode: 422,
        body: JSON.stringify({
          error: 'Draft failed citation validation and was NOT saved. Fix and retry.',
          validationErrors,
          draft,
        }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        clientId,
        engagementRef,
        draftedAt: new Date().toISOString(),
        compliance: draft,
      }),
    };

  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
