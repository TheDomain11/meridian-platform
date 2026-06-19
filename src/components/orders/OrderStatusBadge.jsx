const styles = {
  Sourcing:   'text-slate border-slate/35',
  Sampling:   'text-teal border-teal/40',
  Production: 'text-navy border-navy/35',
  QC:         'text-gold border-gold/50',
  Shipped:    'text-teal border-teal/60',
  Delivered:  'text-slate/50 border-slate/25',
  Cancelled:  'text-slate/35 border-slate/20',
}

export default function OrderStatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-body font-medium border ${styles[status] ?? styles.Cancelled}`}>
      {status}
    </span>
  )
}
