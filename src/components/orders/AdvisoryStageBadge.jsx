const STEPS = [
  'Consultation', 'Engagement Letter', 'Supplier ID', 'RFQ',
  'Contract', 'Compliance', 'Inspection', 'Delivery',
]

// Small-badge counterpart to AdvisoryStageTracker, for list/detail rows that don't have
// room for the full tracker (e.g. a client's Linked Orders list).
export default function AdvisoryStageBadge({ stage }) {
  const isFinal = stage === 'Delivery'
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
