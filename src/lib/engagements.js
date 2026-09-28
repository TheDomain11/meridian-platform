// Single source of truth for Meridian's engagement types, their stage sequences and
// their fees. Everything that needs to know "what kind of engagement is this and where
// is it" (EngagementTimeline, AdvisoryStageBadge, OrderDetail, NewOrderPanel,
// advisoryInvoiceTriggers) reads from here, so the lists can never drift apart again.
//
// The File model (Sept 2026): Meridian sells one product, the Meridian File, in three
// fixed-fee tiers, plus the Full Mandate for large end-to-end orders. Fees mirror
// Pricing_Architecture_2026-09.md in the Meridian_Master Drive folder.
// Any change to engagement types or stage names also needs supabase/file_model.sql
// (or a successor), because orders.engagement_type and orders.advisory_stage carry
// CHECK constraints.

export const FILE_TIERS = {
  'Counterparty Check': { fee: 450, blurb: 'Supplier verified before a first deposit' },
  'Transaction File': { fee: 1450, blurb: 'All four checks for a first or regulated order' },
  'Repeat Order File': { fee: 450, blurb: 'Further order with a supplier already checked' },
}

export const FULL_MANDATE = 'Full Mandate'

// Offered when creating or editing an order, in this order.
export const ENGAGEMENT_TYPES = [...Object.keys(FILE_TIERS), FULL_MANDATE]

// 'Standalone' orders predate the File model. They stay valid in the database and keep
// working (short timeline, no fee prompts), but are no longer offered for new orders.
export const LEGACY_ENGAGEMENT_TYPES = ['Standalone']

export const DEFAULT_ENGAGEMENT_TYPE = 'Transaction File'

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
