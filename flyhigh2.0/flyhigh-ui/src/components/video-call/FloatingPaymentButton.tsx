import { motion, AnimatePresence } from "framer-motion"
import { CreditCard, Clock, AlertTriangle } from "lucide-react"

interface FloatingPaymentButtonProps {
  freeTrialRemainingSec: number
  isWarning: boolean
  isDanger: boolean
  phase: string
  onClick: () => void
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

export default function FloatingPaymentButton({
  freeTrialRemainingSec,
  isWarning,
  isDanger,
  phase,
  onClick,
}: FloatingPaymentButtonProps) {
  const timeFormatted = formatTime(freeTrialRemainingSec)
  const isPaymentPending = phase === "PAYMENT_PENDING"

  const borderColor = isDanger
    ? "border-red-500/50 shadow-red-500/20"
    : isWarning
      ? "border-amber-500/50 shadow-amber-500/20"
      : "border-indigo-500/30 shadow-indigo-500/10"

  const pulseAnimation = isDanger
    ? { boxShadow: ["0 0 0 0 rgba(239,68,68,0.4)", "0 0 0 8px rgba(239,68,68,0)", "0 0 0 0 rgba(239,68,68,0)"] }
    : isWarning
      ? { boxShadow: ["0 0 0 0 rgba(245,158,11,0.4)", "0 0 0 8px rgba(245,158,11,0)", "0 0 0 0 rgba(245,158,11,0)"] }
      : undefined

  return (
    <AnimatePresence>
      <motion.button
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 100, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        onClick={onClick}
        className={`group fixed right-4 top-1/2 z-40 -translate-y-1/2 flex flex-col items-center gap-1.5 rounded-2xl border ${borderColor} bg-slate-900/90 p-4 shadow-2xl backdrop-blur-xl transition-all hover:scale-105 hover:bg-slate-800/95 active:scale-95`}
      >
        {/* Pulsing glow for warning/danger */}
        {(isDanger || isWarning) && (
          <motion.div
            animate={pulseAnimation}
            transition={{
              duration: isDanger ? 1.5 : 2.5,
              repeat: Infinity,
              ease: "easeOut",
            }}
            className="absolute inset-0 rounded-2xl"
          />
        )}

        <div className="relative flex flex-col items-center gap-1">
          {/* Icon */}
          <div
            className={`flex size-10 items-center justify-center rounded-xl transition-colors ${
              isDanger
                ? "bg-red-500/10 text-red-400"
                : isWarning
                  ? "bg-amber-500/10 text-amber-400"
                  : "bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/20"
            }`}
          >
            <CreditCard className="size-5" />
          </div>

          {/* Label */}
          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
            Payment
          </span>

          {/* Time */}
          <div className="flex items-center gap-1">
            <Clock
              className={`size-3 ${
                isDanger
                  ? "text-red-400"
                  : isWarning
                    ? "text-amber-400"
                    : "text-sky-400"
              }`}
            />
            <span
              className={`text-lg font-bold tabular-nums leading-none ${
                isDanger
                  ? "text-red-400"
                  : isWarning
                    ? "text-amber-400"
                    : "text-white"
              }`}
            >
              {timeFormatted}
            </span>
          </div>

          {/* Badge for payment pending */}
          {isPaymentPending && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="mt-1 flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5"
            >
              <AlertTriangle className="size-2.5 text-amber-400" />
              <span className="text-[10px] font-semibold text-amber-300">
                Pay Now
              </span>
            </motion.div>
          )}

          {/* Subtle "click to expand" hint */}
          <span className="mt-0.5 text-[9px] text-slate-600 opacity-0 transition-opacity group-hover:opacity-100">
            Click to expand
          </span>
        </div>
      </motion.button>
    </AnimatePresence>
  )
}
