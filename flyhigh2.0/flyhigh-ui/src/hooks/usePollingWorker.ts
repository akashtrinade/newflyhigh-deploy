// ── usePollingWorker ──
// Hook wrapper around the Polling Worker.
// Replaces setInterval-based polling in WaitingForExpert.

import { useEffect, useRef, useCallback } from "react"
import { getApiBase } from "@/api/client"

interface PollingConfig {
  callRequestId: string
  intervalMs?: number
  timeoutMs?: number
}

interface PollingCallbacks {
  onAccepted: (roomId: string) => void
  onRejected: (reason: string) => void
  onTimeout: () => void
}

export function usePollingWorker(
  config: PollingConfig | null,
  callbacks: PollingCallbacks,
) {
  const workerRef = useRef<Worker | null>(null)
  const callbacksRef = useRef(callbacks)
  callbacksRef.current = callbacks

  const start = useCallback(() => {
    if (!config) return

    // Clean up any previous worker
    workerRef.current?.terminate()

    const worker = new Worker(
      new URL("../workers/polling.worker.ts", import.meta.url),
      { type: "module" },
    )

    worker.onmessage = (event: MessageEvent) => {
      const msg = event.data
      switch (msg.type) {
        case "accepted":
          callbacksRef.current.onAccepted(msg.roomId)
          break
        case "rejected":
          callbacksRef.current.onRejected(msg.reason)
          break
        case "timeout":
          callbacksRef.current.onTimeout()
          break
      }
    }

    worker.postMessage({
      type: "start",
      config: {
        callRequestId: config.callRequestId,
        apiBase: getApiBase(),
        intervalMs: config.intervalMs ?? 3000,
        timeoutMs: config.timeoutMs ?? 60_000,
      },
    })

    workerRef.current = worker
  }, [config])

  const stop = useCallback(() => {
    workerRef.current?.postMessage({ type: "stop" })
    workerRef.current = null
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      workerRef.current?.terminate()
    }
  }, [])

  return { start, stop }
}
