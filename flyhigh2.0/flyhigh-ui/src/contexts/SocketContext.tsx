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

const SIGNALING_SERVER = import.meta.env.VITE_WEBSOCKET_URL || "http://localhost:5000"

// ── Types (same as before, now exported from here) ──

export interface IncomingCallData {
  callRequestId: string
  clientName: string
  clientId: string
  expertId: string
}

export interface CallStatusUpdate {
  callRequestId: string
  action: "ACCEPT" | "REJECT"
  roomId?: string
  rejectReason?: string
}

export interface ChatMessage {
  sender: string
  senderName: string
  text: string
  timestamp: number
  isMine?: boolean
}

export interface CallRequestPayload {
  expertEmail: string
  callRequestId: string
  clientName: string
  expertId: string
  clientId: string
}

export interface CallResponsePayload {
  clientEmail: string
  callRequestId: string
  action: string
  roomId?: string
  rejectReason?: string
}

export interface CallEndedPayload {
  clientEmail?: string
  expertEmail?: string
}

type RTCSessionDesc = RTCSessionDescriptionInit

// ── Context shape ──

interface SocketContextValue {
  socketRef: React.MutableRefObject<Socket | null>
  isConnected: boolean
  incomingCall: IncomingCallData | null
  callStatusUpdate: CallStatusUpdate | null
  callEndedByOther: boolean
  chatMessages: ChatMessage[]
  remoteDisconnected: boolean
  clearIncomingCall: () => void
  clearCallStatusUpdate: () => void
  clearCallEndedByOther: () => void
  clearRemoteDisconnected: () => void
  clearChatMessages: () => void
  emitCallRequest: (data: CallRequestPayload) => void
  emitCallResponse: (data: CallResponsePayload) => void
  emitNotifyCallEnded: (data: CallEndedPayload) => void
  joinRoom: (roomId: string, userEmail: string, role: string) => void
  leaveRoom: () => void
  emitOffer: (offer: RTCSessionDesc, roomName: string) => void
  emitAnswer: (answer: RTCSessionDesc, roomName: string) => void
  emitIceCandidate: (candidate: RTCIceCandidateInit, roomName: string) => void
  emitEndCall: (roomName: string) => void
  emitChatMessage: (roomName: string, message: ChatMessage) => void
  onOffer: (cb: (offer: RTCSessionDesc) => void) => () => void
  onAnswer: (cb: (answer: RTCSessionDesc) => void) => () => void
  onIceCandidate: (cb: (candidate: RTCIceCandidateInit) => void) => () => void
  onCallEnded: (cb: () => void) => () => void
}

const SocketContext = createContext<SocketContextValue | null>(null)

