import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { Loader2, Phone, X, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useSocket } from "@/hooks/useSocket"
import { usePollingWorker } from "@/hooks/usePollingWorker"
import RequestDeclinedModal from "./RequestDeclinedModal"
import { api } from "@/api/client"

interface WaitingForExpertProps {
  callRequestId: string
  expertName: string
  expertEmail: string
  onCancel: () => void
  expertCategory?: string
  expertSubCategory?: string
}

export default function WaitingForExpert({
  callRequestId,
  expertName,
  expertEmail,
  onCancel,
  expertCategory,
  expertSubCategory,
}: WaitingForExpertProps) {
  const navigate = useNavigate()
  const { callStatusUpdate, clearCallStatusUpdate } = useSocket()
  const [isCancelling, setIsCancelling] = useState(false)
  const [timeoutReached, setTimeoutReached] = useState(false)
  const [declinedData, setDeclinedData] = useState<{ reason: string } | null>(null)
  const [showDeclinedModal, setShowDeclinedModal] = useState(false)

  // Poll for status updates via Web Worker (backup / fallback for socket)
  const { start: startPolling, stop: stopPolling } = usePollingWorker(
    callRequestId ? { callRequestId } : null,
    {
      onAccepted: (roomId) => {
        navigate(
          `/video-call?roomId=${roomId}&callRequestId=${callRequestId}&peerName=${encodeURIComponent(expertName)}`,
        )
      },
      onRejected: (reason) => {
        setDeclinedData({ reason })
        setShowDeclinedModal(true)
      },
      onTimeout: () => {
        setTimeoutReached(true)
      },
    },
  )

  useEffect(() => {
    if (callRequestId) {
      startPolling()
    }
    return () => stopPolling()
  }, [callRequestId, startPolling, stopPolling])

  // Listen for real-time call status updates via socket
  useEffect(() => {
    if (!callStatusUpdate) return

    if (callStatusUpdate.action === "ACCEPT" && callStatusUpdate.roomId) {
      clearCallStatusUpdate()
      navigate(
        `/video-call?roomId=${callStatusUpdate.roomId}&callRequestId=${callRequestId}&peerName=${encodeURIComponent(expertName)}`,
      )
    } else if (callStatusUpdate.action === "REJECT") {
      clearCallStatusUpdate()
      setDeclinedData({
        reason: callStatusUpdate.rejectReason || "The expert declined your request.",
      })
      setShowDeclinedModal(true)
    }
  }, [callStatusUpdate, clearCallStatusUpdate, callRequestId, expertName, navigate])

  const handleCancel = async () => {
    setIsCancelling(true)
    try {
      await api.post("/video-call/respond", {
        callRequestId,
        action: "REJECT",
        rejectReason: "Client cancelled",
      })
    } catch {
      // Ignore
    }
    onCancel()
  }

  if (timeoutReached) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-gradient-to-br from-slate-950 to-slate-900 p-4">
        <Card className="w-full max-w-md border-slate-800 bg-slate-900 p-8 text-center shadow-xl">
          <AlertCircle className="mx-auto mb-4 size-12 text-amber-500" />
          <h2 className="mb-2 text-xl font-bold text-white">No Response</h2>
          <p className="mb-2 text-sm text-slate-400">
            {expertName} did not respond to your call request.
          </p>
          <p className="mb-6 text-xs text-slate-500">
            The expert may be unavailable. Try reaching out again later.
          </p>
          <Button onClick={onCancel} variant="outline" className="gap-2 border-slate-700 text-slate-300">
            <X className="size-4" />
            Go Back
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <>
      <div className="flex min-h-svh items-center justify-center bg-gradient-to-br from-slate-950 to-slate-900 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
        >
          <Card className="w-full max-w-md border-slate-800 bg-slate-900 p-8 text-center shadow-xl">
            {/* Animated phone icon */}
            <motion.div
              animate={{ scale: [1, 1.1, 1], rotate: [0, -10, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="mx-auto mb-6"
            >
              <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
                <Phone className="size-10 text-indigo-400" />
              </div>
            </motion.div>

            <h2 className="mb-2 text-xl font-bold text-white">Connecting to {expertName}</h2>
            <p className="mb-6 text-sm text-slate-400">
              Waiting for the expert to accept your call request...
            </p>

            {/* Loading dots */}
            <div className="mb-8 flex items-center justify-center gap-2">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.2 }}
                  className="size-2.5 rounded-full bg-indigo-500"
                />
              ))}
            </div>

            <Button
              variant="outline"
              className="gap-2 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
              onClick={handleCancel}
              disabled={isCancelling}
            >
              {isCancelling ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
              Cancel Request
            </Button>
          </Card>
        </motion.div>
      </div>

      {/* Declined modal */}
      <RequestDeclinedModal
        open={showDeclinedModal}
        onOpenChange={(open) => {
          setShowDeclinedModal(open)
          if (!open) onCancel()
        }}
        expertName={expertName}
        reason={declinedData?.reason || "The expert declined your request."}
        category={expertCategory}
        subCategory={expertSubCategory}
      />
    </>
  )
}