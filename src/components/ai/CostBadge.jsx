import { DollarSign } from 'lucide-react'

// Estimated per-use API cost, keyed by model/tooling tier. Only ever put this badge on a
// button that calls the Anthropic API directly — never on anything that runs on a
// Claude Code / subscription basis, since the badge implies real per-click billing.
//
// 'sonnet-search' is a genuine range, not just a wider label: web_search is available to
// Claude on these calls, and it decides per call whether the question needs one, so actual
// cost varies with whether research was actually triggered.
const TIERS = {
  'sonnet-light': {
    range: '$0.01-0.02',
    tooltip: 'Estimated AI API cost per use. Approximate, based on typical token volume.',
  },
  'sonnet-search': {
    range: '$0.01-0.05+ (higher if research is needed)',
    tooltip: 'Estimated AI API cost per use. Approximate — web search is used only when the question actually requires it, so cost varies with whether research was triggered.',
  },
  'opus-search': {
    range: '$0.30-0.50+',
    tooltip: 'Estimated AI API cost per use. Approximate, based on typical token volume.',
  },
}

// Small inline cost indicator for buttons/actions that trigger an AI API call, so the cost
// is visible before clicking rather than discovered later. Deliberately visually secondary
// (muted, small) — informational, not a warning.
export default function CostBadge({ tier }) {
  const info = TIERS[tier]
  if (!info) return null

  return (
    <span
      title={info.tooltip}
      className="inline-flex items-center gap-0.5 text-slate/45 text-xs font-body leading-none whitespace-nowrap"
    >
      <DollarSign size={11} strokeWidth={1.75} />
      {info.range}
    </span>
  )
}