// ── Provider ──

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  // Tracks the signaling room the user is in, so a socket.io reconnect can
  // re-join it — otherwise the server rejects all signaling after a reconnect
  // (room membership lives on the socket) and the call silently freezes.
  const currentRoomRef = useRef<{ roomId: string; userEmail: string; role: string } | null>(null)

  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null)
  const [callStatusUpdate, setCallStatusUpdate] = useState<CallStatusUpdate | null>(null)
  const [callEndedByOther, setCallEndedByOther] = useState(false)
  const MAX_CHAT_MESSAGES = 200
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [remoteDisconnected, setRemoteDisconnected] = useState(false)

  // ── Connect / Disconnect based on auth ──

  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
        setIsConnected(false)
      }
      return
    }

    const socket = io(SIGNALING_SERVER, {
      transports: ["websocket", "polling"],
      upgrade: true,
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    })

    socketRef.current = socket

    socket.on("connect", () => {
      setIsConnected(true)
      socket.emit("register-user", {
        email: user.email,
        role: user.role,
        userId: user.id || user.email,
        expertId: user.email,
      })
      // Re-join the active call room after a reconnect — the server requires
      // room membership for all signaling events (offer/answer/ICE/chat).
      const room = currentRoomRef.current
      if (room) {
        socket.emit("join-room", {
          roomId: room.roomId,
          userEmail: room.userEmail,
          role: room.role,
        })
      }
    })

    socket.on("disconnect", () => {
      setIsConnected(false)
    })

    socket.on("incoming-call", (data: IncomingCallData) => {
      setIncomingCall(data)
    })

    socket.on("call-status-update", (data: CallStatusUpdate) => {
      setCallStatusUpdate(data)
    })

    socket.on("call-ended-by-other", () => {
      setCallEndedByOther(true)
    })

    socket.on("chat-message", (message: ChatMessage) => {
      setChatMessages((prev) => {
        const updated = [...prev, message]
        return updated.length > MAX_CHAT_MESSAGES ? updated.slice(-MAX_CHAT_MESSAGES) : updated
      })
    })

    socket.on("user-disconnected", () => {
      setRemoteDisconnected(true)
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
      setIsConnected(false)
    }
  }, [user])

  // ── Clear helpers ──

  const clearIncomingCall = useCallback(() => setIncomingCall(null), [])
  const clearCallStatusUpdate = useCallback(() => setCallStatusUpdate(null), [])
  const clearCallEndedByOther = useCallback(() => setCallEndedByOther(false), [])
  const clearRemoteDisconnected = useCallback(() => setRemoteDisconnected(false), [])
  const clearChatMessages = useCallback(() => setChatMessages([]), [])

  // ── Emitters ──

  const emitCallRequest = useCallback((data: CallRequestPayload) => {
    socketRef.current?.emit("call-request", data)
  }, [])

  const emitCallResponse = useCallback((data: CallResponsePayload) => {
    socketRef.current?.emit("call-response", data)
  }, [])

  const emitNotifyCallEnded = useCallback((data: CallEndedPayload) => {
    socketRef.current?.emit("notify-call-ended", data)
  }, [])

  const joinRoom = useCallback(
    (roomId: string, userEmail: string, role: string) => {
      currentRoomRef.current = { roomId, userEmail, role }
      socketRef.current?.emit("join-room", { roomId, userEmail, role })
    },
    [],
  )

  const leaveRoom = useCallback(() => {
    currentRoomRef.current = null
  }, [])

  const emitOffer = useCallback((offer: RTCSessionDesc, roomName: string) => {
    socketRef.current?.emit("offer", { offer, roomName })
  }, [])

  const emitAnswer = useCallback((answer: RTCSessionDesc, roomName: string) => {
    socketRef.current?.emit("answer", { answer, roomName })
  }, [])

  const emitIceCandidate = useCallback(
    (candidate: RTCIceCandidateInit, roomName: string) => {
      socketRef.current?.emit("ice-candidate", { candidate, roomName })
    },
    [],
  )

  const emitEndCall = useCallback((roomName: string) => {
    socketRef.current?.emit("end-call", { roomName })
  }, [])

  const emitChatMessage = useCallback(
    (roomName: string, message: ChatMessage) => {
      socketRef.current?.emit("send-chat-message", { roomName, message })
    },
    [],
  )

  // ── WebRTC event listeners ──

  const onOffer = useCallback((cb: (offer: RTCSessionDesc) => void) => {
    socketRef.current?.on("offer", cb)
    return () => {
      socketRef.current?.off("offer", cb)
    }
  }, [])

  const onAnswer = useCallback((cb: (answer: RTCSessionDesc) => void) => {
    socketRef.current?.on("answer", cb)
    return () => {
      socketRef.current?.off("answer", cb)
    }
  }, [])

  const onIceCandidate = useCallback(
    (cb: (candidate: RTCIceCandidateInit) => void) => {
      socketRef.current?.on("ice-candidate", cb)
      return () => {
        socketRef.current?.off("ice-candidate", cb)
      }
    },
    [],
  )

  const onCallEnded = useCallback((cb: () => void) => {
    socketRef.current?.on("call-ended", cb)
    return () => {
      socketRef.current?.off("call-ended", cb)
    }
  }, [])

  // ── Context value ──

  const value: SocketContextValue = {
    socketRef,
    isConnected,
    incomingCall,
    callStatusUpdate,
    callEndedByOther,
    chatMessages,
    remoteDisconnected,
    clearIncomingCall,
    clearCallStatusUpdate,
    clearCallEndedByOther,
    clearRemoteDisconnected,
    clearChatMessages,
    emitCallRequest,
    emitCallResponse,
    emitNotifyCallEnded,
    joinRoom,
    leaveRoom,
    emitOffer,
    emitAnswer,
    emitIceCandidate,
    emitEndCall,
    emitChatMessage,
    onOffer,
    onAnswer,
    onIceCandidate,
    onCallEnded,
  }

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  )
}

export { SocketContext }
