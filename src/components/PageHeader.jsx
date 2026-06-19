export default function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between mb-8">
      <div>
        <h1 className="font-heading text-2xl text-navy">{title}</h1>
        {subtitle && (
          <p className="mt-1 text-sm text-slate/70 font-body">{subtitle}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
