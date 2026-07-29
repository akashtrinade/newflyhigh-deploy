// ── Data Worker ──
// Generic sort/filter/partition engine for session data.
// Used by ExpertDashboard, ClientDashboard, MySessionsPage.

import type { CallHistoryItem } from "@/types/expert"

type SessionStatus = "Completed" | "Cancelled"

function mapStatus(status: string): SessionStatus {
  const normalized = status.toUpperCase()
  if (normalized === "COMPLETED") return "Completed"
  if (normalized === "REJECTED" || normalized === "CANCELLED") return "Cancelled"
  return "Cancelled"
}

self.onmessage = (
  event: MessageEvent<{
    type: "partition-sessions"
    sessions: CallHistoryItem[]
  }>,
) => {
  if (event.data.type === "partition-sessions") {
    const { sessions } = event.data

    // Sort once by date descending
    const sorted = [...sessions].sort((a, b) => {
      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const db = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return db - da
    })

    // Partition into status buckets in a single pass
    const completed: CallHistoryItem[] = []
    const cancelled: CallHistoryItem[] = []

    for (const s of sorted) {
      const status = mapStatus(s.status)
      if (status === "Completed") completed.push(s)
      else cancelled.push(s)
    }

    // Compute aggregate stats
    const uniqueClients = new Set(
      sessions.map((s) => s.clientId).filter(Boolean) as string[],
    ).size

    self.postMessage({
      type: "partition-result",
      buckets: {
        Completed: completed,
        Cancelled: cancelled,
      },
      stats: {
        total: sessions.length,
        completed: completed.length,
        uniqueClients,
        pending: 0,
      },
    })
  }
}
