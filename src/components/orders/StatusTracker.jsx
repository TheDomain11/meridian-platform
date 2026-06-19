const STEPS = ['Sourcing', 'Sampling', 'Production', 'QC', 'Shipped', 'Delivered']

export default function StatusTracker({ status }) {
  if (status === 'Cancelled') {
    return (
      <div className="flex items-center gap-3 py-4">
        <span className="text-xs font-body font-medium text-slate/40 uppercase tracking-wider">
          Order Cancelled
        </span>
      </div>
    )
  }

  const currentIdx = STEPS.indexOf(status)

  return (
    <div className="flex items-start w-full py-2">
      {STEPS.map((step, i) => {
        const done = i < currentIdx
        const active = i === currentIdx

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
            <div
              className={`relative z-10 w-2.5 h-2.5 rounded-full border-2 mb-2 ${
                done || active
                  ? 'bg-navy border-navy'
                  : 'bg-white border-slate/25'
              }`}
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
