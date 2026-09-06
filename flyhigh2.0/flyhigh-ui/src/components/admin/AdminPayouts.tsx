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

interface Payout {
  id: string
  expertId: string
  expertName: string
  expertEmail: string
  earningIds: string[]
  earningCount: number
  payoutAmount: number
  status: string
  gatewayPayoutId: string
  mode: string
  gatewayReferenceId: string
  errorMessage: string
  accountHolderName: string
  accountNumber: string
  ifsc: string
  upiId: string
  createdAt: string
  processedAt: string
  retryCount: number
}
interface PageResponse { content: Payout[]; totalPages: number; totalElements: number; page: number }

const fmtDate = (iso: string) => { try { return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) } catch { return iso ?? "—" } }
const badge = (s: string): "default" | "secondary" | "outline" | "destructive" => {
  switch (s) { case "SUCCESS": return "default"; case "PROCESSING": case "ELIGIBLE": case "PENDING": return "secondary"; case "FAILED": return "destructive"; case "RETRYING": return "secondary"; default: return "outline" }
}

/** Payouts managed by RazorpayX — the transfer happens automatically; failing
 *  them from the admin panel can't stop the money, so only "Mark Paid" applies. */
const isGatewayPayout = (p: Payout) => Boolean(p.gatewayPayoutId)

