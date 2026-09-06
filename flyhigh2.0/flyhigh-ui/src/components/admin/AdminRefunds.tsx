import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { RotateCcw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AdminPagination } from "@/components/admin/AdminPagination"
import { api } from "@/api/client"
import { toast } from "@/hooks/use-toast"

const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0 })
const fmtINR = (a: number | undefined) => INR.format(a ?? 0)

interface Refund { id: string; interactionId: string; paymentId: string; refundAmount: number; status: string; reason: string; approvedBy: string; razorpayRefundId: string; createdAt: string; processedAt: string }
interface PageResponse { content: Refund[]; totalPages: number; totalElements: number; page: number }

const fmtDate = (iso: string) => { try { return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) } catch { return iso ?? "—" } }
const badge = (s: string): "default" | "secondary" | "outline" | "destructive" => {
  switch (s) { case "COMPLETED": return "default"; case "APPROVED": case "PROCESSING": case "PENDING_APPROVAL": return "secondary"; case "FAILED": return "destructive"; default: return "outline" }
}

function Skeleton() { return <div className="flex items-center gap-4 border-b border-slate-100 px-4 py-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-4 animate-pulse rounded bg-slate-200" style={{ width: 64 }} />)}</div> }

export default function AdminRefunds() {
  const [items, setItems] = useState<Refund[]>([]); const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0); const [totalElements, setTotalElements] = useState(0)
  const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null)
  const [acting, setActing] = useState<string | null>(null)

  const load = async (p: number) => {
    setLoading(true); setError(null)
    try { const r = await api.get<PageResponse>(`/admin/refunds?page=${p}`); setItems(r.content ?? []); setTotalPages(r.totalPages ?? 0); setTotalElements(r.totalElements ?? 0) }
    catch (e: any) { setError(e?.message); toast({ title: "Error", description: e?.message, variant: "destructive" }) }
    finally { setLoading(false) }
  }
  useEffect(() => { load(page) }, [page])

  const approve = async (r: Refund) => {
    setActing(r.id)
    try {
      await api.post(`/admin/refunds/${r.id}/approve`)
      toast({ title: "Refund approved & processed" })
      load(page)
    } catch (e: any) {
      toast({ title: "Failed to approve refund", description: e?.message ?? "Something went wrong", variant: "destructive" })
    } finally { setActing(null) }
  }

  const reject = async (r: Refund) => {
    setActing(r.id)
    try {
      await api.post(`/admin/refunds/${r.id}/reject`, { note: "Rejected by admin" })
      toast({ title: "Refund rejected" })
      load(page)
    } catch (e: any) {
      toast({ title: "Failed to reject refund", description: e?.message ?? "Something went wrong", variant: "destructive" })
    } finally { setActing(null) }
  }

  return (
    <div className="space-y-5">
      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-bold tracking-tight text-slate-950">Refunds</h2>
        <p className="mt-1 text-sm text-slate-500">Manage refund requests and processing</p>
      </motion.section>
      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card><CardHeader><CardTitle>Refunds ({totalElements})</CardTitle></CardHeader>
          <CardContent>
            {loading ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} />) : error ? (
              <div className="py-8 text-center"><p className="text-red-500">{error}</p><Button variant="outline" onClick={() => load(page)} className="mt-2">Retry</Button></div>
            ) : items.length === 0 ? <div className="py-12 text-center text-slate-400">No refunds yet.</div> : (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm"><thead><tr className="border-b text-left text-slate-500">
                    <th className="pb-2 font-medium">ID</th><th className="pb-2 font-medium">Amount</th><th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Reason</th><th className="pb-2 font-medium">Gateway Ref</th><th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Actions</th>
                  </tr></thead><tbody>
                    {items.map(r => (
                      <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="py-2 font-mono text-xs">{r.id?.slice(-8)}</td>
                        <td className="py-2 font-medium text-emerald-600">{fmtINR(r.refundAmount ?? 0)}</td>
                        <td className="py-2"><Badge variant={badge(r.status)}>{r.status}</Badge></td>
                        <td className="py-2 max-w-[200px] truncate text-xs">{r.reason}</td>
                        <td className="py-2 font-mono text-xs">{r.razorpayRefundId ?? "—"}</td>
                        <td className="py-2 text-xs text-slate-500">{fmtDate(r.createdAt)}</td>
                        <td className="py-2">
                          {r.status === "PENDING_APPROVAL" ? (
                            <div className="flex items-center gap-1.5">
                              <Button size="sm" disabled={acting === r.id} onClick={() => approve(r)}>
                                {acting === r.id ? "…" : "Approve"}
                              </Button>
                              <Button size="sm" variant="outline" disabled={acting === r.id} onClick={() => reject(r)}>
                                Reject
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody></table>
                </div>
                {/* Mobile */}
                <div className="md:hidden space-y-2">
                  {items.map(r => (
                    <div key={r.id} className="rounded border p-3 text-sm">
                      <div className="flex justify-between"><span className="font-mono text-xs">{r.id?.slice(-8)}</span>
                        <span className="font-medium text-emerald-600">{fmtINR(r.refundAmount ?? 0)}</span></div>
                      <div className="mt-1 flex justify-between"><Badge variant={badge(r.status)}>{r.status}</Badge>
                        <span className="text-xs text-slate-400">{fmtDate(r.createdAt)}</span></div>
                      {r.status === "PENDING_APPROVAL" && (
                        <div className="mt-2 flex items-center gap-2">
                          <Button size="sm" disabled={acting === r.id} onClick={() => approve(r)}>
                            {acting === r.id ? "…" : "Approve"}
                          </Button>
                          <Button size="sm" variant="outline" disabled={acting === r.id} onClick={() => reject(r)}>
                            Reject
                          </Button>
                        </div>
                      )}
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
