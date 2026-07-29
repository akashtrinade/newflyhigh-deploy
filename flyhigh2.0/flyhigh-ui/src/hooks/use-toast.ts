import { useCallback, useSyncExternalStore } from "react"

// ── Types ──

export type ToastSeverity = "info" | "success" | "warning" | "error" | "critical"

export interface Toast {
  id: string
  title?: string
  description?: string
  variant?: "default" | "destructive" | "success"
  severity?: ToastSeverity
  duration?: number // override auto-dismiss ms (0 = never dismiss)
  dismissible?: boolean
  createdAt: number
}

// ── Severity defaults ──

const SEVERITY_DEFAULTS: Record<
  ToastSeverity,
  { duration: number; dismissible: boolean }
> = {
  info: { duration: 5000, dismissible: true },
  success: { duration: 5000, dismissible: true },
  warning: { duration: 8000, dismissible: true },
  error: { duration: 10000, dismissible: true },
  critical: { duration: 0, dismissible: false },
}

/** Map legacy variant to severity */
function variantToSeverity(
  variant?: "default" | "destructive" | "success",
): ToastSeverity {
  if (variant === "success") return "success"
  if (variant === "destructive") return "error"
  return "info"
}

function resolveDuration(
  severity: ToastSeverity,
  explicitDuration?: number,
): number {
  if (explicitDuration !== undefined) return explicitDuration
  return SEVERITY_DEFAULTS[severity].duration
}

function resolveDismissible(
  severity: ToastSeverity,
  explicitDismissible?: boolean,
): boolean {
  if (explicitDismissible !== undefined) return explicitDismissible
  return SEVERITY_DEFAULTS[severity].dismissible
}

// ── Duplicate protection ──

const DEDUP_WINDOW_MS = 3000
const recentToastKeys = new Map<
  string,
  { id: string; timestamp: number }
>()

function dedupKey(toast: Omit<Toast, "id" | "createdAt">): string {
  return `${toast.title ?? ""}::${toast.description ?? ""}`
}

function cleanStaleDedupKeys() {
  const now = Date.now()
  for (const [key, entry] of recentToastKeys) {
    if (now - entry.timestamp > DEDUP_WINDOW_MS + 2000) {
      recentToastKeys.delete(key)
    }
  }
}

// ── Internal store ──

let toastIdCounter = 0
const listeners = new Set<() => void>()
let toastState: Toast[] = []
const activeTimers = new Map<string, ReturnType<typeof setTimeout>>()

function emitChange() {
  listeners.forEach((l) => l())
}

function subscribe(callback: () => void) {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

function getSnapshot(): Toast[] {
  return toastState
}

function clearTimer(id: string) {
  const existing = activeTimers.get(id)
  if (existing) {
    clearTimeout(existing)
    activeTimers.delete(id)
  }
}

function scheduleAutoDismiss(id: string, durationMs: number) {
  if (durationMs <= 0) return // critical or explicitly disabled

  clearTimer(id)

  const timer = setTimeout(() => {
    dismissToast(id)
  }, durationMs)

  activeTimers.set(id, timer)
}

// ── Public API ──

export interface ToastOptions {
  title?: string
  description?: string
  variant?: "default" | "destructive" | "success"
  severity?: ToastSeverity
  /** Auto-dismiss duration in ms. 0 = never auto-dismiss. Overrides severity default. */
  duration?: number
  /** Whether the toast can be manually dismissed. Defaults to true (false for critical). */
  dismissible?: boolean
}

export function toast(props: ToastOptions) {
  cleanStaleDedupKeys()

  const key = dedupKey(props)
  const existing = recentToastKeys.get(key)

  // Duplicate within window → update existing instead of creating new
  if (existing) {
    const existingToast = toastState.find((t) => t.id === existing.id)
    if (existingToast) {
      // Reset the auto-dismiss timer
      const severity =
        props.severity ?? variantToSeverity(props.variant)
      const duration = resolveDuration(severity, props.duration)
      scheduleAutoDismiss(existing.id, duration)

      // Update timestamp so it doesn't get cleaned up
      existing.timestamp = Date.now()
      return existing.id
    }
  }

  // Create new toast
  const id = String(++toastIdCounter)
  const severity = props.severity ?? variantToSeverity(props.variant)
  const duration = resolveDuration(severity, props.duration)
  const dismissible = resolveDismissible(severity, props.dismissible)

  const newToast: Toast = {
    id,
    title: props.title,
    description: props.description,
    variant: props.variant,
    severity,
    duration: duration > 0 ? duration : undefined,
    dismissible,
    createdAt: Date.now(),
  }

  toastState = [...toastState, newToast]
  recentToastKeys.set(key, { id, timestamp: Date.now() })
  emitChange()

  // Schedule auto-dismiss
  scheduleAutoDismiss(id, duration)

  return id
}

export function dismissToast(id: string) {
  clearTimer(id)
  toastState = toastState.filter((t) => t.id !== id)
  emitChange()

  // Also remove from dedup map
  for (const [key, entry] of recentToastKeys) {
    if (entry.id === id) {
      recentToastKeys.delete(key)
      break
    }
  }
}

/** Pause auto-dismiss for a toast (on hover) */
export function pauseToastTimer(id: string) {
  clearTimer(id)
}

/** Resume auto-dismiss for a toast (on hover end) */
export function resumeToastTimer(id: string) {
  const t = toastState.find((toast) => toast.id === id)
  if (!t) return
  const duration = t.duration ?? resolveDuration(t.severity ?? "info")
  if (duration > 0) {
    scheduleAutoDismiss(id, duration)
  }
}

// ── Hook for the Toaster component ──

export function useToast() {
  const toasts = useSyncExternalStore(subscribe, getSnapshot)

  const dismiss = useCallback((id: string) => {
    dismissToast(id)
  }, [])

  const pause = useCallback((id: string) => {
    pauseToastTimer(id)
  }, [])

  const resume = useCallback((id: string) => {
    resumeToastTimer(id)
  }, [])

  const showToast = useCallback(
    (props: ToastOptions) => toast(props),
    [],
  )

  return { toasts, dismiss, pause, resume, toast: showToast }
}
