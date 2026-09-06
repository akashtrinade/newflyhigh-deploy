import type { CallHistoryItem } from "@/types/expert"
import { cn } from "@/lib/utils"
import { IndianRupee } from "lucide-react"

const INR_FORMAT = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0, maximumFractionDigits: 0 })

type SessionStatus = "Completed" | "Cancelled"

function mapStatus(status: string): SessionStatus {
  const normalized = status.toUpperCase()
  if (normalized === "COMPLETED") return "Completed"
  if (normalized === "REJECTED" || normalized === "CANCELLED") return "Cancelled"
  return "Cancelled"
}

function StatusBadge({ status }: { status: SessionStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium",
        status === "Completed" && "bg-emerald-50 text-emerald-700",
        status === "Cancelled" && "bg-rose-50 text-rose-700",
      )}
    >
      {status}
    </span>
  )
}

interface SessionListItemProps {
  session: CallHistoryItem
  /** Default label when clientName is missing */
  nameFallback?: string
  /** Show expert earning amount instead of client paid amount */
  showEarning?: boolean
}

export function SessionListItem({
  session,
  nameFallback = "Client",
  showEarning = false,
}: SessionListItemProps) {
  const status = mapStatus(session.status)
  const amount = showEarning ? session.expertAmount : session.totalPaidAmount

  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-slate-950">
            {session.clientName || nameFallback}
          </p>
          <StatusBadge status={status} />
        </div>
        <p className="mt-1 text-sm text-slate-600">
          {session.topic || "Video consultation"}
        </p>
      </div>
      <div className="text-right">
        {amount != null && amount > 0 && (
          <p className="flex items-center gap-1 justify-end text-sm font-semibold text-emerald-600">
            <IndianRupee className="size-3.5" />
            {INR_FORMAT.format(amount)}
          </p>
        )}
        {amount != null && amount === 0 && (
          <p className="text-xs text-slate-400">Free</p>
        )}
        <div className="text-xs text-slate-500 mt-1">
          <p>
            {session.createdAt
              ? new Date(session.createdAt).toLocaleDateString()
              : "Pending"}
          </p>
          <p>
            {session.respondedAt
              ? new Date(session.respondedAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : session.status === "ACCEPTED"
                ? "Accepted"
                : "Pending"}
          </p>
        </div>
      </div>
    </div>
  )
}
