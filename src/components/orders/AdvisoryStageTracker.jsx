export const STEPS = [
  'Consultation', 'Engagement Letter', 'Supplier ID', 'RFQ',
  'Contract', 'Compliance', 'Inspection', 'Delivery',
]

// Mirrors StatusTracker's index-based done/active/pending logic and visual style, for the
// advisory engagement pipeline rather than the goods-movement status. There's no
// "Cancelled" case here — an advisory engagement doesn't have that terminal state.
//
// onStageClick (optional) makes the dots interactive: only the current stage and its
// immediate neighbors (one back, one forward) are clickable — one step at a time in either
// direction, so a mistake can be corrected without opening the Edit panel, but you still
// can't jump straight to an arbitrary stage through this UI.
export default function AdvisoryStageTracker({ stage, onStageClick }) {
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
              aria-label={`Advisory stage: ${step}`}
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
