import { Check } from 'lucide-react'
import AdvisoryStageBadge from './AdvisoryStageBadge.jsx'

// The single, merged linear sequence for a Full Mandate engagement — advisory-only stages
// (Consultation, Engagement Letter, Contract, Compliance Review) interleaved with the
// goods-movement stages that used to live on their own separate StatusTracker block
// (Supplier Sourcing & Verification, Sampling, Production, Inspection / QC, Shipped,
// Delivered). One timeline, not two trackers that could silently disagree with each other.
export const STEPS = [
  'Consultation', 'Engagement Letter', 'Supplier Sourcing & Verification',
  'RFQ & Negotiation', 'Sampling', 'Contract', 'Compliance Review',
  'Production', 'Inspection / QC', 'Shipped', 'Delivered',
]

// Mirrors StatusTracker's/the old AdvisoryStageTracker's index-based done/active/pending
// logic and visual style. onStageClick (optional) makes the dots interactive: only the
// current stage and its immediate neighbors (one back, one forward) are clickable — one
// step at a time in either direction, so a mistake can be corrected without opening the
// Edit panel, but you still can't jump straight to an arbitrary stage through this UI.
function FullMandateTimeline({ stage, onStageClick }) {
  const currentIdx = STEPS.indexOf(stage)

  return (
    <div className="flex items-start w-full py-2">
      {STEPS.map((step, i) => {
        const done = i < currentIdx
        const active = i === currentIdx
        const clickable = !!onStageClick && Math.abs(i - currentIdx) <= 1

        return (
          <div key={step} className="flex-1 flex flex-col items-center relative">
            {/* Left connector */}
            {i > 0 && (
              <div
                className={`absolute top-[5px] right-1/2 left-0 h-px ${
                  i <= currentIdx ? 'bg-navy' : 'bg-slate/15'
                }`}
              />
            )}
            {/* Right connector */}
            {i < STEPS.length - 1 && (
              <div
                className={`absolute top-[5px] left-1/2 right-0 h-px ${
                  done ? 'bg-navy' : 'bg-slate/15'
                }`}
              />
            )}
            {/* Dot */}
            <button
              type="button"
              onClick={() => clickable && onStageClick(step)}
              disabled={!clickable}
              aria-label={`Engagement stage: ${step}`}
              className={`relative z-10 w-2.5 h-2.5 rounded-full border-2 mb-2 p-0 ${
                done || active
                  ? 'bg-navy border-navy'
                  : 'bg-white border-slate/25'
              } ${clickable ? 'cursor-pointer hover:scale-125 transition-transform duration-150' : 'cursor-default'}`}
            />
            {/* Label */}
            <span
              className={`text-xs font-body text-center leading-tight ${
                active
                  ? 'text-navy font-medium'
                  : done
                  ? 'text-slate/50'
                  : 'text-slate/30'
              }`}
            >
              {step}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// A Standalone engagement is one purchased deliverable, not an 11-step journey — showing
// Sourcing/Sampling/Production/Shipped stages that will never apply to it is exactly the
// confusion this merge is fixing. Just the current stage and a way to close it out.
function StandaloneStatusCard({ stage, onMarkComplete }) {
  const isComplete = stage === 'Delivered'

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3">
        <span className="text-xs font-body text-slate/50 uppercase tracking-wider">Current stage</span>
        <AdvisoryStageBadge stage={stage} />
      </div>
      {isComplete ? (
        <span className="flex items-center gap-1.5 text-xs font-body text-slate/40">
          <Check size={13} strokeWidth={1.75} />
          Complete
        </span>
      ) : (
        <button
          type="button"
          onClick={onMarkComplete}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-navy/15 text-xs font-body font-medium text-slate hover:text-navy hover:border-navy/30 transition-colors duration-150"
        >
          <Check size={13} strokeWidth={1.75} />
          Mark Complete
        </button>
      )}
    </div>
  )
}

// Replaces the old separate goods StatusTracker + advisory AdvisoryStageTracker blocks on
// OrderDetail with one engagement-type-aware view: the full linear timeline for a Full
// Mandate order, or a single status card for a Standalone one.
export default function EngagementTimeline({ engagementType, stage, onStageClick }) {
  if (engagementType === 'Standalone') {
    return (
      <StandaloneStatusCard
        stage={stage}
        onMarkComplete={() => onStageClick?.('Delivered')}
      />
    )
  }

  return <FullMandateTimeline stage={stage} onStageClick={onStageClick} />
}
