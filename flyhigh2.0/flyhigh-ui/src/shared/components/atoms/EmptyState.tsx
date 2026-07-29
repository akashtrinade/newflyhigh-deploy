import type { ReactNode } from "react"

interface EmptyStateProps {
  title: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
  className?: string
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={`rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center ${className ?? ""}`}
    >
      {icon && <div className="mx-auto mb-4 text-slate-300">{icon}</div>}
      <p className="font-semibold text-slate-950">{title}</p>
      {description && (
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
