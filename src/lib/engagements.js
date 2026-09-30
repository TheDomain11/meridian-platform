// Single source of truth for Meridian's engagement types, their stage sequences and
// their fees. Everything that needs to know "what kind of engagement is this and where
// is it" (EngagementTimeline, AdvisoryStageBadge, OrderDetail, NewOrderPanel,
// advisoryInvoiceTriggers) reads from here, so the lists can never drift apart again.
//
// The catalogue (30 Sept 2026, owner approved). Every service is a fixed-fee, desk-work
// engagement with one written deliverable, paid 50% on signature of the engagement letter
// and 50% on delivery. Fees mirror the Service Catalogue 2026-09-30 in the Business project.
// Any change to engagement types or stage names also needs a Supabase migration (see
// supabase/catalogue_2026_09_30.sql), because orders.engagement_type and
// orders.advisory_stage carry CHECK constraints.

// Offered when creating or editing an order, in this order.
export const CURRENT_TIERS = {
  'Pre-Order Check': { fee: 450, blurb: 'Supplier and product checked and cross-checked before a first deposit' },
  'Supplier Check': { fee: 199, blurb: 'A named supplier verified, with a written go or no-go' },
  'Import Compliance Assessment': { fee: 350, blurb: 'What the product must meet to enter the destination market' },
  'Transaction File': { fee: 1450, blurb: 'Pre-Order Check, contract assessment and document reconciliation, for orders of USD 30,000 FOB and above' },
  'Held Goods and Non-Conformance Assessment': { fee: 750, blurb: 'Goods held or not as ordered: a written position and next steps' },
  'Supply Contract Risk Assessment': { fee: 400, blurb: 'Risk assessment of a supply contract or purchase order' },
  'Enhanced Supplier Due Diligence': { fee: 450, blurb: 'Supplier Check plus sanctions, financial standing and a factory audit (audit fee at cost)' },
  'Inspection coordination': { fee: 275, blurb: 'Independent pre-shipment inspection (inspection fee at cost)' },
  'Negotiation Advisory': { fee: 450, blurb: 'Preparation and support for one supplier negotiation' },
  'PRC Specialist Coordination': { fee: 350, blurb: 'A PRC-qualified lawyer briefed and managed (lawyer\'s fee at cost)' },
  'Repeat Order File': { fee: 450, blurb: 'Further order with a supplier already checked' },
}

// Retired from the catalogue. They stay valid in the database and keep working for
// existing orders (same stages, same fee prompts), but are no longer offered.
const LEGACY_TIERS = {
  'Counterparty Check': { fee: 450, blurb: 'Retired. Replaced by the Supplier Check and the Pre-Order Check' },
}

export const FILE_TIERS = { ...CURRENT_TIERS, ...LEGACY_TIERS }

export const FULL_MANDATE = 'Full Mandate'

export const ENGAGEMENT_TYPES = Object.keys(CURRENT_TIERS)

// Retired types that existing rows may carry. 'Standalone' predates the File model; the
// Full Mandate was withdrawn on 30 Sept 2026. None is offered for new orders.
export const LEGACY_ENGAGEMENT_TYPES = ['Standalone', FULL_MANDATE, 'Counterparty Check']

export const DEFAULT_ENGAGEMENT_TYPE = 'Pre-Order Check'

export function isFile(engagementType) {
  return Object.prototype.hasOwnProperty.call(FILE_TIERS, engagementType)
}

// The 11-stage sequence for a Full Mandate: advisory stages interleaved with the
// goods-movement stages.
export const MANDATE_STEPS = [
  'Consultation', 'Engagement Letter', 'Supplier Sourcing & Verification',
  'RFQ & Negotiation', 'Sampling', 'Contract', 'Compliance Review',
  'Production', 'Inspection / QC', 'Shipped', 'Delivered',
]

// A File is desk work with one deliverable, so it gets four stages, not eleven.
// 'Delivered' is shared with the mandate sequence on purpose: it is the one final stage
// everything else (order status sync, the "complete" badge) already understands.
export const FILE_STEPS = ['Consultation', 'Engagement Letter', 'Checks in Progress', 'Delivered']

// Display names where the stored value reads awkwardly for a File.
const FILE_STEP_LABELS = { Delivered: 'File Delivered' }

export function stepsFor(engagementType) {
  if (engagementType === FULL_MANDATE) return MANDATE_STEPS
  return FILE_STEPS // Files and legacy Standalone orders
}

export function stepLabel(engagementType, step) {
  if (engagementType !== FULL_MANDATE && FILE_STEP_LABELS[step]) return FILE_STEP_LABELS[step]
  return step
}

// Every stage value the database accepts, for badges that render without knowing the type.
export const ALL_STAGES = [...new Set([...MANDATE_STEPS, ...FILE_STEPS])]
