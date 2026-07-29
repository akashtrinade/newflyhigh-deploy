import { useEffect, useMemo, useState } from "react"
import { Tabs as TabsPrimitive } from "radix-ui"
import { CalendarCheck, Clock, Search } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { fetchCallHistory, type CallHistoryItem } from "@/lib/call-requests"

type SessionStatus = "Completed" | "Cancelled"

const tabs: SessionStatus[] = ["Completed", "Cancelled"]

function mapStatus(status: string): SessionStatus {
  const normalized = status.toUpperCase()
  if (normalized === "COMPLETED") return "Completed"
  if (normalized === "REJECTED" || normalized === "CANCELLED") return "Cancelled"
  return "Completed"
}

export default function MySessionsPage() {
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

  const completedCount = useMemo(
    () => sessions.filter((s) => s.status === "COMPLETED").length,
    [sessions],
  )
  const cancelledCount = useMemo(
    () => sessions.filter((s) => s.status === "REJECTED" || s.status === "CANCELLED").length,
    [sessions],
  )

  return (
      <div className="space-y-5">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold tracking-tight text-slate-950">My Sessions</h2>
          <p className="mt-1 text-sm text-slate-500">Track completed and cancelled expert sessions.</p>
        </section>

        {/* Summary Cards */}
        <section className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Total Sessions", value: String(sessions.length), icon: Search, color: "text-indigo-600 bg-indigo-50" },
            { label: "Completed", value: String(completedCount), icon: Clock, color: "text-emerald-600 bg-emerald-50" },
            { label: "Cancelled", value: String(cancelledCount), icon: CalendarCheck, color: "text-rose-600 bg-rose-50" },
          ].map((stat) => {
            const Icon = stat.icon
            return (
              <Card key={stat.label} className="rounded-lg border-slate-200 shadow-sm">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm text-slate-500">{stat.label}</p>
                    <p className="mt-1 text-2xl font-bold text-slate-950">
                      {isLoading ? "..." : stat.value}
                    </p>
                  </div>
                  <span className={`flex size-10 items-center justify-center rounded-lg ${stat.color}`}>
                    <Icon className="size-5" />
                  </span>
                </CardContent>
              </Card>
            )
          })}
        </section>

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
            const filtered = sessions
              .filter((session) => mapStatus(session.status) === tab)
              .sort((a, b) => {
                const da = a.createdAt ? new Date(a.createdAt).getTime() : 0
                const db = b.createdAt ? new Date(b.createdAt).getTime() : 0
                return db - da
              })

            return (
              <TabsPrimitive.Content key={tab} value={tab} className="grid gap-3">
                {isLoading ? (
                  <p className="py-6 text-center text-sm text-slate-500">Loading sessions...</p>
                ) : filtered.length > 0 ? (
                  filtered.map((session) => (
                    <Card key={session.id} className="rounded-lg border-slate-200 shadow-sm">
                      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-slate-950">{session.expertName || "Expert"}</h3>
                            <StatusBadge status={mapStatus(session.status)} />
                          </div>
                          <p className="mt-1 text-sm text-slate-600">{session.topic || "Video consultation"}</p>
                        </div>
                        <div className="grid gap-1 text-sm text-slate-600 sm:text-right">
                          <p className="flex items-center gap-2 sm:justify-end">
                            <CalendarCheck className="size-4 text-slate-400" />
                            {session.createdAt ? new Date(session.createdAt).toLocaleDateString() : "Pending"}
                          </p>
                          <p className="flex items-center gap-2 sm:justify-end">
                            <Clock className="size-4 text-slate-400" />
                            {session.respondedAt ? new Date(session.respondedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <p className="py-6 text-center text-sm text-slate-500">No sessions found.</p>
                )}
              </TabsPrimitive.Content>
            )
          })}
        </TabsPrimitive.Root>
      </div>
  )
}

function StatusBadge({ status }: { status: SessionStatus }) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "rounded-md",
        status === "Completed" && "bg-emerald-50 text-emerald-700",
        status === "Cancelled" && "bg-rose-50 text-rose-700"
      )}
    >
      {status}
    </Badge>
  )
}
