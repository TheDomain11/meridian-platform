const styles = {
  Active:      'text-teal border-teal/40',
  Probation:   'text-gold border-gold/50',
  Blacklisted: 'text-navy border-navy/35',
  Inactive:    'text-slate/40 border-slate/20',
}

export default function SupplierStatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-body font-medium border ${styles[status] ?? styles.Inactive}`}>
      {status}
    </span>
  )
}
