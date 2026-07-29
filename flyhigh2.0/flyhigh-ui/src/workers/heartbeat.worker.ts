// ── Heartbeat Worker ──
// Runs /auth/heartbeat POST every 60s off the main thread.
// Used by useHeartbeat hook for expert presence tracking.

let timerId: ReturnType<typeof setInterval> | null = null

interface HeartbeatConfig {
  apiBase: string
  intervalMs: number
}

self.onmessage = (
  event: MessageEvent<
    { type: "start"; config: HeartbeatConfig } | { type: "stop" }
  >,
) => {
  const msg = event.data

  if (msg.type === "stop") {
    if (timerId !== null) {
      clearInterval(timerId)
      timerId = null
    }
    self.close()
    return
  }

  if (msg.type === "start") {
    if (timerId !== null) clearInterval(timerId)

    const { apiBase, intervalMs } = msg.config

    const beat = () => {
      fetch(`${apiBase}/auth/heartbeat`, {
        method: "POST",
        credentials: "include",
      }).catch(() => {
        // silently ignore failures
      })
    }

    beat()
    timerId = setInterval(beat, intervalMs)
  }
}
