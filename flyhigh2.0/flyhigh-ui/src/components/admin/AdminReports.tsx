import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { BarChart3, TrendingUp, DollarSign, RotateCcw, Users } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { api } from "@/api/client"
import { toast } from "@/hooks/use-toast"

const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0 })
const fmtINR = (a: number | undefined) => INR.format(a ?? 0)

interface ReportSummary {
  totalRevenue: number; platformCommission: number; totalPayouts: number
  totalRefunds: number; openDisputes: number; completedSessions: number
}
interface DailyPoint { date: string; revenue: number; payouts: number; refunds: number }

export default function AdminReports() {
  const [summary, setSummary] = useState<ReportSummary | null>(null)
  const [daily, setDaily] = useState<DailyPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [s, d] = await Promise.all([
          api.get<ReportSummary>("/admin/reports/summary").catch(() => null),
          api.get<DailyPoint[]>("/admin/reports/daily").catch(() => []),
        ])
        setSummary(s ?? null)
        setDaily(Array.isArray(d) ? d : [])
      } catch (e: any) { toast({ title: "Error", description: e?.message, variant: "destructive" }) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const maxRevenue = Math.max(...daily.map(d => d.revenue ?? 0), 1)

  return (
    <div className="space-y-5">
      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-bold tracking-tight text-slate-950">Reports</h2>
        <p className="mt-1 text-sm text-slate-500">Platform analytics and performance</p>
      </motion.section>

      {loading ? (
        <div className="py-12 text-center text-slate-400">Loading reports...</div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            {[
              { label: "Total Revenue", value: fmtINR(summary?.totalRevenue), icon: DollarSign, color: "text-emerald-600" },
              { label: "Platform Commission", value: fmtINR(summary?.platformCommission), icon: TrendingUp, color: "text-blue-600" },
              { label: "Total Payouts", value: fmtINR(summary?.totalPayouts), icon: Users, color: "text-purple-600" },
              { label: "Total Refunds", value: fmtINR(summary?.totalRefunds), icon: RotateCcw, color: "text-amber-600" },
              { label: "Open Disputes", value: String(summary?.openDisputes ?? 0), icon: BarChart3, color: "text-red-600" },
              { label: "Sessions", value: String(summary?.completedSessions ?? 0), icon: BarChart3, color: "text-slate-600" },
            ].map(s => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <s.icon className={`size-5 ${s.color}`} />
                  <span className="text-sm text-slate-500">{s.label}</span>
                </div>
                <p className={`mt-2 text-2xl font-bold ${s.color}`}>{s.value}</p>
              </motion.div>
            ))}
          </div>

          {/* Daily revenue bars */}
          {daily.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Daily Revenue</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-end gap-1 h-32">
                  {daily.slice(-30).map(d => (
                    <div key={d.date} className="flex-1 flex flex-col items-center" title={`${d.date}: ${fmtINR(d.revenue)}`}>
                      <div className="w-full rounded-t bg-emerald-500" style={{
                        height: `${((d.revenue ?? 0) / maxRevenue) * 100}%`,
                        minHeight: (d.revenue ?? 0) > 0 ? 2 : 0,
                      }} />
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-center text-xs text-slate-400">Last 30 days</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
