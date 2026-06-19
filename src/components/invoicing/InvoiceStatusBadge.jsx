const styles = {
  Draft:   'text-slate/50 border-slate/20',
  Sent:    'text-teal border-teal/40',
  Paid:    'text-navy border-navy/30',
  Overdue: 'text-[#C0392B] border-[#C0392B]/35',
}

export default function InvoiceStatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-body font-medium border ${styles[status] ?? styles.Draft}`}>
      {status}
    </span>
  )
}
