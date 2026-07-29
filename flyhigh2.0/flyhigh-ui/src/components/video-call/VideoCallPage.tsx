import { useEffect, useState, useCallback, useRef } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MonitorOff,
  Maximize2,
  Minimize2,
  MessageSquare,
  X,
  Send,
  Wifi,
  WifiOff,
  Loader2,
  Clock,
  User,
  ChevronLeft,
  SignalHigh,
  SignalLow,
  Signal,
} from "lucide-react"
import * as Tooltip from "@radix-ui/react-tooltip"
import * as Avatar from "@radix-ui/react-avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/AuthContext"
import { useSocket } from "@/hooks/useSocket"
import { usePaymentSocket } from "@/hooks/usePaymentSocket"
import { useWebRTC } from "@/hooks/useWebRTC"
import { useChatWorker } from "@/hooks/useChatWorker"
import { useSessionTimer } from "@/hooks/useSessionTimer"
import { useToast } from "@/hooks/use-toast"
import { api } from "@/api/client"
import { recommendDuration } from "@/lib/payments"
import SessionTimerBadge from "@/components/video-call/SessionTimerBadge"
import PaymentSidebar from "@/components/video-call/PaymentSidebar"
import FloatingPaymentButton from "@/components/video-call/FloatingPaymentButton"
import ExtendSessionPrompt from "@/components/video-call/ExtendSessionPrompt"

// ── Types ──

interface ChatMessage {
  sender: string
  senderName: string
  text: string
  timestamp: number
  isMine?: boolean
}

// ── Main Component ──

