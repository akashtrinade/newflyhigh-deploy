import { useEffect, useRef } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { getApiBase } from "@/api/client"

/**
 * Sends a POST /auth/heartbeat every 60 seconds for expert users.
 * Uses a Web Worker to keep the timer off the main thread.
 */
export function useHeartbeat() {
  const { user } = useAuth()
  const workerRef = useRef<Worker | null>(null)

  useEffect(() => {
    if (!user || user.role !== "EXPERT") return

    const worker = new Worker(
      new URL("../workers/heartbeat.worker.ts", import.meta.url),
      { type: "module" },
    )

    worker.postMessage({
      type: "start",
      config: {
        apiBase: getApiBase(),
        intervalMs: 60_000,
      },
    })

    workerRef.current = worker

    return () => {
      worker.postMessage({ type: "stop" })
      worker.terminate()
      workerRef.current = null
    }
  }, [user])
}
