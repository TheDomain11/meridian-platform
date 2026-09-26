// ═══════════════════════════════════════════════════════════════
// Meridian International — Document Assembly
// netlify/functions/generate-csn.js
//
// Generates the Client Sourcing Note (Doc 01 of 13) — the first
// document in the engagement pipeline, and the one every later
// document (Engagement Letter's spec clause, Supply Agreement's
// spec clause) refers back to.
//
// WHY THIS EXISTS: across all three mock case studies run through
// the platform (MI-2026-001, -002, -003), this document was never
// once successfully generated — the pipeline always started from
// the Engagement Letter instead, with product spec re-typed by hand
// each time. That's exactly how MI-2026-001's spec drifted mid-
// engagement (Ethernet dropped to meet budget) with no written
// re-confirmation. This function closes that gap the way the
// lifecycle map itself recommends: a required-fields form generated
// straight from structured intake/consultation data, not drafted
// freehand.
//
// Unlike generate-consultation-note.js, there is no upstream
// validation gate to check — the CSN is the first document in the
// chain, generated directly from enquiry + consultation data. Its
// own job is simply to refuse to generate at all if any of the
// fields a downstream document will need are missing, rather than
// silently producing an incomplete note.
// ═══════════════════════════════════════════════════════════════

const T = require('./lib/document-template.js');
const { Document, Packer } = T.docx;

const REQUIRED_FIELDS = [
  'engagementRef', 'date', 'clientName', 'clientContact', 'clientCompany',
  'productSpec', 'quantity', 'targetPriceUSD', 'destinationMarket', 'timeline',
];

// USD 15,000 FOB is the platform's own standing threshold between a full
// commission mandate and the standalone fee menu (see Business Advisor /
// ways-of-working notes) — kept here as the single source of truth for
// this determination rather than re-typed per engagement.
const FULL_MANDATE_THRESHOLD_USD = 15000;

function deriveMandateType(estimatedFobValueUSD) {
  if (typeof estimatedFobValueUSD !== 'number' || Number.isNaN(estimatedFobValueUSD)) {
    return 'Not yet determined — estimated FOB value required to classify';
  }
  return estimatedFobValueUSD >= FULL_MANDATE_THRESHOLD_USD
    ? `Full Mandate (commission basis — estimated FOB USD ${estimatedFobValueUSD.toLocaleString()})`
    : `Standalone Fee Menu (estimated FOB USD ${estimatedFobValueUSD.toLocaleString()}, below the USD ${FULL_MANDATE_THRESHOLD_USD.toLocaleString()} full-mandate threshold)`;
}

function generateCSN({
  engagementRef, date, clientName, clientContact, clientCompany,
  productSpec, quantity, targetPriceUSD, destinationMarket, timeline,
  existingSuppliers, estimatedFobValueUSD, notes, nextSteps,
}) {
  const specRows = [
    ['Product specification', productSpec],
    ['Quantity', quantity],
    ['Target price (FOB, USD)', targetPriceUSD],
    ['Destination market', destinationMarket],
    ['Required timeline', timeline],
    ['Existing supplier relationship', existingSuppliers || 'None disclosed'],
    ['Engagement classification', deriveMandateType(estimatedFobValueUSD)],
  ];

  const defaultNextSteps = [
    'Client Sourcing Note issued for client review and sign-off.',
    'On confirmation, the Engagement Letter is drafted from this spec and the current rate card.',
    'No sourcing, supplier outreach, or compliance research begins until the Engagement Letter is signed and the deposit received.',
  ];

  const doc = new Document({
    sections: [{
      properties: { page: { margin: { top: T.MARGINS.MT, bottom: T.MARGINS.MB, left: T.MARGINS.ML, right: T.MARGINS.MR } } },
      headers: { default: T.buildHeader() },
      footers: { default: T.buildFooter(`Meridian Client Sourcing Note  ·  ${engagementRef}`) },
      children: [

        T.docTitle("Client Sourcing Note"),
        T.meta("Engagement Reference", engagementRef),
        T.meta("Date", date),
        T.meta("Prepared for", `${clientContact} — ${clientCompany}`),
        T.meta("Prepared by", "George Skordi, Founder — Meridian International"),
        T.rule(T.COLORS.GOLD, 4, 3, 0),

        T.section("01", "Client"),
        T.body(`${clientName} (${clientCompany}), represented by ${clientContact}.`),

        T.section("02", "Product Specification & Scope"),
        T.body("The following specification is the factual basis for every document that follows in this engagement, including the Engagement Letter's scope clause and the Supply Agreement's spec clause. Any change to the specification after this note is issued requires a written re-confirmation, not an informal update."),
        T.spacer(2),
        T.summaryTable(specRows),

        ...(notes ? [T.spacer(2), T.subHead("Additional Notes"), T.body(notes)] : []),

        T.section("03", "Next Steps"),
        ...T.stepList(nextSteps && nextSteps.length ? nextSteps : defaultNextSteps),

        ...T.signOff("George Skordi", "Founder, Meridian International", "Meridian Capital Holdings Limited", date, "george@meridianinternational.io"),
      ],
    }],
  });

  return Packer.toBuffer(doc);
}

exports.generateCSN = generateCSN;
exports.REQUIRED_FIELDS = REQUIRED_FIELDS;

// ── Netlify function entry point ──
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }
  try {
    const payload = JSON.parse(event.body);

    const missing = REQUIRED_FIELDS.filter((f) => payload[f] === undefined || payload[f] === null || payload[f] === '');
    if (missing.length) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: `Cannot generate a Client Sourcing Note with incomplete intake data. Missing: ${missing.join(', ')}.`,
          missingFields: missing,
        }),
      };
    }

    const buffer = await generateCSN(payload);

    // Upload to Supabase Storage / Google Drive here (same integration
    // point noted as a placeholder in generate-consultation-note.js —
    // wire both to whichever store is confirmed as the document
    // system of record). Placeholder returns the buffer as base64 for now.
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
