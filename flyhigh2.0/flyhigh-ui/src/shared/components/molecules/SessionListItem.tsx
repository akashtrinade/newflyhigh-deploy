import type { CallHistoryItem } from "@/types/expert"
import { cn } from "@/lib/utils"

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
}

export function SessionListItem({
  session,
  nameFallback = "Client",
}: SessionListItemProps) {
  const status = mapStatus(session.status)

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
      <div className="text-right text-xs text-slate-500">
        <p>
          {session.createdAt
            ? new Date(session.createdAt).toLocaleDateString()
            : "Pending"}
        </p>
        <p className="mt-1">
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
  )
}
