import { useEffect, useMemo, useState } from "react"
import { Tabs as TabsPrimitive } from "radix-ui"
import { AlertTriangle, CalendarCheck, Clock, IndianRupee, RotateCcw, Search, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { fetchCallHistory, type CallHistoryItem } from "@/lib/call-requests"
import { api } from "@/api/client"
import { toast } from "@/hooks/use-toast"

type SessionStatus = "Completed" | "Cancelled"

const tabs: SessionStatus[] = ["Completed", "Cancelled"]

const INR_FORMAT = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0, maximumFractionDigits: 0 })
function formatINR(a: number | undefined) { return INR_FORMAT.format(a ?? 0) }

const DISPUTE_WINDOW_MINUTES = 10

function mapStatus(status: string): SessionStatus {
  const normalized = status.toUpperCase()
  if (normalized === "COMPLETED") return "Completed"
  if (normalized === "REJECTED" || normalized === "CANCELLED") return "Cancelled"
  return "Completed"
}

/** Check if the dispute/refund window is still open (10 min from session creation). */
function isDisputeWindowOpen(session: CallHistoryItem): boolean {
  if (!session.createdAt) return false
  const created = new Date(session.createdAt).getTime()
  const deadline = created + DISPUTE_WINDOW_MINUTES * 60 * 1000
  return Date.now() < deadline
}

/** Human-readable time remaining in the dispute window. */
function disputeWindowRemaining(session: CallHistoryItem): string {
  if (!session.createdAt) return ""
  const created = new Date(session.createdAt).getTime()
  const deadline = created + DISPUTE_WINDOW_MINUTES * 60 * 1000
  const remaining = Math.max(0, deadline - Date.now())
  const mins = Math.floor(remaining / 60000)
  const secs = Math.floor((remaining % 60000) / 1000)
  return `${mins}m ${secs}s`
}

