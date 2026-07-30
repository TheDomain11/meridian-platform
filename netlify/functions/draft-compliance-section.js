// ═══════════════════════════════════════════════════════════════
// Meridian International — Automatic Compliance Drafting
// netlify/functions/draft-compliance-section.js
//
// Called from the platform UI when a client record has enough
// intake data (product spec + destination market) to draft
// Section 03 of the Consultation Summary Note.
//
// DESIGN PRINCIPLE: this function does not ask the model to be
// accurate. It structurally prevents unverified claims from
// reaching the document by requiring every claim to carry a
// citation object, and by treating "no citation" as a hard
// validation failure rather than a style problem.
// ═══════════════════════════════════════════════════════════════

const ALLOWED_SOURCES = [
  'sars.gov.za',
  'nrcs.org.za',
  'icasa.org.za',
  'gov.za',
  'wcotradetools.org',   // HS classification reference
  'itac.org.za',         // International Trade Administration Commission
];

const SYSTEM_PROMPT = `You are drafting the compliance section of a Meridian International Consultation Summary Note. This document will be sent to a real client and may be reviewed by their customs broker.

HARD RULES — these are not style preferences, they are validation requirements:

1. Every factual claim about a regulatory requirement (SARS, NRCS, ICASA, HS classification, duty rates) MUST be grounded in a web_search result from THIS session. You may not answer from training knowledge, even if you are confident the answer is correct. Regulations change; your training data has a cutoff; the client is paying for current information.

2. Every claim must be paired with a citation object: { source_name, url, date_accessed }. A claim without a citation object will be rejected by the validator and will not reach the document.

3. Prefer sources from this allow-list: ${ALLOWED_SOURCES.join(', ')}. If you must use a secondary source (a law firm blog, a compliance consultancy summary), mark it explicitly as secondary and note that the underlying primary source should still be confirmed.

4. If you search and cannot find a clear, current answer to a required field, do NOT estimate, infer, or state a plausible-sounding figure. Output status: "unverified" for that field with a one-line note on what you searched and why it didn't resolve. An honest gap is acceptable. A fabricated or outdated-but-confident answer is not.

5. Every claim must include the date you accessed the source (today's date, from the search result metadata or the search execution time) — not a guess, not the regulation's publication date.

6. Do not round up confidence. If a source is dated, or is a secondary summary rather than the regulator's own text, or the regulation may have since changed, say so in the claim text itself, not just in the status field.

7. Output ONLY the JSON structure specified below. No prose, no markdown formatting, no explanation outside the JSON.

REQUIRED OUTPUT SHAPE:
{
  "sars": {
    "importer_registration": { "claim": "...", "citation": {...} | null, "status": "verified" | "unverified" },
    "invoice_requirements":   { "claim": "...", "citation": {...} | null, "status": "verified" | "unverified" }
  },
  "nrcs": {
    "applicability":      { "claim": "...", "citation": {...} | null, "status": "verified" | "unverified" },
    "processing_time":    { "claim": "...", "citation": {...} | null, "status": "verified" | "unverified" }
  },
  "icasa": {
    "applicability": { "claim": "...", "citation": {...} | null, "status": "verified" | "unverified" }
  },
  "hs_classification": {
    "code":      { "claim": "...", "citation": {...} | null, "status": "verified" | "unverified" },
    "duty_rate": { "claim": "...", "citation": {...} | null, "status": "verified" | "unverified" }
  }
}`;

/**
 * Server-side validator — runs BEFORE the draft is allowed to reach
 * the document generator. This is the actual enforcement mechanism,
 * not the system prompt alone (models can drift; a mechanical check
 * cannot).
 */
function validateDraft(draft) {
  const errors = [];
  const allFields = [
    ['sars.importer_registration', draft?.sars?.importer_registration],
    ['sars.invoice_requirements', draft?.sars?.invoice_requirements],
    ['nrcs.applicability', draft?.nrcs?.applicability],
    ['nrcs.processing_time', draft?.nrcs?.processing_time],
    ['icasa.applicability', draft?.icasa?.applicability],
    ['hs_classification.code', draft?.hs_classification?.code],
    ['hs_classification.duty_rate', draft?.hs_classification?.duty_rate],
  ];

  for (const [fieldName, field] of allFields) {
    if (!field) { errors.push(`Missing field: ${fieldName}`); continue; }
    if (field.status === 'verified') {
      if (!field.citation || !field.citation.url || !field.citation.date_accessed) {
        errors.push(`${fieldName} marked verified but missing a complete citation — rejecting.`);
      }
      // Flag (not reject) citations from outside the allow-list, so a human reviews them
      if (field.citation?.url) {
        const isAllowed = ALLOWED_SOURCES.some(src => field.citation.url.includes(src));
        if (!isAllowed) {
          field._flag = 'SECONDARY_SOURCE — not on primary allow-list, review before issue';
        }
      }
    }
    if (field.status === 'unverified' && !field.claim) {
      errors.push(`${fieldName} is unverified but has no explanatory note — rejecting.`);
    }
  }
  return errors;
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

    const userPrompt = `Draft the compliance section for this engagement.

Product specification: ${productSpec}
Destination market: ${destinationMarket}
Engagement reference: ${engagementRef || 'not yet assigned'}

Search for current, primary-source answers to each required field. Today's date is ${new Date().toISOString().split('T')[0]}.`;

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
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      }),
    });

    const data = await response.json();

    // Surface real API errors immediately instead of falling through to a
    // confusing "invalid JSON" message with an empty body.
    if (!response.ok || data.type === 'error') {
      return {
        statusCode: 502,
        body: JSON.stringify({
          error: 'Anthropic API returned an error before drafting could occur.',
          apiStatus: response.status,
          apiError: data.error || data,
        }),
      };
    }

    // Extract the final text block (after any web_search tool_use/tool_result blocks)
    const textBlocks = (data.content || []).filter(b => b.type === 'text').map(b => b.text);
    const rawText = textBlocks.join('\n').trim();

    let draft;
    try {
      // Strip markdown code fences if the model added them despite instructions
      const cleaned = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '');
      draft = JSON.parse(cleaned);
    } catch (parseErr) {
      return {
        statusCode: 502,
        body: JSON.stringify({
          error: 'Model did not return valid JSON — drafting failed, nothing was written to the document.',
          rawText,
        }),
      };
    }

    const validationErrors = validateDraft(draft);
    if (validationErrors.length > 0) {
      // Hard fail — do NOT pass this draft to the document generator.
      // Better to surface a visible failure than a silently under-cited document.
      return {
        statusCode: 422,
        body: JSON.stringify({
          error: 'Draft failed citation validation and was NOT saved. Fix and retry.',
          validationErrors,
          draft, // returned for debugging, not for use
        }),
      };
    }

    // Passed validation — safe to persist and hand to the document generator
    return {
      statusCode: 200,
      body: JSON.stringify({
        clientId,
        engagementRef,
        draftedAt: new Date().toISOString(),
        compliance: draft,
        flags: allFieldFlags(draft),
      }),
    };

  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

function allFieldFlags(draft) {
  const flags = [];
  const walk = (obj, path) => {
    for (const [k, v] of Object.entries(obj || {})) {
      const p = path ? `${path}.${k}` : k;
      if (v && typeof v === 'object' && v._flag) flags.push({ field: p, flag: v._flag });
      else if (v && typeof v === 'object' && !v.claim) walk(v, p);
    }
  };
  walk(draft, '');
  return flags;
}
