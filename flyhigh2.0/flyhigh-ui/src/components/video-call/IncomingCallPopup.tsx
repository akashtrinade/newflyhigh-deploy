import { useEffect, useState, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { Phone, PhoneOff, X } from "lucide-react"
import * as Avatar from "@radix-ui/react-avatar"
import { Button } from "@/components/ui/button"
import { useSocket } from "@/hooks/useSocket"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/hooks/use-toast"
import DeclineCallDialog from "./DeclineCallDialog"
import { api } from "@/api/client"

interface IncomingCallPopupProps {
  onClose?: () => void
}

export default function IncomingCallPopup({ onClose }: IncomingCallPopupProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { incomingCall, clearIncomingCall, emitCallResponse } = useSocket()
  const { toast } = useToast()
  const [isProcessing, setIsProcessing] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [showDeclineDialog, setShowDeclineDialog] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Play ringtone
  useEffect(() => {
    if (incomingCall && !dismissed) {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
        const oscillator = audioCtx.createOscillator()
        const gainNode = audioCtx.createGain()
        oscillator.connect(gainNode)
        gainNode.connect(audioCtx.destination)
        oscillator.frequency.value = 440
        oscillator.type = "sine"

        const playBeep = () => {
          gainNode.gain.value = 0.3
          setTimeout(() => { gainNode.gain.value = 0 }, 500)
        }
        playBeep()
        const beepInterval = setInterval(playBeep, 1500)
        oscillator.start()

        return () => {
          clearInterval(beepInterval)
          oscillator.stop()
          audioCtx.close()
        }
      } catch {
        // Audio not available
      }
    }
  }, [incomingCall, dismissed])

  const handleAccept = async () => {
    if (!incomingCall || isProcessing) return
    setIsProcessing(true)

    try {
      const data = await api.post<{ roomId?: string; interactionId?: string; message?: string }>(
        "/video-call/respond",
        {
          callRequestId: incomingCall.callRequestId,
          action: "ACCEPT",
        },
      )

      if (data.roomId) {
        const statusData = await api.get<{ clientEmail?: string }>(
          `/video-call/status/${incomingCall.callRequestId}`,
        )
        const clientEmail = statusData.clientEmail || ""

        emitCallResponse({
          clientEmail,
          callRequestId: incomingCall.callRequestId,
          action: "ACCEPT",
          roomId: data.roomId,
        })

        const interactionParam = data.interactionId ? `&interactionId=${data.interactionId}` : ""
        navigate(
          `/video-call?roomId=${data.roomId}&callRequestId=${incomingCall.callRequestId}&peerName=${encodeURIComponent(incomingCall.clientName)}${interactionParam}`,
        )
        clearIncomingCall()
      }
    } catch (err) {
      toast({
        title: "Failed to accept call",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
      setDismissed(true)
    }
  }

  const handleDecline = async (reason: string) => {
    if (!incomingCall) return
    setIsProcessing(true)
    setShowDeclineDialog(false)

    try {
      await api.post("/video-call/respond", {
        callRequestId: incomingCall.callRequestId,
        action: "REJECT",
        rejectReason: reason,
      })

      const statusData = await api.get<{ clientEmail?: string }>(
        `/video-call/status/${incomingCall.callRequestId}`,
      )

      emitCallResponse({
        clientEmail: statusData.clientEmail || "",
        callRequestId: incomingCall.callRequestId,
        action: "REJECT",
        rejectReason: reason,
      })

      toast({
        title: "Call declined",
        description: `You declined the call from ${incomingCall.clientName}.`,
      })
    } catch {
      // Ignore
    } finally {
      setIsProcessing(false)
      setDismissed(true)
      clearIncomingCall()
    }
  }

  const handleDismiss = () => {
    setDismissed(true)
    clearIncomingCall()
    onClose?.()
  }

  return (
    <>
      <AnimatePresence>
        {incomingCall && !dismissed && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed right-4 top-4 z-50 w-80"
          >
            {/* Premium glassmorphism card */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-700/60 bg-gradient-to-b from-slate-900 to-slate-950 p-5 shadow-2xl">
              <div className="absolute -right-16 -top-16 h-32 w-32 rounded-full bg-emerald-500/10 blur-3xl" />
              <div className="absolute -bottom-16 -left-16 h-32 w-32 rounded-full bg-indigo-500/10 blur-3xl" />

              <div className="relative">
                {/* Close button */}
                <button
                  onClick={handleDismiss}
                  className="absolute right-0 top-0 rounded-lg p-1 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-300"
                >
                  <X className="size-4" />
                </button>

                {/* Caller Avatar */}
                <div className="mb-4 text-center">
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="mx-auto mb-3"
                  >
                    <Avatar.Root className="mx-auto flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-600">
                      <Avatar.Fallback className="text-2xl font-bold text-white">
                        {incomingCall.clientName.charAt(0).toUpperCase()}
                      </Avatar.Fallback>
                    </Avatar.Root>
                  </motion.div>

                  <h3 className="text-lg font-bold text-white">Incoming Call</h3>
                  <p className="mt-1 text-sm text-emerald-300">
                    {incomingCall.clientName} is calling
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Video consultation request
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 gap-2 border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300"
                    onClick={() => setShowDeclineDialog(true)}
                    disabled={isProcessing}
                  >
                    <PhoneOff className="size-4" />
                    Decline
                  </Button>
                  <Button
                    className="flex-1 gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-emerald-500"
                    onClick={handleAccept}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <div className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <Phone className="size-4" />
                    )}
                    Accept
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Decline reason dialog */}
      {incomingCall && (
        <DeclineCallDialog
          open={showDeclineDialog}
          onOpenChange={setShowDeclineDialog}
          onConfirm={handleDecline}
          clientName={incomingCall.clientName}
        />
      )}
    </>
  )
}