function Skeleton() {
  return <div className="flex items-center gap-4 border-b border-slate-100 px-4 py-3">
    {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-4 animate-pulse rounded bg-slate-200" style={{ width: [16, 20, 16, 16, 24, 16][i] * 4 }} />)}
  </div>
}

export default function AdminPayouts() {
  const [items, setItems] = useState<Payout[]>([]); const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0); const [totalElements, setTotalElements] = useState(0)
  const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null)
  const [refs, setRefs] = useState<Record<string, string>>({})
  const [acting, setActing] = useState<string | null>(null)

  const load = async (p: number) => {
    setLoading(true); setError(null)
    try { const r = await api.get<PageResponse>(`/admin/payouts?page=${p}`); setItems(r.content ?? []); setTotalPages(r.totalPages ?? 0); setTotalElements(r.totalElements ?? 0) }
    catch (e: any) { setError(e?.message ?? "Error"); toast({ title: "Error", description: e?.message, variant: "destructive" }) }
    finally { setLoading(false) }
  }

  useEffect(() => { load(page) }, [page])

  const complete = async (p: Payout) => {
    const ref = (refs[p.id] ?? "").trim()
    if (!ref) { toast({ title: "Reference required", description: "Enter the transaction/UTR reference first.", variant: "destructive" }); return }
    setActing(p.id)
    try {
      await api.post(`/admin/payouts/${p.id}/complete`, { gatewayReferenceId: ref })
      toast({ title: "Payout marked as paid" })
      load(page)
    } catch (e: any) {
      toast({ title: "Failed to complete", description: e?.message ?? "Something went wrong", variant: "destructive" })
    } finally { setActing(null) }
  }

  const fail = async (p: Payout) => {
    setActing(p.id)
    try {
      await api.post(`/admin/payouts/${p.id}/fail`, { reason: "Marked failed by admin" })
      toast({ title: "Payout failed — earnings released" })
      load(page)
    } catch (e: any) {
      toast({ title: "Failed to fail payout", description: e?.message ?? "Something went wrong", variant: "destructive" })
    } finally { setActing(null) }
  }

  return (
    <div className="space-y-5">
      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-bold tracking-tight text-slate-950">Payouts</h2>
        <p className="mt-1 text-sm text-slate-500">RazorpayX payouts transfer automatically; this page monitors them and fixes manual-mode payouts.</p>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card>
          <CardHeader><CardTitle>Payouts ({totalElements})</CardTitle></CardHeader>
          <CardContent>
            {loading ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} />) : error ? (
              <div className="py-8 text-center"><p className="text-red-500">{error}</p><Button variant="outline" onClick={() => load(page)} className="mt-2">Retry</Button></div>
            ) : items.length === 0 ? <div className="py-12 text-center text-slate-400">No payouts yet.</div> : (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm"><thead><tr className="border-b text-left text-slate-500">
                    <th className="pb-2 font-medium">Expert</th><th className="pb-2 font-medium">Amount</th>
                    <th className="pb-2 font-medium">Earnings</th><th className="pb-2 font-medium">Bank / UPI</th>
                    <th className="pb-2 font-medium">Status</th><th className="pb-2 font-medium">Gateway Ref</th>
                    <th className="pb-2 font-medium">Date</th><th className="pb-2 font-medium">Actions</th>
                  </tr></thead><tbody>
                    {items.map(p => (
                      <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50 align-top">
                        <td className="py-2">
                          <p className="font-medium text-slate-900">{p.expertName ?? p.expertId?.slice(-8)}</p>
                          <p className="text-xs text-slate-400">{p.expertEmail ?? ""}</p>
                        </td>
                        <td className="py-2 font-medium text-emerald-600">{fmtINR(p.payoutAmount)}</td>
                        <td className="py-2 text-xs">{p.earningCount ?? 0}</td>
                        <td className="py-2 text-xs">
                          {p.upiId ? <p>UPI: {p.upiId}</p> : (
                            <>
                              <p>{p.accountHolderName ?? "—"}</p>
                              <p className="font-mono">{p.accountNumber ?? "—"} · {p.ifsc ?? "—"}</p>
                            </>
                          )}
                        </td>
                        <td className="py-2">
                          <Badge variant={badge(p.status)}>{p.status}</Badge>
                          {isGatewayPayout(p) && (
                            <p className="mt-1 text-xs text-slate-400">
                              RazorpayX{p.mode ? ` · ${p.mode}` : ""}
                            </p>
                          )}
                        </td>
                        <td className="py-2 font-mono text-xs">{p.gatewayReferenceId ?? "—"}</td>
                        <td className="py-2 text-xs text-slate-500">{fmtDate(p.createdAt)}</td>
                        <td className="py-2">
                          {p.status === "PROCESSING" ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                placeholder="UTR / ref"
                                value={refs[p.id] ?? ""}
                                onChange={(e) => setRefs((r) => ({ ...r, [p.id]: e.target.value }))}
                                className="w-28 rounded-md border border-slate-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                              />
                              <Button size="sm" variant="default" disabled={acting === p.id} onClick={() => complete(p)}>
                                {acting === p.id ? "…" : "Mark Paid"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={acting === p.id || isGatewayPayout(p)}
                                title={isGatewayPayout(p) ? "Managed by RazorpayX — cannot be failed here" : undefined}
                                onClick={() => fail(p)}
                              >
                                Fail
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">{fmtDate(p.processedAt) || "—"}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody></table>
                </div>
                <div className="md:hidden space-y-3">
                  {items.map(p => (
                    <div key={p.id} className="rounded border p-3 text-sm">
                      <div className="flex justify-between"><span className="font-medium">{p.expertName ?? p.expertId?.slice(-8)}</span>
                        <span className="font-medium text-emerald-600">{fmtINR(p.payoutAmount)}</span></div>
                      <div className="mt-1 text-xs text-slate-500">
                        {p.upiId ? `UPI: ${p.upiId}` : `${p.accountNumber ?? "—"} · ${p.ifsc ?? "—"}`}
                      </div>
                      <div className="mt-1 flex justify-between"><Badge variant={badge(p.status)}>{p.status}</Badge>
                        <span className="text-xs text-slate-400">{fmtDate(p.createdAt)}</span></div>
                      {p.status === "PROCESSING" && (
                        <div className="mt-2 flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="UTR / ref"
                            value={refs[p.id] ?? ""}
                            onChange={(e) => setRefs((r) => ({ ...r, [p.id]: e.target.value }))}
                            className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs focus:outline-none"
                          />
                          <Button size="sm" disabled={acting === p.id} onClick={() => complete(p)}>Paid</Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={acting === p.id || isGatewayPayout(p)}
                            title={isGatewayPayout(p) ? "Managed by RazorpayX — cannot be failed here" : undefined}
                            onClick={() => fail(p)}
                          >
                            Fail
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
