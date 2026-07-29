import { Clock, AlertTriangle, CheckCircle2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion"

interface SessionTimerBadgeProps {
  phase: string
  formattedTime: string
  isWarning: boolean
  isDanger: boolean
}

export default function SessionTimerBadge({
  phase,
  formattedTime,
  isWarning,
  isDanger,
}: SessionTimerBadgeProps) {
  if (phase === "COMPLETED" || phase === "FREE_SESSION_EXPIRED") {
    return null
  }

  if (phase === "PAYMENT_PENDING") {
    return (
      <motion.div
        animate={{ opacity: [1, 0.6, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        <Badge
          variant="outline"
          className="border-amber-500/40 bg-amber-500/10 text-xs backdrop-blur-sm"
        >
          <AlertTriangle className="mr-1 size-3 text-amber-400" />
          <span className="text-amber-300">Awaiting Payment</span>
        </Badge>
      </motion.div>
    )
  }

  if (phase === "PAID_SESSION") {
    return (
      <Badge
        variant="outline"
        className="border-emerald-500/40 bg-emerald-500/10 text-xs backdrop-blur-sm"
      >
        <CheckCircle2 className="mr-1 size-3 text-emerald-400" />
        <span className="text-emerald-300">Paid · {formattedTime}</span>
      </Badge>
    )
  }

  // FREE_SESSION
  return (
    <Badge
      variant="outline"
      className={`text-xs backdrop-blur-sm ${
        isDanger
          ? "border-red-500/40 bg-red-500/10"
          : isWarning
            ? "border-amber-500/40 bg-amber-500/10"
            : "border-sky-500/40 bg-sky-500/10"
      }`}
    >
      <Clock
        className={`mr-1 size-3 ${
          isDanger
            ? "text-red-400"
            : isWarning
              ? "text-amber-400"
              : "text-sky-400"
        }`}
      />
      <span
        className={
          isDanger
            ? "text-red-300"
            : isWarning
              ? "text-amber-300"
              : "text-sky-300"
        }
      >
        Free · {formattedTime}
      </span>
    </Badge>
  )
}
