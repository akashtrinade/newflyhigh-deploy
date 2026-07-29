import { Link } from "react-router-dom"
import { Bell } from "lucide-react"

/**
 * Notification bell icon with red dot indicator.
 * Extracted from the client layout — always shows the red dot
 * (unread-count awareness can be added later).
 */
export function NotificationBell() {
  return (
    <Link
      to="/notifications"
      className="relative flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50"
    >
      <Bell className="size-4" />
      <span className="absolute right-2 top-2 size-2 rounded-full bg-rose-500" />
    </Link>
  )
}
