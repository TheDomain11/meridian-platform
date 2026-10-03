// Maps an engagement-stage transition to the draft-invoice line item it should prompt,
// keyed by the order's engagement type. Returns null when that stage/type combination
// carries no fee of its own; the caller should not open the invoice panel in that case.
//
// This only produces the pre-fill data for NewInvoicePanel; it never creates or sends an
// invoice itself. The existing Draft -> review -> send-invoice-email.js flow is untouched.
//
// File tiers are fixed fees paid 50% on signature of the engagement letter and 50% on
// delivery (Service Catalogue 2026-09-30). The Full Mandate keeps its
// USD 950 deposit and commission balance. Legacy 'Standalone' orders get no prompts.

import { FILE_TIERS, FULL_MANDATE, isFile } from './engagements.js'

const FULL_MANDATE_TRIGGERS = {
  'Engagement Letter': {
    description: 'Full mandate: deposit on signature of the engagement letter',
    qty: 1,
    unitPrice: 950,
  },
  Delivered: {
    description: 'Full mandate: balance of commission (confirm FOB value and rate)',
    qty: 1,
    // Force manual entry: the commission depends on the confirmed FOB value and rate,
    // which this tracker has no way to know. Never guess a number here.
    unitPrice: '',
  },
}

function fileTriggers(tier) {
  const half = FILE_TIERS[tier].fee / 2
  return {
    'Engagement Letter': {
      description: `${tier}: 50% on signature of the engagement letter`,
      qty: 1,
      unitPrice: half,
    },
    Delivered: {
      description: `${tier}: 50% on delivery of the assessment`,
      qty: 1,
      unitPrice: half,
    },
  }
}

export function getInvoiceTrigger(engagementType, stage) {
  if (engagementType === FULL_MANDATE) return FULL_MANDATE_TRIGGERS[stage] ?? null
  if (isFile(engagementType)) return fileTriggers(engagementType)[stage] ?? null
  return null
}
