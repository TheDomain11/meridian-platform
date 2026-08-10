// Maps an advisory-stage transition to the draft-invoice line item it should prompt, keyed
// by the order's engagement_type. Returns null when that stage/engagement-type combination
// carries no fee of its own — the caller should not open the invoice panel in that case.
//
// This only produces the pre-fill data for NewInvoicePanel; it never creates or sends an
// invoice itself. The existing Draft -> review -> send-invoice-email.js flow is untouched.

const FULL_MANDATE_TRIGGERS = {
  'Engagement Letter': {
    description: 'Deposit - engagement letter signed',
    qty: 1,
    unitPrice: 950,
  },
  Delivery: {
    description: 'Balance - final commission (confirm FOB value and rate)',
    qty: 1,
    // Force manual entry — the commission depends on the confirmed FOB value and rate,
    // which this tracker has no way to know. Never guess a number here.
    unitPrice: '',
  },
}

const STANDALONE_TRIGGERS = {
  Consultation: {
    description: 'Procurement consultation',
    qty: 1,
    unitPrice: 300,
  },
  'Supplier ID': {
    description: 'Supplier identification & verification',
    qty: 1,
    unitPrice: 650,
  },
  RFQ: {
    description: 'RFQ management and negotiation',
    qty: 1,
    unitPrice: 900,
  },
  Contract: {
    // Left editable — review vs drafting differ, so this is a starting point, not final.
    description: 'Supply contract review/drafting',
    qty: 1,
    unitPrice: 450,
  },
  Compliance: {
    description: 'Compliance review, single shipment',
    qty: 1,
    unitPrice: 850,
  },
  Inspection: {
    description: 'Quality inspection coordination',
    qty: 1,
    unitPrice: 275,
  },
  // 'Engagement Letter' and 'Delivery' carry no fee of their own under Standalone — the
  // per-stage fees above are the whole engagement, so those two stages have no entry here.
}

export function getInvoiceTrigger(engagementType, stage) {
  const table = engagementType === 'Standalone' ? STANDALONE_TRIGGERS : FULL_MANDATE_TRIGGERS
  return table[stage] ?? null
}
