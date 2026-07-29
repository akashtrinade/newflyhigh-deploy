// ── Chat Message Dedup Worker ──
// Maintains canonical message list, deduplicates incoming messages,
// only sends new unique messages back to the main thread.

interface ChatMessage {
  sender: string
  senderName: string
  text: string
  timestamp: number
  isMine?: boolean
}

// Use a Map keyed by `${timestamp}-${sender}` for O(1) dedup lookup
const seen = new Map<string, ChatMessage>()

self.onmessage = (
  event: MessageEvent<
    | { type: "add"; messages: ChatMessage[] }
    | { type: "clear" }
    | { type: "get-all" }
  >,
) => {
  const msg = event.data

  switch (msg.type) {
    case "add": {
      const fresh: ChatMessage[] = []
      for (const m of msg.messages) {
        const key = `${m.timestamp}-${m.sender}`
        if (!seen.has(key)) {
          seen.set(key, m)
          fresh.push(m)
        }
      }
      if (fresh.length > 0) {
        self.postMessage({ type: "new-messages", messages: fresh })
      }
      break
    }

    case "clear":
      seen.clear()
      break

    case "get-all":
      self.postMessage({
        type: "all-messages",
        messages: [...seen.values()].sort((a, b) => a.timestamp - b.timestamp),
      })
      break
  }
}