export default function VideoCallPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const socket = useSocket()

  const callRequestId = searchParams.get("callRequestId") || ""
  const roomId = searchParams.get("roomId") || ""
  const peerName = searchParams.get("peerName") || "Participant"
  const interactionId = searchParams.get("interactionId") || ""
  const isExpert = user?.role === "EXPERT"
  const isClient = user?.role === "CLIENT"

  // All WebRTC state and controls from the hook
  const webrtc = useWebRTC(roomId, user?.email ?? "", user?.role ?? "")

  // Payment/session hooks
  const sessionTimer = useSessionTimer(interactionId || null)
  const paymentSocket = usePaymentSocket()
  const { toast } = useToast()

  // Fetch interactionId from callRequestId if not in URL params
  useEffect(() => {
    if (!interactionId && callRequestId) {
      api.get<{ interactionId?: string }>(`/video-call/session/${callRequestId}`)
        .then((data) => {
          if (data.interactionId) {
            // Update URL with interactionId
            const params = new URLSearchParams(searchParams)
            params.set("interactionId", data.interactionId)
            navigate(`/video-call?${params.toString()}`, { replace: true })
          }
        })
        .catch(() => {
          // Not critical — will retry on next render
        })
    }
  }, [interactionId, callRequestId])

  // Join payment socket room on mount
  useEffect(() => {
    if (interactionId) {
      paymentSocket.joinSessionRoom(interactionId)
    }
  }, [interactionId])

  // Listen for session events from payment socket
  useEffect(() => {
    if (paymentSocket.sessionEvent) {
      const { eventType } = paymentSocket.sessionEvent
      if (eventType === "payment-completed" || eventType === "session-extended") {
        sessionTimer.refresh()
      }
      if (eventType === "timer-expired") {
        sessionTimer.refresh()
      }
      paymentSocket.clearSessionEvent()
    }
  }, [paymentSocket.sessionEvent, sessionTimer, paymentSocket.clearSessionEvent])

  // Auto-end call when timer expires
  useEffect(() => {
    if (sessionTimer.state.phase === "FREE_SESSION_EXPIRED" ||
        (sessionTimer.state.phase === "COMPLETED" && sessionTimer.state.isPaid)) {
      // Auto-end the call after a short delay
      const timer = setTimeout(() => {
        handleEndCall()
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [sessionTimer.state.phase, sessionTimer.state.isPaid])

  // Auto-hide payment UI when session becomes paid or completed
  useEffect(() => {
    if (
      sessionTimer.state.phase === "PAID_SESSION" ||
      sessionTimer.state.phase === "COMPLETED" ||
      sessionTimer.state.phase === "FREE_SESSION_EXPIRED"
    ) {
      setPaymentSidebarState("hidden")
    }
  }, [sessionTimer.state.phase])

  // UI-only state
  const [showChat, setShowChat] = useState(false)
  const [chatMessage, setChatMessage] = useState("")
  const [paymentSidebarState, setPaymentSidebarState] = useState<
    "expanded" | "collapsed" | "hidden"
  >("expanded")
  const [showRecommendUI, setShowRecommendUI] = useState(false)

  // Chat messages — deduplication offloaded to Web Worker
  const { messages: chatMessages, addMessages, clearMessages } = useChatWorker()
  const [isHoveringControls, setIsHoveringControls] = useState(true)
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null)

  // Init call on mount
  useEffect(() => {
    if (!roomId || !user) return

    if (isExpert) {
      webrtc.answerCall()
    } else {
      webrtc.startCall()
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, user])

  // Sync chat messages from socket → dedup via Web Worker
  useEffect(() => {
    const msgs = socket.chatMessages
    if (msgs.length > 0) {
      addMessages(msgs)
    }
  }, [socket.chatMessages.length, addMessages])

  // Auto-hide controls
  const showControls = () => {
    setIsHoveringControls(true)
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
    controlsTimeoutRef.current = setTimeout(
      () => setIsHoveringControls(false),
      4000,
    )
  }

  // End call flow — emit socket events + API, then local cleanup.
  // Navigation to /call-completed is handled by the useEffect below.
  const handleEndCall = useCallback(async () => {
    socket.emitEndCall(roomId)
    if (callRequestId) {
      socket.emitNotifyCallEnded({
        clientEmail: isExpert ? "" : user?.email,
        expertEmail: isExpert ? user?.email : "",
      })
    }
    try {
      if (callRequestId) {
        await api.post("/video-call/end", { callRequestId })
      }
    } catch {
      // best-effort
    }
    webrtc.endCall()
  }, [roomId, callRequestId, user, isExpert, webrtc, socket])

  // Navigate to call-completed when the call ends (local or remote)
  useEffect(() => {
    if (webrtc.callEnded) {
      const duration = webrtc.callDuration
      const dateTime = new Date().toLocaleString()
      const clientAmount = sessionTimer.state.totalPaidAmount || 0
      const expertAmount = sessionTimer.state.expertAmount || 0
      const totalPaidMin = sessionTimer.state.totalPaidDurationMin || 0
      navigate(
        `/call-completed?callRequestId=${encodeURIComponent(callRequestId)}&peerName=${encodeURIComponent(peerName)}&duration=${duration}&amount=${clientAmount}&expertAmount=${expertAmount}&dateTime=${encodeURIComponent(dateTime)}&totalPaidMin=${totalPaidMin}&interactionId=${encodeURIComponent(interactionId)}`,
      )
    }
  }, [webrtc.callEnded, callRequestId, peerName, navigate, webrtc.callDuration, sessionTimer.state.totalPaidAmount, sessionTimer.state.totalPaidDurationMin, interactionId])

  // Chat send
  const sendChatMessage = useCallback(() => {
    if (!chatMessage.trim() || !roomId || !user) return
    const msg: ChatMessage = {
      sender: user.email,
      senderName: user.fullName || user.firstName || "You",
      text: chatMessage.trim(),
      timestamp: Date.now(),
      isMine: true,
    }
    socket.emitChatMessage(roomId, msg)
    addMessages([msg])
    setChatMessage("")
  }, [chatMessage, roomId, user, socket])

  // ── Derived ──

  const peerInitial = peerName.charAt(0).toUpperCase()
  const networkIcon = () => {
    if (webrtc.networkQuality === "good")
      return <SignalHigh className="size-3.5 text-emerald-400" />
    if (webrtc.networkQuality === "poor")
      return <SignalLow className="size-3.5 text-amber-400" />
    return <Signal className="size-3.5 text-red-400" />
  }
  const duration = webrtc.formatDuration(webrtc.callDuration)

  // ── Leave Screens (full-page, no video) ──

  if (webrtc.permissionError) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-slate-950 p-4">
        <Card className="w-full max-w-md border-slate-800 bg-slate-900 p-6 text-center">
          <VideoOff className="mx-auto mb-4 size-12 text-red-400" />
          <h2 className="mb-2 text-xl font-bold text-white">
            Permission Required
          </h2>
          <p className="mb-6 text-sm text-slate-400">
            {webrtc.permissionError}
          </p>
          <Button
            onClick={() => navigate(-1)}
            variant="outline"
            className="gap-2 border-slate-700 text-slate-300"
          >
            <ChevronLeft className="size-4" />
            Go Back
          </Button>
        </Card>
      </div>
    )
  }

  // ── Main Call UI ──

  return (
    <Tooltip.Provider delayDuration={300}>
      <div
        className="relative flex min-h-svh flex-col bg-slate-950"
        onMouseMove={showControls}
        onTouchStart={showControls}
      >
        {/* Main video area */}
        <div className="relative flex flex-1 items-center justify-center bg-gradient-to-b from-slate-900 via-slate-950 to-black">
          {/* Remote video */}
          <div className="absolute inset-0 flex items-center justify-center">
            <video
              ref={webrtc.remoteVideoRef}
              autoPlay
              playsInline
              className="h-full w-full object-cover"
            />

            {/* Loading overlay — video elements are always in the DOM so
                ontrack can fire and attach the remote stream even during
                loading. The spinner overlays until media setup completes. */}
            {webrtc.isLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-4 text-center">
                  <div className="relative">
                    <div className="size-20 rounded-full border-2 border-slate-800" />
                    <div className="absolute inset-0 size-20 animate-spin rounded-full border-2 border-t-emerald-500" />
                    <div className="absolute inset-3 flex items-center justify-center">
                      <Loader2 className="size-6 animate-spin text-emerald-400" />
                    </div>
                  </div>
                  <p className="text-lg font-medium text-white">Joining call...</p>
                  <p className="text-sm text-slate-500">
                    Please allow camera and microphone access
                  </p>
                </div>
              </div>
            )}

            {!webrtc.remoteStreamConnected && !webrtc.isLoading && (
              <div className="flex flex-col items-center gap-4 text-slate-600">
                <div className="flex size-24 items-center justify-center rounded-full bg-slate-800/50">
                  <User className="size-12" />
                </div>
                <div className="text-center">
                  <p className="text-xl font-medium text-slate-400">
                    {peerName}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {webrtc.connectionStatus === "connecting"
                      ? "Waiting for participant..."
                      : "Connecting..."}
                  </p>
                </div>
                {webrtc.connectionStatus === "connecting" && (
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        animate={{ y: [0, -6, 0] }}
                        transition={{
                          duration: 0.6,
                          repeat: Infinity,
                          delay: i * 0.2,
                        }}
                        className="size-2 rounded-full bg-indigo-500"
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Remote screen sharing indicator */}
          {webrtc.isRemoteScreenSharing && (
            <div className="absolute left-1/2 top-6 z-20 -translate-x-1/2">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 rounded-full bg-indigo-600/90 px-4 py-2 text-sm font-medium text-white shadow-lg backdrop-blur"
              >
                <Monitor className="size-4" />
                {peerName} is sharing their screen
              </motion.div>
            </div>
          )}

          {/* Gradient overlays */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-slate-950/80 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />

          {/* Top bar */}
          <AnimatePresence>
            {isHoveringControls && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between px-5 py-4"
              >
                <div className="flex items-center gap-3">
                  <Badge
                    variant="outline"
                    className="border-slate-700/60 bg-slate-900/80 text-xs backdrop-blur-sm"
                  >
                    {webrtc.connectionStatus === "connected" ? (
                      <>
                        <Wifi className="mr-1 size-3 text-emerald-400" />
                        <span className="text-emerald-300">Connected</span>
                      </>
                    ) : webrtc.connectionStatus === "connecting" ? (
                      <>
                        <Loader2 className="mr-1 size-3 animate-spin text-amber-400" />
                        <span className="text-amber-300">Connecting</span>
                      </>
                    ) : (
                      <>
                        <WifiOff className="mr-1 size-3 text-red-400" />
                        <span className="text-red-300">Disconnected</span>
                      </>
                    )}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="border-slate-700/60 bg-slate-900/80 text-xs backdrop-blur-sm"
                  >
                    <Clock className="mr-1 size-3 text-slate-300" />
                    <span className="text-slate-300">{duration}</span>
                  </Badge>
                  {interactionId && (
                    <SessionTimerBadge
                      phase={sessionTimer.state.phase}
                      formattedTime={
                        sessionTimer.state.isPaid
                          ? sessionTimer.formattedPaidTime
                          : sessionTimer.formattedFreeTime
                      }
                      isWarning={sessionTimer.isWarning}
                      isDanger={sessionTimer.isDanger}
                    />
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 rounded-full bg-slate-900/80 px-3 py-1.5 text-xs text-slate-400 backdrop-blur-sm">
                    {networkIcon()}
                    <span>
                      {webrtc.networkQuality === "good"
                        ? "Good"
                        : webrtc.networkQuality === "poor"
                          ? "Poor"
                          : "Offline"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-200">
                      {peerName}
                    </span>
                    <Avatar.Root className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600">
                      <Avatar.Fallback className="text-xs font-bold text-white">
                        {peerInitial}
                      </Avatar.Fallback>
                    </Avatar.Root>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Poor network warning */}
          {webrtc.networkQuality === "poor" &&
            webrtc.connectionStatus === "connected" && (
              <div className="absolute left-1/2 top-20 z-10 -translate-x-1/2">
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-full bg-amber-500/20 px-4 py-1.5 text-xs font-medium text-amber-300 backdrop-blur-sm"
                >
                  ⚠ Unstable connection — video quality may be reduced
                </motion.div>
              </div>
            )}

          {/* Self-view (PiP) */}
          <motion.div
            drag
            dragMomentum={false}
            className="absolute bottom-20 right-4 z-10 cursor-grab overflow-hidden rounded-2xl border-2 border-slate-700/60 shadow-2xl shadow-black/50 active:cursor-grabbing"
            style={{ width: 180, height: 135 }}
          >
            <video
              ref={webrtc.localVideoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
            />
            {!webrtc.isCameraOn && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                <div className="flex size-10 items-center justify-center rounded-full bg-slate-700">
                  <User className="size-5 text-slate-400" />
                </div>
              </div>
            )}
            <div className="absolute bottom-1.5 left-1.5 rounded-md bg-black/50 px-2 py-0.5 text-[10px] text-slate-300 backdrop-blur-sm">
              {user?.firstName || "You"}
            </div>
          </motion.div>

          {/* Bottom controls */}
          <AnimatePresence>
            {isHoveringControls && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute bottom-4 left-0 right-0 z-20 flex items-center justify-center"
              >
                <div className="flex items-center gap-1 rounded-2xl border border-slate-700/40 bg-slate-900/90 px-2 py-2 shadow-2xl shadow-black/30 backdrop-blur-xl">
                  <ControlButton
                    icon={webrtc.isMicOn ? Mic : MicOff}
                    label={webrtc.isMicOn ? "Mute" : "Unmute"}
                    active={webrtc.isMicOn}
                    danger={!webrtc.isMicOn}
                    onClick={webrtc.toggleMic}
                  />
                  <ControlButton
                    icon={webrtc.isCameraOn ? Video : VideoOff}
                    label={
                      webrtc.isCameraOn ? "Camera Off" : "Camera On"
                    }
                    active={webrtc.isCameraOn}
                    danger={!webrtc.isCameraOn}
                    onClick={webrtc.toggleCamera}
                  />
                  <div className="mx-1 h-8 w-px bg-slate-700/40" />
                  <ControlButton
                    icon={webrtc.isScreenSharing ? MonitorOff : Monitor}
                    label={
                      webrtc.isScreenSharing
                        ? "Stop Share"
                        : "Share Screen"
                    }
                    active={webrtc.isScreenSharing}
                    highlight={webrtc.isScreenSharing}
                    onClick={webrtc.toggleScreenShare}
                  />
                  <ControlButton
                    icon={showChat ? X : MessageSquare}
                    label={showChat ? "Close Chat" : "Chat"}
                    active={showChat}
                    highlight={showChat}
                    onClick={() => setShowChat(!showChat)}
                    badge={
                      chatMessages.length > 0
                        ? chatMessages.length
                        : undefined
                    }
                  />
                  <ControlButton
                    icon={webrtc.isFullScreen ? Minimize2 : Maximize2}
                    label={
                      webrtc.isFullScreen
                        ? "Exit Fullscreen"
                        : "Fullscreen"
                    }
                    active={false}
                    onClick={webrtc.toggleFullScreen}
                  />
                  <div className="mx-1 h-8 w-px bg-slate-700/40" />
                  <button
                    onClick={handleEndCall}
                    className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-600/30 transition-all hover:bg-red-500 hover:shadow-red-500/40 active:scale-95"
                  >
                    <PhoneOff className="size-4" />
                    <span className="hidden sm:inline">End Call</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Payment Sidebar (client only) */}
        {isClient && interactionId &&
          paymentSidebarState === "expanded" &&
          (sessionTimer.state.phase === "PAYMENT_PENDING" ||
           sessionTimer.state.phase === "FREE_SESSION") && (
          <PaymentSidebar
            interactionId={interactionId}
            expertName={peerName}
            expertHourlyRate={sessionTimer.state.expertHourlyRate}
            clientHourlyRate={sessionTimer.state.clientHourlyRate}
            recommendedDurationMin={sessionTimer.state.recommendedDurationMin}
            freeTrialRemainingSec={sessionTimer.state.freeTrialRemainingSec}
            isWarning={sessionTimer.isWarning}
            isDanger={sessionTimer.isDanger}
            onClose={() => setPaymentSidebarState("collapsed")}
            onPaymentComplete={() => {
              sessionTimer.refresh()
              setPaymentSidebarState("hidden")
            }}
          />
        )}

        {/* Floating Payment Button (collapsed state) */}
        {isClient && interactionId &&
          paymentSidebarState === "collapsed" &&
          (sessionTimer.state.phase === "PAYMENT_PENDING" ||
           sessionTimer.state.phase === "FREE_SESSION") && (
          <FloatingPaymentButton
            freeTrialRemainingSec={sessionTimer.state.freeTrialRemainingSec}
            isWarning={sessionTimer.isWarning}
            isDanger={sessionTimer.isDanger}
            phase={sessionTimer.state.phase}
            onClick={() => setPaymentSidebarState("expanded")}
          />
        )}

        {/* Extend Session Prompt */}
        {sessionTimer.state.showExtendPrompt && interactionId && (
          <ExtendSessionPrompt
            interactionId={interactionId}
            expertName={peerName}
            hourlyRate={sessionTimer.state.clientHourlyRate || sessionTimer.state.expertHourlyRate}
            onExtendComplete={() => sessionTimer.refresh()}
          />
        )}

        {/* Expert: Recommend Duration UI */}
        {isExpert && interactionId &&
          sessionTimer.state.phase === "FREE_SESSION" && (
          <div className="absolute bottom-24 left-1/2 z-20 -translate-x-1/2">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="rounded-xl border border-slate-700/40 bg-slate-900/95 px-4 py-3 shadow-2xl backdrop-blur-xl"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-300">Recommend duration:</span>
                {[15, 30, 45, 60].map((mins) => (
                  <button
                    key={mins}
                    onClick={async () => {
                      try {
                        await recommendDuration({
                          interactionId,
                          recommendedDurationMinutes: mins,
                        })
                        paymentSocket.emitSessionEvent(interactionId, "recommendation")
                        toast({
                          title: "Recommended!",
                          description: `${mins} minutes suggested to client.`,
                        })
                      } catch {
                        // Best effort
                      }
                    }}
                    className="rounded-lg border border-slate-700/40 bg-slate-800/50 px-3 py-1.5 text-xs font-medium text-slate-300 transition-all hover:border-indigo-500/40 hover:bg-indigo-500/10 hover:text-indigo-300"
                  >
                    {mins} min
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}

        {/* Chat panel */}
        <AnimatePresence>
          {showChat && (
            <motion.div
              initial={{ x: 380, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 380, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="absolute right-0 top-0 z-30 flex h-full w-[360px] flex-col border-l border-slate-800 bg-slate-900 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
                <h3 className="flex items-center gap-2 font-semibold text-white">
                  <MessageSquare className="size-4 text-indigo-400" />
                  In-Call Chat
                </h3>
                <button
                  onClick={() => setShowChat(false)}
                  className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-300"
                >
                  <X className="size-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatMessages.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <MessageSquare className="mb-3 size-10 text-slate-700" />
                    <p className="text-sm text-slate-500">No messages yet</p>
                    <p className="text-xs text-slate-600">
                      Start the conversation!
                    </p>
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex flex-col ${msg.isMine ? "items-end" : "items-start"}`}
                  >
                    <span className="mb-1 text-[11px] font-medium text-slate-500">
                      {msg.senderName}
                    </span>
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        msg.isMine
                          ? "rounded-tr-sm bg-gradient-to-r from-indigo-600 to-indigo-500 text-white"
                          : "rounded-tl-sm bg-slate-800 text-slate-200"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="border-t border-slate-800 p-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && sendChatMessage()
                    }
                    placeholder="Type a message..."
                    className="flex-1 rounded-xl border border-slate-700/60 bg-slate-800/50 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-all focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20"
                  />
                  <Button
                    size="icon"
                    className="h-10 w-10 shrink-0 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500"
                    onClick={sendChatMessage}
                    disabled={!chatMessage.trim()}
                  >
                    <Send className="size-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Tooltip.Provider>
  )
}

// ── Control Button (moved outside for clarity) ──

function ControlButton({
  icon: Icon,
  label,
  active,
  danger,
  highlight,
  onClick,
  badge,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  active?: boolean
  danger?: boolean
  highlight?: boolean
  onClick: () => void
  badge?: number
}) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <button
          onClick={onClick}
          className={`relative flex h-10 w-10 items-center justify-center rounded-xl transition-all active:scale-95 ${
            danger
              ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
              : highlight
                ? "bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30"
                : active
                  ? "text-slate-200 hover:bg-slate-700/50"
                  : "text-slate-400 hover:bg-slate-700/50 hover:text-slate-200"
          }`}
        >
          <Icon className="size-4.5" />
          {badge && badge > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-indigo-500 text-[9px] font-bold text-white">
              {badge}
            </span>
          )}
        </button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="top"
          sideOffset={6}
          className="z-50 rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-200 shadow-xl"
        >
          {label}
          <Tooltip.Arrow className="fill-slate-800" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}
