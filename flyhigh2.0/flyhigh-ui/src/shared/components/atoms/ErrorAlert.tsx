import { AlertCircle, RotateCcw } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"

interface ErrorAlertProps {
  message: string
  title?: string
  onRetry?: () => void
  /** Render as inline banner (no card wrapper) instead of centered block */
  variant?: "block" | "banner"
  className?: string
}

export function ErrorAlert({
  message,
  title = "Something went wrong",
  onRetry,
  variant = "block",
  className,
}: ErrorAlertProps) {
  const content = (
    <>
      <AlertCircle className="size-4 shrink-0" />
      <div className="flex-1">
        <p className="font-medium">{title}</p>
        <p className="mt-0.5 text-sm opacity-90">{message}</p>
      </div>
    </>
  )

  if (variant === "banner") {
    return (
      <div
        className={`flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 ${className ?? ""}`}
        role="alert"
      >
        {content}
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            className="mt-2 gap-1.5"
            onClick={onRetry}
          >
            <RotateCcw className="size-3.5" />
            Retry
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className={`rounded-lg border border-red-200 bg-red-50 p-8 text-center ${className ?? ""}`} role="alert">
      <AlertCircle className="mx-auto mb-3 size-7 text-red-500" />
      <p className="font-semibold text-red-800">{title}</p>
      <p className="mt-1 text-sm text-red-600">{message}</p>
      {onRetry && (
        <Button variant="outline" className="mt-4 gap-2" onClick={onRetry}>
          <RotateCcw className="size-4" />
          Retry
        </Button>
      )}
    </div>
  )
}

/** Animated error banner — for auth pages */
export function AnimatedErrorBanner({
  message,
}: {
  message: string
}) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span className="flex-1">{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
