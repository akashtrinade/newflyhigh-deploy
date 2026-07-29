// ── Polling Worker ──
// Runs HTTP polling off the main thread. Posts back only on status change.
// Used by WaitingForExpert to poll /video-call/status/:callRequestId every 3s.

interface PollConfig {
  callRequestId: string
  apiBase: string
  intervalMs: number
  timeoutMs: number
}

let timerId: ReturnType<typeof setInterval> | null = null
let timeoutId: ReturnType<typeof setTimeout> | null = null

self.onmessage = (event: MessageEvent<{ type: "start"; config: PollConfig } | { type: "stop" }>) => {
  const msg = event.data

  if (msg.type === "stop") {
    cleanup()
    return
  }

  if (msg.type === "start") {
    startPolling(msg.config)
  }
}

function cleanup() {
  if (timerId !== null) {
    clearInterval(timerId)
    timerId = null
  }
  if (timeoutId !== null) {
    clearTimeout(timeoutId)
    timeoutId = null
  }
  self.close()
}

async function startPolling(config: PollConfig) {
  cleanup()

  const { callRequestId, apiBase, intervalMs, timeoutMs } = config
  const url = `${apiBase}/video-call/status/${callRequestId}`

  // Timeout: stop polling after timeoutMs
  timeoutId = setTimeout(() => {
    self.postMessage({ type: "timeout" })
    cleanup()
  }, timeoutMs)

  // Poll every intervalMs
  const poll = async () => {
    try {
      const res = await fetch(url, { credentials: "include" })
      if (!res.ok) return

      const data: { status: string; roomId?: string; rejectReason?: string } = await res.json()

      if (data.status === "ACCEPTED" && data.roomId) {
        self.postMessage({ type: "accepted", roomId: data.roomId })
        cleanup()
      } else if (data.status === "REJECTED") {
        self.postMessage({
          type: "rejected",
          reason: data.rejectReason || "The expert declined your request.",
        })
        cleanup()
      }
    } catch {
      // Silently ignore polling errors
    }
  }

  // Run immediately, then on interval
  poll()
  timerId = setInterval(poll, intervalMs)
}
