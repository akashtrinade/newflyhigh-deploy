import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { Tabs as TabsPrimitive } from "radix-ui"
import { CalendarCheck, MessageSquareText } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchCallHistory, type CallHistoryItem } from "@/lib/call-requests"
import { SessionListItem } from "@/shared/components/molecules/SessionListItem"
import { StatCard } from "@/shared/components/molecules/StatCard"

// ── Constants ──

type SessionStatus = "Completed" | "Cancelled"
const tabs: SessionStatus[] = ["Completed", "Cancelled"]

// ── Helpers ──

function computeStats(sessions: CallHistoryItem[]) {
  const completed = sessions.filter(
    (s) => s.status.toUpperCase() === "COMPLETED",
  ).length

  return {
    total: sessions.length,
    completed,
  }
}

function mapStatus(status: string): SessionStatus {
  const normalized = status.toUpperCase()
  if (normalized === "COMPLETED") return "Completed"
  if (normalized === "REJECTED" || normalized === "CANCELLED") return "Cancelled"
  return "Cancelled"
}

function partitionSessions(
  sessions: CallHistoryItem[],
): Record<SessionStatus, CallHistoryItem[]> {
  const sorted = [...sessions].sort((a, b) => {
    const da = a.createdAt ? new Date(a.createdAt).getTime() : 0
    const db = b.createdAt ? new Date(b.createdAt).getTime() : 0
    return db - da
  })

  return {
    Completed: sorted.filter((s) => mapStatus(s.status) === "Completed"),
    Cancelled: sorted.filter((s) => mapStatus(s.status) === "Cancelled"),
  }
}

// ── Component ──

export default function ExpertSessionsPage() {
  const [sessions, setSessions] = useState<CallHistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchCallHistory()
        setSessions(data)
      } catch {
        // keep empty on error
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const stats = useMemo(() => computeStats(sessions), [sessions])
  const buckets = partitionSessions(sessions)

  return (
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Summary Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-4 sm:grid-cols-2"
        >
          <StatCard
            label="Total Sessions"
            value={isLoading ? "..." : String(stats.total)}
            icon={CalendarCheck}
            color="bg-blue-50 text-blue-600"
          />
          <StatCard
            label="Completed Calls"
            value={isLoading ? "..." : String(stats.completed)}
            icon={MessageSquareText}
            color="bg-emerald-50 text-emerald-600"
          />
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <h1 className="text-2xl font-bold tracking-tight text-[var(--flyhigh-text)]">
            All Sessions
          </h1>
          <p className="mt-1 text-sm text-[var(--flyhigh-text-muted)]">
            View and manage all your completed and cancelled sessions.
          </p>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <TabsPrimitive.Root defaultValue="Completed" className="space-y-4">
                <TabsPrimitive.List className="flex gap-2 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
                  {tabs.map((tab) => (
                    <TabsPrimitive.Trigger
                      key={tab}
                      value={tab}
                      className="h-9 flex-1 rounded-md px-3 text-sm font-semibold text-slate-500 transition data-[state=active]:bg-slate-950 data-[state=active]:text-white"
                    >
                      {tab} Sessions
                    </TabsPrimitive.Trigger>
                  ))}
                </TabsPrimitive.List>

                {tabs.map((tab) => {
                  const filtered = buckets[tab]

                  return (
                    <TabsPrimitive.Content
                      key={tab}
                      value={tab}
                      className="grid gap-3"
                    >
                      {isLoading ? (
                        <p className="py-6 text-center text-sm text-slate-500">
                          Loading sessions...
                        </p>
                      ) : filtered.length > 0 ? (
                        filtered.map((session) => (
                          <SessionListItem
                            key={session.id}
                            session={session}
                          />
                        ))
                      ) : (
                        <p className="py-6 text-center text-sm text-slate-500">
                          No sessions found.
                        </p>
                      )}
                    </TabsPrimitive.Content>
                  )
                })}
              </TabsPrimitive.Root>
            </CardContent>
          </Card>
        </motion.div>
      </div>
  )
}
