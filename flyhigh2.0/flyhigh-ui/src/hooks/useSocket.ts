import { useContext } from "react"
import { SocketContext } from "@/contexts/SocketContext"
import type {
  IncomingCallData,
  CallStatusUpdate,
  ChatMessage,
  CallRequestPayload,
  CallResponsePayload,
  CallEndedPayload,
} from "@/contexts/SocketContext"

// Re-export types for backward compatibility
export type {
  IncomingCallData,
  CallStatusUpdate,
  ChatMessage,
  CallRequestPayload,
  CallResponsePayload,
  CallEndedPayload,
}

/**
 * Consumes the single socket connection from {@link SocketProvider}.
 * All components share the same socket and the same global state —
 * no duplicate connections, no lost incoming-call events on navigation.
 */
export function useSocket() {
  const ctx = useContext(SocketContext)
  if (!ctx) {
    throw new Error(
      "useSocket must be used within a <SocketProvider>. " +
        "Wrap your app with <SocketProvider> inside <AuthProvider>.",
    )
  }
  return ctx
}
