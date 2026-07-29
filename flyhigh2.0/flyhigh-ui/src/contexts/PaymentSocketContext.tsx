import {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { io, type Socket } from "socket.io-client"
import { useAuth } from "./AuthContext"

const PAYMENT_SOCKET_URL = import.meta.env.VITE_PAYMENT_WEBSOCKET_URL || "http://localhost:8085"

// ── Types ──

export interface SessionEvent {
  eventType: "recommendation" | "payment-completed" | "session-extended" | "timer-expired"
  interactionId: string
  [key: string]: unknown
}

// ── Context shape ──

interface PaymentSocketContextValue {
  isConnected: boolean
  sessionEvent: SessionEvent | null
  clearSessionEvent: () => void
  joinSessionRoom: (interactionId: string) => void
  emitSessionEvent: (interactionId: string, eventType: string, payload?: Record<string, unknown>) => void
}

const PaymentSocketContext = createContext<PaymentSocketContextValue | null>(null)

// ── Provider ──

export function PaymentSocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [sessionEvent, setSessionEvent] = useState<SessionEvent | null>(null)

  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
        setIsConnected(false)
      }
      return
    }

    const socket = io(PAYMENT_SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    })

    socketRef.current = socket

    socket.on("connect", () => {
      setIsConnected(true)
    })

    socket.on("disconnect", () => {
      setIsConnected(false)
    })

    socket.on("session-event", (data: SessionEvent) => {
      setSessionEvent(data)
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
      setIsConnected(false)
    }
  }, [user])

  const clearSessionEvent = useCallback(() => setSessionEvent(null), [])

  const joinSessionRoom = useCallback((interactionId: string) => {
    socketRef.current?.emit("join-session", interactionId)
  }, [])

  const emitSessionEvent = useCallback(
    (interactionId: string, eventType: string, payload?: Record<string, unknown>) => {
      socketRef.current?.emit("session-event", {
        interactionId,
        eventType,
        ...(payload || {}),
      })
    },
    [],
  )

  const value: PaymentSocketContextValue = {
    isConnected,
    sessionEvent,
    clearSessionEvent,
    joinSessionRoom,
    emitSessionEvent,
  }

  return (
    <PaymentSocketContext.Provider value={value}>
      {children}
    </PaymentSocketContext.Provider>
  )
}

export { PaymentSocketContext }