export default function MySessionsPage() {
  const [sessions, setSessions] = useState<CallHistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [disputeModal, setDisputeModal] = useState<{ session: CallHistoryItem; type: "dispute" | "refund" } | null>(null)
  const [reason, setReason] = useState("")
  const [statement, setStatement] = useState("")
  const [submitting, setSubmitting] = useState(false)

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

  const handleSubmit = async () => {
    if (!disputeModal || !reason) return
    setSubmitting(true)
    try {
      if (disputeModal.type === "dispute") {
        await api.post("/disputes", { interactionId: disputeModal.session.id, reason, statement })
        toast({ title: "Dispute filed", description: "An admin will review your case within 24 hours." })
      } else {
        await api.post("/refunds/request", { interactionId: disputeModal.session.id, reason: statement || reason })
        toast({ title: "Refund requested", description: "An admin will review your refund request." })
      }
      setDisputeModal(null); setReason(""); setStatement("")
    } catch (e: any) {
      toast({ title: "Failed", description: e?.message, variant: "destructive" })
    } finally { setSubmitting(false) }
  }

  const completedCount = useMemo(
    () => sessions.filter((s) => s.status === "COMPLETED").length,
    [sessions],
  )
  const cancelledCount = useMemo(
    () => sessions.filter((s) => s.status === "REJECTED" || s.status === "CANCELLED").length,
    [sessions],
  )
  const totalSpent = useMemo(
    () => sessions.reduce((sum, s) => sum + (s.totalPaidAmount ?? 0), 0),
    [sessions],
  )

  return (
      <div className="space-y-5">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold tracking-tight text-slate-950">My Sessions</h2>
          <p className="mt-1 text-sm text-slate-500">Track completed and cancelled expert sessions.</p>
        </section>

        {/* Summary Cards */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total Sessions", value: String(sessions.length), icon: Search, color: "text-indigo-600 bg-indigo-50" },
            { label: "Completed", value: String(completedCount), icon: Clock, color: "text-emerald-600 bg-emerald-50" },
            { label: "Cancelled", value: String(cancelledCount), icon: CalendarCheck, color: "text-rose-600 bg-rose-50" },
            { label: "Total Spent", value: totalSpent > 0 ? formatINR(totalSpent) : "₹0", icon: IndianRupee, color: "text-blue-600 bg-blue-50" },
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
                          {session.totalPaidAmount != null && session.totalPaidAmount > 0 && (
                            <p className="flex items-center gap-2 sm:justify-end font-semibold text-slate-950">
                              <IndianRupee className="size-4 text-slate-400" />
                              {formatINR(session.totalPaidAmount)}
                            </p>
                          )}
                          {session.totalPaidAmount != null && session.totalPaidAmount === 0 && (
                            <p className="flex items-center gap-2 sm:justify-end text-slate-400">
                              Free session
                            </p>
                          )}
                          <p className="flex items-center gap-2 sm:justify-end">
                            <CalendarCheck className="size-4 text-slate-400" />
                            {session.createdAt ? new Date(session.createdAt).toLocaleDateString() : "Pending"}
                          </p>
                          <p className="flex items-center gap-2 sm:justify-end">
                            <Clock className="size-4 text-slate-400" />
                            {session.respondedAt ? new Date(session.respondedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                          </p>
                          {(mapStatus(session.status) === "Completed") && (
                            <div className="flex gap-2 sm:justify-end mt-2">
                              {isDisputeWindowOpen(session) ? (
                                <>
                                  <span className="text-xs text-amber-600 self-center mr-1">
                                    {disputeWindowRemaining(session)} left
                                  </span>
                                  <Button variant="outline" size="sm" onClick={() => setDisputeModal({ session, type: "dispute" })}>
                                    <AlertTriangle className="mr-1 size-3" /> Report Issue
                                  </Button>
                                  <Button variant="outline" size="sm" onClick={() => setDisputeModal({ session, type: "refund" })}>
                                    <RotateCcw className="mr-1 size-3" /> Refund
                                  </Button>
                                </>
                              ) : (
                                <div className="flex gap-2">
                                  <span title="Dispute window closed — only available within 10 minutes of call completion"
                                    className="cursor-not-allowed">
                                    <Button variant="outline" size="sm" disabled className="opacity-40">
                                      <AlertTriangle className="mr-1 size-3" /> Report Issue
                                    </Button>
                                  </span>
                                  <span title="Refund window closed — only available within 10 minutes of call completion"
                                    className="cursor-not-allowed">
                                    <Button variant="outline" size="sm" disabled className="opacity-40">
                                      <RotateCcw className="mr-1 size-3" /> Refund
                                    </Button>
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
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

        {/* Dispute / Refund Modal */}
        {disputeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDisputeModal(null)}>
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">
                  {disputeModal.type === "dispute" ? "Report an Issue" : "Request a Refund"}
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setDisputeModal(null)}><X className="size-4" /></Button>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Session with {disputeModal.session.expertName || "Expert"}
              </p>
              <div className="mt-4 space-y-3">
                <select value={reason} onChange={e => setReason(e.target.value)}
                  className="w-full rounded border px-3 py-2 text-sm">
                  <option value="">Select reason...</option>
                  <option value="Expert did not provide consultation">Expert didn't provide consultation</option>
                  <option value="Expert disconnected early">Expert disconnected early</option>
                  <option value="Technical problem">Technical problem during call</option>
                  <option value="Service differed from expected">Service didn't match description</option>
                  <option value="Payment issue">Payment-related issue</option>
                  <option value="Other">Other</option>
                </select>
                <textarea value={statement} onChange={e => setStatement(e.target.value)}
                  placeholder="Describe what happened..." rows={3}
                  className="w-full rounded border px-3 py-2 text-sm" />
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDisputeModal(null)}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={!reason || submitting}>
                  {submitting ? "Submitting..." : "Submit"}
                </Button>
              </div>
            </div>
          </div>
        )}
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
