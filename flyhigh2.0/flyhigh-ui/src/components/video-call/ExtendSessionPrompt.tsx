import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Clock, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRazorpay } from "@/hooks/useRazorpay"
import { usePaymentSocket } from "@/hooks/usePaymentSocket"
import { useToast } from "@/hooks/use-toast"

interface ExtendSessionPromptProps {
  interactionId: string
  expertName: string
  hourlyRate: number
  onExtendComplete: () => void
}

const EXTEND_DURATIONS = [15, 30]

export default function ExtendSessionPrompt({
  interactionId,
  expertName,
  hourlyRate,
  onExtendComplete,
}: ExtendSessionPromptProps) {
  const [isExtending, setIsExtending] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  const { initiateExtension } = useRazorpay()
  const { emitSessionEvent } = usePaymentSocket()
  const { toast } = useToast()

  const handleExtend = async (minutes: number) => {
    setIsExtending(true)
    try {
      const result = await initiateExtension(interactionId, minutes, expertName)
      if (result && result.phase === "PAID_SESSION") {
        emitSessionEvent(interactionId, "session-extended")
        toast({
          title: "Session Extended!",
          description: `Added ${minutes} minutes to your session.`,
          variant: "success",
        })
        onExtendComplete()
      }
    } catch (err) {
      toast({
        title: "Extension Failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsExtending(false)
      setShowOptions(false)
    }
  }

  if (dismissed) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        className="absolute bottom-24 left-1/2 z-20 -translate-x-1/2"
      >
        <div className="rounded-2xl border border-amber-500/30 bg-slate-900/95 px-6 py-4 shadow-2xl backdrop-blur-xl">
          {!showOptions ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Clock className="size-5 text-amber-400" />
                <div>
                  <p className="text-sm font-medium text-white">
                    Need more time?
                  </p>
                  <p className="text-xs text-slate-400">
                    Less than 5 minutes remaining
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => setShowOptions(true)}
                  className="gap-1.5 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
                >
                  <Plus className="size-3.5" />
                  Extend
                </Button>
                <button
                  onClick={() => setDismissed(true)}
                  className="rounded-lg p-1.5 text-slate-600 transition-colors hover:text-slate-400"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-300">Extend by:</span>
              {EXTEND_DURATIONS.map((mins) => {
                const price = hourlyRate * (mins / 60)
                return (
                  <Button
                    key={mins}
                    size="sm"
                    disabled={isExtending}
                    onClick={() => handleExtend(mins)}
                    className="gap-1.5 bg-indigo-600 hover:bg-indigo-500"
                  >
                    {mins} min (₹{price.toFixed(0)})
                  </Button>
                )
              })}
              <button
                onClick={() => setShowOptions(false)}
                className="rounded-lg p-1.5 text-slate-600 transition-colors hover:text-slate-400"
              >
                <X className="size-4" />
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
