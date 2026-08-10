import { DollarSign } from 'lucide-react'

// Estimated per-use API cost ranges, keyed by model/tooling tier. Only ever put this badge
// on a button that calls the Anthropic API directly — never on anything that runs on a
// Claude Code / subscription basis, since the badge implies real per-click billing.
const RANGES = {
  'sonnet-light': '$0.01-0.02',
  'opus-search': '$0.30-0.50+',
}

const TOOLTIP = 'Estimated AI API cost per use. Approximate, based on typical token volume.'

// Small inline cost indicator for buttons/actions that trigger an AI API call, so the cost
// is visible before clicking rather than discovered later. Deliberately visually secondary
// (muted, small) — informational, not a warning.
export default function CostBadge({ tier }) {
  const range = RANGES[tier]
  if (!range) return null

  return (
    <span
      title={TOOLTIP}
      className="inline-flex items-center gap-0.5 text-slate/45 text-xs font-body leading-none whitespace-nowrap"
    >
      <DollarSign size={11} strokeWidth={1.75} />
      {range}
    </span>
  )
}
