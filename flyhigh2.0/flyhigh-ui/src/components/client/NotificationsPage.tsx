import { useState, useEffect, useCallback } from "react"
import { Bell, MessageSquare, PhoneCall } from "lucide-react"
import { fetchNotifications, type NotificationItem } from "@/lib/notifications"
import { LoadingSpinner, EmptyState } from "@/shared/components"

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchNotifications(page)
      setNotifications(result.data)
      setTotalPages(result.totalPages)
    } catch (err: any) {
      setError(err?.message ?? "Failed to load notifications")
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    load()
  }, [load])

  const getIcon = (type: string) => {
    if (type === "video-call") return <PhoneCall className="size-4 text-blue-600" />
    if (type === "chat") return <MessageSquare className="size-4 text-green-600" />
    return <Bell className="size-4 text-slate-500" />
  }

  const formatDate = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleString()
    } catch {
      return timestamp ?? ""
    }
  }

  if (loading) return <LoadingSpinner message="Loading notifications..." />
  if (error) return <EmptyState title="Error" description={error} />

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Notifications</h2>
        <p className="text-sm text-slate-500">Stay updated with call requests and messages</p>
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          title="No notifications yet"
          description="You'll see call requests and messages here when they arrive."
        />
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-3 rounded-lg border p-4 ${
                n.read ? "bg-white" : "bg-blue-50/50 border-blue-100"
              }`}
            >
              <div className="mt-0.5">{getIcon(n.type)}</div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${n.read ? "text-slate-600" : "font-medium text-slate-800"}`}>
                  {n.message}
                </p>
                <p className="mt-1 text-xs text-slate-400">{formatDate(n.timestamp)}</p>
              </div>
              {!n.read && (
                <span className="size-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
              )}
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="rounded border px-3 py-1 text-sm disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-slate-500">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="rounded border px-3 py-1 text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
