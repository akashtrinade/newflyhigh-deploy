import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  X,
  CheckCircle,
  AlertCircle,
  Info,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react"
import { useToast, type Toast, type ToastSeverity } from "@/hooks/use-toast"

// ── Icon & color maps ──

const icons: Record<ToastSeverity, React.ComponentType<{ className?: string }>> = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle,
  critical: ShieldAlert,
}

const colors: Record<ToastSeverity, string> = {
  info: "border-blue-500/30 bg-blue-950/80 text-blue-200",
  success: "border-emerald-500/30 bg-emerald-950/80 text-emerald-200",
  warning: "border-amber-500/30 bg-amber-950/80 text-amber-200",
  error: "border-red-500/30 bg-red-950/80 text-red-200",
  critical: "border-rose-500/60 bg-rose-950/90 text-rose-100 ring-1 ring-rose-500/30",
}

const iconColors: Record<ToastSeverity, string> = {
  info: "text-blue-400",
  success: "text-emerald-400",
  warning: "text-amber-400",
  error: "text-red-400",
  critical: "text-rose-400",
}

const progressColors: Record<ToastSeverity, string> = {
  info: "bg-blue-400",
  success: "bg-emerald-400",
  warning: "bg-amber-400",
  error: "bg-red-400",
  critical: "bg-rose-400",
}

// ── Legacy variant → severity mapping (for backward compat) ──

function toSeverity(toast: Toast): ToastSeverity {
  return toast.severity ?? "info"
}

// ── Progress Bar ──

function ProgressBar({
  severity,
  durationMs,
  paused,
}: {
  severity: ToastSeverity
  durationMs: number
  paused: boolean
}) {
  // Animate from 100% to 0% over durationMs seconds
  return (
    <div className="absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden rounded-b-xl">
      <motion.div
        initial={{ width: "100%" }}
        animate={{ width: paused ? undefined : "0%" }}
        transition={{
          duration: paused ? 0 : durationMs / 1000,
          ease: "linear",
        }}
        className={`h-full ${progressColors[severity]}`}
      />
    </div>
  )
}

// ── Toast Item ──

function ToastItem({
  toast,
  onDismiss,
  onPause,
  onResume,
}: {
  toast: Toast
  onDismiss: (id: string) => void
  onPause: (id: string) => void
  onResume: (id: string) => void
}) {
  const severity = toSeverity(toast)
  const Icon = icons[severity]
  const isCritical = severity === "critical"
  const effectiveDuration = toast.duration ?? (isCritical ? 0 : 5000)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 80, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={`relative flex items-start gap-3 overflow-hidden rounded-xl border px-4 py-3 text-sm shadow-2xl backdrop-blur-xl ${colors[severity]} ${isCritical ? "shadow-rose-500/20" : ""}`}
      onMouseEnter={() => onPause(toast.id)}
      onMouseLeave={() => onResume(toast.id)}
    >
      <Icon
        className={`mt-0.5 size-4 shrink-0 ${iconColors[severity]} ${isCritical ? "animate-pulse" : ""}`}
      />
      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className="font-semibold leading-tight">{toast.title}</p>
        )}
        {toast.description && (
          <p className="mt-0.5 text-sm opacity-85 leading-snug">
            {toast.description}
          </p>
        )}
      </div>

      {isCritical ? (
        <button
          onClick={() => onDismiss(toast.id)}
          className="shrink-0 rounded-lg border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 text-xs font-medium text-rose-300 transition-colors hover:bg-rose-500/20"
        >
          Dismiss
        </button>
      ) : (
        <button
          onClick={() => onDismiss(toast.id)}
          className="shrink-0 rounded-lg p-0.5 opacity-50 transition-opacity hover:opacity-100"
        >
          <X className="size-3.5" />
        </button>
      )}

      {/* Progress bar (not for critical) */}
      {!isCritical && effectiveDuration > 0 && (
        <ProgressBar
          severity={severity}
          durationMs={effectiveDuration}
          paused={false}
        />
      )}
    </motion.div>
  )
}

// ── Toaster Container ──

export function Toaster() {
  const { toasts, dismiss, pause, resume } = useToast()

  return (
    <div
      className="fixed top-4 right-4 z-[100] flex max-w-sm flex-col gap-2"
      aria-live="polite"
      aria-label="Notifications"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <ToastItem
            key={t.id}
            toast={t}
            onDismiss={dismiss}
            onPause={pause}
            onResume={resume}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}
