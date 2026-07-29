// ── useDataWorker ──
// Hook wrapper around the Data Worker.
// Offloads session sort/filter/partition to a Worker thread.
// Used by ExpertDashboard, ClientDashboard, MySessionsPage.

import { useEffect, useRef, useState, useCallback } from "react"
import type { CallHistoryItem } from "@/types/expert"

interface PartitionResult {
  buckets: {
    Completed: CallHistoryItem[]
    Cancelled: CallHistoryItem[]
  }
  stats: {
    total: number
    completed: number
    uniqueClients: number
    pending: number
  }
}

export function useDataWorker() {
  const workerRef = useRef<Worker | null>(null)
  const [result, setResult] = useState<PartitionResult | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    const worker = new Worker(
      new URL("../workers/data.worker.ts", import.meta.url),
      { type: "module" },
    )

    worker.onmessage = (event: MessageEvent) => {
      if (event.data.type === "partition-result") {
        setResult({
          buckets: event.data.buckets,
          stats: event.data.stats,
        })
        setIsProcessing(false)
      }
    }

    workerRef.current = worker

    return () => {
      worker.terminate()
    }
  }, [])

  const partitionSessions = useCallback((sessions: CallHistoryItem[]) => {
    setIsProcessing(true)
    workerRef.current?.postMessage({
      type: "partition-sessions",
      sessions,
    })
  }, [])

  return { result, isProcessing, partitionSessions }
}
