import type { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface StatCardProps {
  label: string
  value: string
  icon: LucideIcon
  color: string // e.g. "bg-blue-50 text-blue-600"
}

export function StatCard({ label, value, icon: Icon, color }: StatCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[var(--flyhigh-text-muted)]">{label}</p>
            <p className="mt-1 text-2xl font-bold text-[var(--flyhigh-text)]">
              {value}
            </p>
          </div>
          <div
            className={`flex size-10 items-center justify-center rounded-xl ${color}`}
          >
            <Icon className="size-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
