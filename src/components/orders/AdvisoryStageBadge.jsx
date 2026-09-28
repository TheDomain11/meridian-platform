import { ALL_STAGES, stepLabel } from '../../lib/engagements.js'

// Small-badge counterpart to EngagementTimeline, for list/detail rows that don't have room
// for the full tracker (e.g. a client's Linked Orders list, or the Standalone status card).
export default function AdvisoryStageBadge({ stage, engagementType }) {
  const isFinal = stage === 'Delivered'
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-body font-medium border ${
        isFinal ? 'text-slate/50 border-slate/25' : 'text-gold border-gold/45'
      }`}
    >
      {ALL_STAGES.includes(stage) ? stepLabel(engagementType, stage) : '—'}
    </span>
  )
}
