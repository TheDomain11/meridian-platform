// Kept as its own copy rather than importing STEPS from EngagementTimeline.jsx — that file
// itself renders this badge for the Standalone status card, so importing back from it would
// be circular.
const STEPS = [
  'Consultation', 'Engagement Letter', 'Supplier Sourcing & Verification',
  'RFQ & Negotiation', 'Sampling', 'Contract', 'Compliance Review',
  'Production', 'Inspection / QC', 'Shipped', 'Delivered',
]

// Small-badge counterpart to EngagementTimeline, for list/detail rows that don't have room
// for the full tracker (e.g. a client's Linked Orders list, or the Standalone status card).
export default function AdvisoryStageBadge({ stage }) {
  const isFinal = stage === 'Delivered'
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-body font-medium border ${
        isFinal ? 'text-slate/50 border-slate/25' : 'text-gold border-gold/45'
      }`}
    >
      {STEPS.includes(stage) ? stage : '—'}
    </span>
  )
}
