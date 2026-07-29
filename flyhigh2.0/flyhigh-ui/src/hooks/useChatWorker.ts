// ── useChatWorker ──
// Hook wrapper around the Chat Worker.
// Maintains message deduplication off the main thread.
// Used by VideoCallPage to avoid O(n) Set reconstruction on every new message.

import { useEffect, useRef, useState, useCallback } from "react"

interface ChatMessage {
  sender: string
  senderName: string
  text: string
  timestamp: number
  isMine?: boolean
}

export function useChatWorker() {
  const workerRef = useRef<Worker | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])

  useEffect(() => {
    const worker = new Worker(
      new URL("../workers/chat.worker.ts", import.meta.url),
      { type: "module" },
    )

    worker.onmessage = (event: MessageEvent) => {
      const msg = event.data
      if (msg.type === "new-messages") {
        setMessages((prev) => [...prev, ...msg.messages])
      }
    }

    workerRef.current = worker

    return () => {
      worker.terminate()
    }
  }, [])

  const addMessages = useCallback((msgs: ChatMessage[]) => {
    workerRef.current?.postMessage({ type: "add", messages: msgs })
  }, [])

  const clearMessages = useCallback(() => {
    workerRef.current?.postMessage({ type: "clear" })
    setMessages([])
  }, [])

  return { messages, addMessages, clearMessages }
}
