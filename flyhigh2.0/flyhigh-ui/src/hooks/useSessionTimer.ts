import { useState, useEffect, useRef, useCallback } from "react"
import { getSessionState } from "@/lib/payments"
import type { SessionTimerState, SessionStateResponse } from "@/types/payment"

const POLL_INTERVAL_MS = 2000
const LOCAL_TICK_MS = 1000

interface UseSessionTimerReturn {
  state: SessionTimerState
  formattedFreeTime: string
  formattedPaidTime: string
  isWarning: boolean  // < 60s remaining in free trial
  isDanger: boolean   // < 30s remaining in free trial
  refresh: () => void
}

export function useSessionTimer(interactionId: string | null): UseSessionTimerReturn {
  const [state, setState] = useState<SessionTimerState>({
    phase: "FREE_SESSION",
    freeTrialRemainingSec: 300,
    paidSessionRemainingSec: 0,
    totalPaidDurationMin: 0,
    elapsedPaidSeconds: 0,
    recommendedDurationMin: null,
    isPaid: false,
    showExtendPrompt: false,
    expertHourlyRate: 0,
    clientHourlyRate: 0,
    totalPaidAmount: null,
    expertAmount: null,
    commissionAmount: null,
    commissionPercent: null,
  })

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const tickTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastServerStateRef = useRef<SessionStateResponse | null>(null)

  const mapState = useCallback((s: SessionStateResponse): SessionTimerState => ({
    phase: s.phase,
    freeTrialRemainingSec: s.freeTrialRemainingSec,
    paidSessionRemainingSec: s.paidSessionRemainingSec,
    totalPaidDurationMin: s.totalPaidDurationMin,
    elapsedPaidSeconds: s.elapsedPaidSeconds,
    recommendedDurationMin: s.recommendedDurationMin,
    isPaid: s.phase === "PAID_SESSION",
    showExtendPrompt: s.showExtendPrompt,
    expertHourlyRate: s.expertHourlyRate,
    clientHourlyRate: s.clientHourlyRate,
    totalPaidAmount: s.totalPaidAmount,
    expertAmount: s.expertAmount,
    commissionAmount: s.commissionAmount,
    commissionPercent: s.commissionPercent,
  }), [])

  const poll = useCallback(async () => {
    if (!interactionId) return
    try {
      const data = await getSessionState(interactionId)
      lastServerStateRef.current = data
      setState(mapState(data))
    } catch {
      // Keep last known state on error
    }
  }, [interactionId, mapState])

  // Poll server every 2 seconds
  useEffect(() => {
    if (!interactionId) return

    // Immediate first poll
    poll()

    pollTimerRef.current = setInterval(poll, POLL_INTERVAL_MS)

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current)
        pollTimerRef.current = null
      }
    }
  }, [interactionId, poll])

  // Local countdown tick every 1 second (between polls)
  useEffect(() => {
    tickTimerRef.current = setInterval(() => {
      setState((prev) => {
        const next = { ...prev }

        if (next.freeTrialRemainingSec > 0) {
          next.freeTrialRemainingSec = Math.max(0, next.freeTrialRemainingSec - 1)
        }

        if (next.isPaid && next.paidSessionRemainingSec > 0) {
          next.paidSessionRemainingSec = Math.max(0, next.paidSessionRemainingSec - 1)
          next.elapsedPaidSeconds = Math.max(0, next.elapsedPaidSeconds + 1)
        }

        return next
      })
    }, LOCAL_TICK_MS)

    return () => {
      if (tickTimerRef.current) {
        clearInterval(tickTimerRef.current)
        tickTimerRef.current = null
      }
    }
  }, [])

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  return {
    state,
    formattedFreeTime: formatTime(state.freeTrialRemainingSec),
    formattedPaidTime: formatTime(state.paidSessionRemainingSec),
    isWarning: state.freeTrialRemainingSec <= 60 && state.freeTrialRemainingSec > 30,
    isDanger: state.freeTrialRemainingSec <= 30,
    refresh: poll,
  }
}
