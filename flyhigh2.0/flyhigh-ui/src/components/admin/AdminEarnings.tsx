import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AdminPagination } from "@/components/admin/AdminPagination"
import { api } from "@/api/client"
import { toast } from "@/hooks/use-toast"

const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0 })
const fmtINR = (a: number | undefined) => INR.format(a ?? 0)

interface Earning { id: string; expertId: string; expertEarningAmount: number; platformFee: number; clientPaidAmount: number; status: string; settlementStartTime: string; settlementEndTime: string; settledAt: string; createdAt: string }
interface PageResponse { content: Earning[]; totalPages: number; totalElements: number; page: number }

const fmtDate = (iso: string) => { try { return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) } catch { return iso ?? "—" } }
const badge = (s: string): "default" | "secondary" | "outline" | "destructive" => {
  switch (s) { case "PAID": case "AVAILABLE": return "default"; case "PENDING": case "SETTLEMENT_PROCESSING": case "PAYOUT_PROCESSING": return "secondary"; case "DISPUTED": return "destructive"; case "REFUND_ADJUSTED": case "WITHDRAWN": return "outline"; default: return "outline" }
}
function Skeleton() { return <div className="flex items-center gap-4 border-b border-slate-100 px-4 py-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-4 animate-pulse rounded bg-slate-200" style={{ width: 64 }} />)}</div> }

export default function AdminEarnings() {
  const [items, setItems] = useState<Earning[]>([]); const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0); const [totalElements, setTotalElements] = useState(0)
  const [statusFilter, setStatusFilter] = useState(""); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null)

  const load = async (p: number, filter: string) => {
    setLoading(true); setError(null)
    try { const params = new URLSearchParams({ page: String(p) }); if (filter) params.set("status", filter)
      const r = await api.get<PageResponse>(`/admin/earnings?${params}`); setItems(r.content ?? []); setTotalPages(r.totalPages ?? 0); setTotalElements(r.totalElements ?? 0) }
    catch (e: any) { setError(e?.message); toast({ title: "Error", description: e?.message, variant: "destructive" }) }
    finally { setLoading(false) }
  }
  useEffect(() => { load(page, statusFilter) }, [page, statusFilter])

  return (
    <div className="space-y-5">
      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div><h2 className="text-2xl font-bold tracking-tight text-slate-950">Expert Earnings</h2>
            <p className="mt-1 text-sm text-slate-500">All expert earnings across the platform</p></div>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0) }} className="rounded border px-3 py-1.5 text-sm">
            <option value="">All</option><option value="PENDING">Pending</option><option value="SETTLEMENT_PROCESSING">Settling</option>
            <option value="AVAILABLE">Available</option><option value="PAID">Paid</option><option value="DISPUTED">Disputed</option><option value="REFUND_ADJUSTED">Refunded</option>
          </select>
        </div>
      </motion.section>
      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card><CardHeader><CardTitle>Earnings ({totalElements})</CardTitle></CardHeader>
          <CardContent>
            {loading ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} />) : error ? (
              <div className="py-8 text-center"><p className="text-red-500">{error}</p><Button variant="outline" onClick={() => load(page, statusFilter)} className="mt-2">Retry</Button></div>
            ) : items.length === 0 ? <div className="py-12 text-center text-slate-400">No earnings found.</div> : (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm"><thead><tr className="border-b text-left text-slate-500">
                    <th className="pb-2 font-medium">ID</th><th className="pb-2 font-medium">Expert</th><th className="pb-2 font-medium">Earning</th>
                    <th className="pb-2 font-medium">Platform Fee</th><th className="pb-2 font-medium">Status</th><th className="pb-2 font-medium">Created</th>
                  </tr></thead><tbody>
                    {items.map(e => (
                      <tr key={e.id} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="py-2 font-mono text-xs">{e.id?.slice(-8)}</td>
                        <td className="py-2 font-mono text-xs">{e.expertId?.slice(-8)}</td>
                        <td className="py-2 font-medium text-emerald-600">{fmtINR(e.expertEarningAmount ?? 0)}</td>
                        <td className="py-2 text-slate-500">{fmtINR(e.platformFee ?? 0)}</td>
                        <td className="py-2"><Badge variant={badge(e.status)}>{e.status}</Badge></td>
                        <td className="py-2 text-xs text-slate-500">{fmtDate(e.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody></table>
                </div>
                <div className="md:hidden space-y-2">
                  {items.map(e => (
                    <div key={e.id} className="rounded border p-3 text-sm">
                      <div className="flex justify-between"><span className="font-mono text-xs">{e.id?.slice(-8)}</span>
                        <span className="font-medium text-emerald-600">{fmtINR(e.expertEarningAmount ?? 0)}</span></div>
                      <div className="mt-1 flex justify-between"><Badge variant={badge(e.status)}>{e.status}</Badge>
                        <span className="text-xs text-slate-400">Fee: {fmtINR(e.platformFee ?? 0)}</span></div>
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
