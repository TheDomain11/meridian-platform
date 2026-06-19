const styles = {
  Active: 'text-gold border-gold/50',
  Pipeline: 'text-teal border-teal/40',
  'On Hold': 'text-slate border-slate/35',
  Closed: 'text-slate/40 border-slate/20',
}

export default function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-body font-medium border ${
        styles[status] ?? styles.Closed
      }`}
    >
      {status}
    </span>
  )
}
