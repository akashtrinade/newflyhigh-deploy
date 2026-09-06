import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Settings2, Save } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { api } from "@/api/client"
import { toast } from "@/hooks/use-toast"

interface Settings {
  commissionPercent: number; settlementPeriodMinutes: number
  payoutMinAmount: number; payoutProvider: string
  settlementEnabled: boolean; payoutEnabled: boolean
}

export default function AdminSettings() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get<Settings>("/admin/settings")
      .then(setSettings)
      .catch(() => toast({ title: "Error", description: "Could not load settings", variant: "destructive" }))
      .finally(() => setLoading(false))
  }, [])

  const save = async () => {
    if (!settings) return
    setSaving(true)
    try {
      await api.put("/admin/settings", settings)
      toast({ title: "Saved", description: "Platform settings updated" })
    } catch (e: any) { toast({ title: "Error", description: e?.message, variant: "destructive" }) }
    finally { setSaving(false) }
  }

  if (loading) return <div className="py-12 text-center text-slate-400">Loading settings...</div>

  return (
    <div className="space-y-5">
      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-bold tracking-tight text-slate-950">Settings</h2>
        <p className="mt-1 text-sm text-slate-500">Configure platform commission, settlement, and payout rules</p>
      </motion.section>

      {settings && (
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card>
            <CardContent className="space-y-4 p-6">
              <div>
                <label className="block text-sm font-medium text-slate-700">Commission Rate (%)</label>
                <input type="number" value={settings.commissionPercent} min={0} max={100}
                  onChange={e => setSettings({ ...settings, commissionPercent: Number(e.target.value) })}
                  className="mt-1 w-full max-w-xs rounded border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Dispute Window (minutes)</label>
                <input type="number" value={settings.settlementPeriodMinutes} min={1} max={1440}
                  onChange={e => setSettings({ ...settings, settlementPeriodMinutes: Number(e.target.value) })}
                  className="mt-1 w-full max-w-xs rounded border px-3 py-2 text-sm" />
                <p className="mt-1 text-xs text-slate-400">Clients can dispute/refund within this window. Settlement begins after.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Min Payout Amount (₹)</label>
                <input type="number" value={settings.payoutMinAmount} min={0}
                  onChange={e => setSettings({ ...settings, payoutMinAmount: Number(e.target.value) })}
                  className="mt-1 w-full max-w-xs rounded border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Payout Provider</label>
                <select
                  value={settings.payoutProvider}
                  onChange={e => setSettings({ ...settings, payoutProvider: e.target.value })}
                  className="mt-1 w-full max-w-xs rounded border px-3 py-2 text-sm"
                >
                  <option value="razorpayx">RazorpayX (automatic bank/UPI transfer)</option>
                  <option value="manual">Manual (admin completes offline transfers)</option>
                </select>
                <p className="mt-1 text-xs text-slate-400">
                  RazorpayX requires RAZORPAYX_KEY_ID / RAZORPAYX_KEY_SECRET / RAZORPAYX_ACCOUNT_NUMBER to be set.
                </p>
              </div>
              <div className="flex gap-8">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={settings.settlementEnabled}
                    onChange={e => setSettings({ ...settings, settlementEnabled: e.target.checked })} />
                  Settlement Active
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={settings.payoutEnabled}
                    onChange={e => setSettings({ ...settings, payoutEnabled: e.target.checked })} />
                  Auto-Payout Active
                </label>
              </div>
              <Button onClick={save} disabled={saving} className="mt-4">
                <Save className="mr-2 size-4" /> {saving ? "Saving..." : "Save Settings"}
              </Button>
            </CardContent>
          </Card>
        </motion.section>
      )}
    </div>
  )
}
