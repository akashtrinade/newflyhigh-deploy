import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { AlertTriangle, CheckCircle, XCircle, Eye } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AdminPagination } from "@/components/admin/AdminPagination"
import { api } from "@/api/client"
import { toast } from "@/hooks/use-toast"

// ── Types ──

interface Dispute {
  id: string; interactionId: string; clientId: string; expertId: string
  earningId: string; reason: string; clientStatement: string
  expertResponse: string; status: string; adminId: string
  decision: string; decisionReason: string
  createdAt: string; updatedAt: string; resolvedAt: string
}

interface PageResponse { content: Dispute[]; totalPages: number; totalElements: number; page: number }

// ── Helpers ──

function formatDate(iso: string): string {
  if (!iso) return "—"
  try { return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) }
  catch { return iso }
}

function disputeStatusBadge(status: string): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "OPEN": return "secondary"
    case "UNDER_REVIEW": return "secondary"
    case "ACCEPTED": return "default"
    case "REJECTED": return "outline"
    case "INFO_REQUESTED": return "secondary"
    case "ESCALATED": return "destructive"
    case "RESOLVED": return "outline"
    default: return "outline"
  }
}

// ── Skeleton ──

function TableRowSkeleton() {
  return (
    <div className="flex items-center gap-4 border-b border-slate-100 px-4 py-3">
      <div className="h-4 w-16 animate-pulse rounded bg-slate-200" />
      <div className="h-4 w-20 animate-pulse rounded bg-slate-200" />
      <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
      <div className="h-5 w-20 animate-pulse rounded-full bg-slate-200" />
      <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
    </div>
  )
}

// ── Component ──

export default function AdminDisputes() {
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [statusFilter, setStatusFilter] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Dispute | null>(null)
  const [decision, setDecision] = useState("")
  const [decisionNote, setDecisionNote] = useState("")

  const load = async (pageNum: number, filter: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(pageNum) })
      if (filter) params.set("status", filter)
      const res = await api.get<PageResponse>(`/admin/disputes?${params}`)
      setDisputes(res.content ?? [])
      setTotalPages(res.totalPages ?? 0)
      setTotalElements(res.totalElements ?? 0)
    } catch (err: any) {
      setError(err?.message ?? "Failed to load disputes")
      toast({ title: "Error", description: err?.message, variant: "destructive" })
    } finally { setIsLoading(false) }
  }

  useEffect(() => { load(page, statusFilter) }, [page, statusFilter])

  const handleDecision = async () => {
    if (!selected || !decision) return
    try {
      await api.post(`/admin/disputes/${selected.id}/decision`, { decision, note: decisionNote })
      toast({ title: "Decision recorded", description: `${decision} — ${decisionNote}` })
      setSelected(null); setDecision(""); setDecisionNote("")
      load(page, statusFilter)
    } catch (err: any) {
      toast({ title: "Failed", description: err?.message, variant: "destructive" })
    }
  }

  return (
    <div className="space-y-5">
      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-950">Disputes</h2>
            <p className="mt-1 text-sm text-slate-500">Review and resolve client disputes</p>
          </div>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0) }}
            className="rounded border px-3 py-1.5 text-sm">
            <option value="">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="INFO_REQUESTED">Info Requested</option>
            <option value="ESCALATED">Escalated</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="REJECTED">Rejected</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>
      </motion.section>

      {/* Detail Modal */}
      {selected && (
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="rounded-lg border border-blue-200 bg-blue-50/50 p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-900">Dispute #{selected.id?.slice(-8)}</h3>
              <p className="text-sm"><strong>Reason:</strong> {selected.reason}</p>
              <p className="text-sm"><strong>Client:</strong> {selected.clientStatement || "No statement"}</p>
              <p className="text-sm"><strong>Expert:</strong> {selected.expertResponse || "No response yet"}</p>
              <p className="text-sm"><strong>Session:</strong> {selected.interactionId?.slice(-8)}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelected(null)}><XCircle className="size-4" /></Button>
          </div>
          <div className="mt-4 flex gap-2">
            <select value={decision} onChange={e => setDecision(e.target.value)}
              className="rounded border px-2 py-1 text-sm">
              <option value="">Choose decision...</option>
              <option value="ACCEPT">Accept (refund client)</option>
              <option value="REJECT">Reject (close dispute)</option>
              <option value="REQUEST_INFO">Request More Info</option>
              <option value="ESCALATE">Escalate</option>
            </select>
            <input value={decisionNote} onChange={e => setDecisionNote(e.target.value)}
              placeholder="Decision note..." className="flex-1 rounded border px-2 py-1 text-sm" />
            <Button size="sm" onClick={handleDecision} disabled={!decision}>
              <CheckCircle className="mr-1 size-3" /> Submit
            </Button>
          </div>
        </motion.section>
      )}

      {/* Table */}
      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card>
          <CardHeader><CardTitle>Disputes ({totalElements})</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} />) :
              error ? (
                <div className="py-8 text-center">
                  <p className="text-red-500">{error}</p>
                  <Button variant="outline" onClick={() => load(page, statusFilter)} className="mt-2">Retry</Button>
                </div>
              ) : disputes.length === 0 ? (
                <div className="py-12 text-center text-slate-400">No disputes found.</div>
              ) : (
                <>
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b text-left text-slate-500">
                        <th className="pb-2 font-medium">ID</th><th className="pb-2 font-medium">Reason</th>
                        <th className="pb-2 font-medium">Status</th><th className="pb-2 font-medium">Decision</th>
                        <th className="pb-2 font-medium">Date</th><th className="pb-2 font-medium">Action</th>
                      </tr></thead>
                      <tbody>
                        {disputes.map(d => (
                          <tr key={d.id} className="border-b border-slate-50 hover:bg-slate-50">
                            <td className="py-2 font-mono text-xs">{d.id?.slice(-8)}</td>
                            <td className="py-2 max-w-[200px] truncate">{d.reason}</td>
                            <td className="py-2"><Badge variant={disputeStatusBadge(d.status)}>{d.status}</Badge></td>
                            <td className="py-2 text-xs">{d.decision || "—"}</td>
                            <td className="py-2 text-xs text-slate-500">{formatDate(d.createdAt)}</td>
                            <td className="py-2">
                              <Button variant="ghost" size="sm" onClick={() => setSelected(d)}>
                                <Eye className="size-3" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Mobile cards */}
                  <div className="md:hidden space-y-2">
                    {disputes.map(d => (
                      <div key={d.id} className="rounded border p-3 text-sm" onClick={() => setSelected(d)}>
                        <div className="flex justify-between"><span className="font-mono text-xs">{d.id?.slice(-8)}</span>
                          <Badge variant={disputeStatusBadge(d.status)}>{d.status}</Badge></div>
                        <p className="mt-1 truncate">{d.reason}</p>
                        <p className="mt-1 text-xs text-slate-400">{formatDate(d.createdAt)}</p>
                      </div>
                    ))}
                  </div>
                  <AdminPagination page={page} totalPages={totalPages} onPageChange={setPage} />
                </>
              )}
          </CardContent>
        </Card>
      </motion.section>
    </div>
  )
}
