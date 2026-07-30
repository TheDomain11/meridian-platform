// ═══════════════════════════════════════════════════════════════
// Meridian International — Document Assembly
// netlify/functions/generate-consultation-note.js
//
// Takes client intake data + a VALIDATED compliance draft (from
// draft-compliance-section.js, already passed citation validation)
// and renders the final Consultation Summary Note .docx using the
// shared document-template.js module — the SAME module every
// engagement document uses, so formatting never drifts between
// clients or document types.
// ═══════════════════════════════════════════════════════════════

const T = require('./lib/document-template.js');
const { Document, Packer } = T.docx;

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

module.exports = { generateConsultationNote };

// ── Netlify function entry point ──
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }
  try {
    const payload = JSON.parse(event.body);

    // Refuse to assemble if compliance data wasn't validated upstream.
    // This function trusts draft-compliance-section.js's validation —
    // it does not re-derive facts, it only renders what was already checked.
    if (!payload.compliance || !payload._validated) {
      return {
        statusCode: 422,
        body: JSON.stringify({ error: 'Compliance data missing validation flag. Run draft-compliance-section.js first.' }),
      };
    }

    const buffer = await generateConsultationNote(payload);

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
