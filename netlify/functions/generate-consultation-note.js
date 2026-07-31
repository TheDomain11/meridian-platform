// ═══════════════════════════════════════════════════════════════
// Meridian International — Document Assembly
// netlify/functions/generate-consultation-note.js
//
// Takes client intake data (still manually authored — see the
// required fields below) plus an engagementRef, looks up the
// VALIDATED compliance draft from Supabase directly, and renders
// the final Consultation Summary Note .docx using the shared
// document-template.js module.
//
// DESIGN CHANGE from the original version: this no longer trusts a
// caller-supplied `_validated` flag. Nothing produced that flag, and
// a client-supplied boolean is trivially wrong or spoofable anyway.
// Instead this function reads compliance_drafts by engagement_ref
// and checks status === 'complete' itself — the same source of
// truth draft-compliance-section-background.js writes to. Validation
// is derived, not asserted.
// ═══════════════════════════════════════════════════════════════

const { createClient } = require('@supabase/supabase-js');
const T = require('./lib/document-template.js');
const { Document, Packer } = T.docx;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Renders one compliance field + its citation as a pair of
 * paragraphs. This is the single place that turns a validated
 * draft field into document content — every compliance claim in
 * every engagement goes through this function, so citation
 * formatting is guaranteed consistent.
 */
function renderComplianceField(field) {
  if (!field) return [];
  const paras = [T.body(field.claim)];
  if (field.status === 'verified' && field.citation) {
    paras.push(T.citation(
      field.citation.source_name,
      field.citation.url,
      field.citation.date_accessed,
      'verified'
    ));
  } else {
    paras.push(T.citation('', '', field.citation?.date_accessed || new Date().toISOString().split('T')[0], 'unverified'));
  }
  return paras;
}

function buildSourcesTableRows(compliance) {
  const rows = [];
  const collect = (obj, labelPrefix) => {
    for (const [key, field] of Object.entries(obj || {})) {
      if (!field?.claim) continue;
      const label = `${labelPrefix}: ${key.replace(/_/g, ' ')}`;
      if (field.status === 'verified' && field.citation) {
        rows.push([label, field.citation.source_name, field.citation.url, field.citation.date_accessed, 'Verified']);
      } else {
        rows.push([label, '—', '—', field.citation?.date_accessed || '—', 'Unverified']);
      }
    }
  };
  collect(compliance.sars, 'SARS');
  collect(compliance.nrcs, 'NRCS');
  collect(compliance.icasa, 'ICASA');
  collect(compliance.hs_classification, 'HS/Duty');
  return rows;
}

async function generateConsultationNote({
  engagementRef, date, clientName, clientContact, clientCompany,
  clientObjective, feasibility, compliance, scope, fees, nextSteps,
}) {
  const doc = new Document({
    sections: [{
      properties: { page: { margin: { top: T.MARGINS.MT, bottom: T.MARGINS.MB, left: T.MARGINS.ML, right: T.MARGINS.MR } } },
      headers: { default: T.buildHeader() },
      footers: { default: T.buildFooter(`Meridian Consultation Summary Note  ·  ${engagementRef}`) },
      children: [

        T.docTitle("Consultation Summary Note"),
        T.meta("Engagement Reference", engagementRef),
        T.meta("Date", date),
        T.meta("Prepared for", `${clientContact} — ${clientCompany}`),
        T.meta("Prepared by", "George Skordi, Founder — Meridian International"),
        T.rule(T.COLORS.GOLD, 4, 3, 0),

        T.section("01", "Client Objective"),
        T.body(clientObjective),

        T.section("02", "Feasibility Assessment"),
        T.body(feasibility.narrative),
        T.spacer(2),
        T.summaryTable(feasibility.summaryRows),
        T.spacer(2),
        T.body(feasibility.followUp),
        // Feasibility is NOT auto-drafted — flag if source data is missing
        ...(feasibility.verified === false
          ? [T.citation('', '', date, 'unverified')]
          : []),

        T.section("03", "Compliance Requirements"),
        T.body("As a first-time direct importer from China, the client will be required to meet the following regulatory and documentation requirements. Every claim below is sourced directly from the relevant regulator; claims that could not be verified are flagged rather than stated as fact."),

        T.subHead("SARS — South African Revenue Service"),
        ...renderComplianceField(compliance.sars?.importer_registration),
        ...renderComplianceField(compliance.sars?.invoice_requirements),

        T.subHead("NRCS — National Regulator for Compulsory Specifications"),
        ...renderComplianceField(compliance.nrcs?.applicability),
        ...renderComplianceField(compliance.nrcs?.processing_time),

        T.subHead("ICASA — Independent Communications Authority of South Africa"),
        ...renderComplianceField(compliance.icasa?.applicability),

        T.subHead("HS Classification and Import Duty"),
        ...renderComplianceField(compliance.hs_classification?.code),
        ...renderComplianceField(compliance.hs_classification?.duty_rate),

        T.spacer(2),
        T.subHead("Sources Verified"),
        T.sourcesTable(buildSourcesTableRows(compliance)),

        T.section("04", "Recommended Scope of Engagement"),
        T.body(scope.narrative),
        T.spacer(2),
        ...T.serviceList(scope.services),

        T.section("05", "Fee Indication"),
        T.body(fees.narrative),
        T.spacer(2),
        T.feeTable(fees.rows),
        T.spacer(2),
        T.body(fees.followUp),

        T.section("06", "Next Steps"),
        ...T.stepList(nextSteps),

        ...T.signOff("George Skordi", "Founder, Meridian International", "Meridian Capital Holdings Limited", date, "george@meridianinternational.io"),
      ],
    }],
  });

  return Packer.toBuffer(doc);
}

exports.generateConsultationNote = generateConsultationNote;

// ── Netlify function entry point ──
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }
  try {
    const payload = JSON.parse(event.body);

    if (!payload.engagementRef) {
      return { statusCode: 400, body: JSON.stringify({ error: 'engagementRef is required — used to look up the validated compliance draft.' }) };
    }

    // Look up the validated compliance draft ourselves. This is the actual
    // validation gate — we do not trust anything the caller claims about
    // whether the data was checked.
    const { data: draft, error: fetchErr } = await supabase
      .from('compliance_drafts')
      .select('status, compliance')
      .eq('engagement_ref', payload.engagementRef)
      .maybeSingle();

    if (fetchErr) {
      return { statusCode: 500, body: JSON.stringify({ error: `Failed to look up compliance draft: ${fetchErr.message}` }) };
    }
    if (!draft) {
      return { statusCode: 404, body: JSON.stringify({ error: `No compliance draft found for engagementRef "${payload.engagementRef}". Run draft-compliance-section-background.js first.` }) };
    }
    if (draft.status !== 'complete') {
      return {
        statusCode: 422,
        body: JSON.stringify({
          error: `Compliance draft for "${payload.engagementRef}" is not complete (status: "${draft.status}"). All four sections must validate before a document can be generated.`,
          status: draft.status,
        }),
      };
    }

    const buffer = await generateConsultationNote({ ...payload, compliance: draft.compliance });

    // Upload to Supabase Storage / Google Drive here (integration point —
    // wire to whichever is confirmed as the document store), then return
    // the link. Placeholder returns the buffer as base64 for now.
    return {
      statusCode: 200,
      body: JSON.stringify({
        engagementRef: payload.engagementRef,
        generatedAt: new Date().toISOString(),
        fileBase64: buffer.toString('base64'),
      }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
