import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  X,
  Clock,
  IndianRupee,
  ShieldCheck,
  Loader2,
  CheckCircle2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useRazorpay } from "@/hooks/useRazorpay"
import { usePaymentSocket } from "@/hooks/usePaymentSocket"
import { useToast } from "@/hooks/use-toast"

interface PaymentSidebarProps {
  interactionId: string
  expertName: string
  expertHourlyRate: number
  clientHourlyRate?: number      // Client-facing rate (expert rate + commission)
  recommendedDurationMin: number | null
  freeTrialRemainingSec: number
  isWarning: boolean
  isDanger: boolean
  onClose: () => void
  onPaymentComplete: () => void
}

const DURATIONS = [15, 30, 45, 60]

export default function PaymentSidebar({
  interactionId,
  expertName,
  expertHourlyRate,
  clientHourlyRate,
  recommendedDurationMin,
  freeTrialRemainingSec,
  isWarning,
  isDanger,
  onClose,
  onPaymentComplete,
}: PaymentSidebarProps) {
  const [selectedDuration, setSelectedDuration] = useState(
    recommendedDurationMin || 15,
  )
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)

  const { initiatePayment } = useRazorpay()
  const { emitSessionEvent } = usePaymentSocket()
  const { toast } = useToast()

  // Client-facing rate (with commission); fall back to expert rate if not provided
  const displayHourlyRate = clientHourlyRate ?? expertHourlyRate
  const consultationFee = displayHourlyRate * (selectedDuration / 60)
  const freeTimeFormatted = `${Math.floor(freeTrialRemainingSec / 60)}:${(freeTrialRemainingSec % 60).toString().padStart(2, "0")}`

  const handlePay = async () => {
    setIsProcessing(true)
    try {
      const result = await initiatePayment(
        interactionId,
        selectedDuration,
        expertName,
      )

      if (result === null) {
        // User dismissed checkout
        toast({
          title: "Payment not completed",
          description: "Please complete the payment to continue the session.",
          variant: "destructive",
        })
        return
      }

      if (result && result.phase === "PAID_SESSION") {
        setPaymentSuccess(true)
        emitSessionEvent(interactionId, "payment-completed")
        toast({
          title: "Payment Successful!",
          description: `Paid session started — ${selectedDuration} minutes`,
          variant: "success",
        })
        setTimeout(() => {
          onPaymentComplete()
        }, 1500)
      }
    } catch (err) {
      toast({
        title: "Payment Failed",
        description:
          err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: 380, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 380, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="absolute right-0 top-0 z-30 flex h-full w-[340px] flex-col border-l border-slate-700/40 bg-slate-900/95 shadow-2xl backdrop-blur-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700/40 px-5 py-4">
          <h3 className="flex items-center gap-2 font-semibold text-white">
            <IndianRupee className="size-4 text-indigo-400" />
            Session Payment
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-300"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Expert info */}
          <div className="rounded-xl border border-slate-700/40 bg-slate-800/50 p-4">
            <p className="text-sm font-medium text-slate-200">{expertName}</p>
            <p className="text-xs text-slate-400">
              Client price: ₹{displayHourlyRate.toFixed(0)}/hr
            </p>
          </div>

          {/* Free timer */}
          <div
            className={`rounded-xl border p-4 ${
              isDanger
                ? "border-red-500/30 bg-red-500/5"
                : isWarning
                  ? "border-amber-500/30 bg-amber-500/5"
                  : "border-slate-700/40 bg-slate-800/50"
            }`}
          >
            <div className="flex items-center gap-2">
              <Clock
                className={`size-4 ${
                  isDanger
                    ? "text-red-400"
                    : isWarning
                      ? "text-amber-400"
                      : "text-sky-400"
                }`}
              />
              <span className="text-sm text-slate-400">Free consultation</span>
            </div>
            <p
              className={`mt-1 text-2xl font-bold tabular-nums ${
                isDanger
                  ? "text-red-400"
                  : isWarning
                    ? "text-amber-400"
                    : "text-white"
              }`}
            >
              {freeTimeFormatted}
            </p>
            {isWarning && !isDanger && (
              <p className="mt-1 text-xs text-amber-400/70">
                Less than 1 minute remaining
              </p>
            )}
            {isDanger && (
              <p className="mt-1 text-xs font-medium text-red-400/80">
                ⚠ Session ends in 30 seconds!
              </p>
            )}
          </div>

          {/* Recommendation */}
          {recommendedDurationMin && (
            <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4">
              <p className="text-xs text-indigo-300/70">Expert recommends</p>
              <p className="text-lg font-semibold text-indigo-300">
                {recommendedDurationMin} minutes
              </p>
            </div>
          )}

          {/* Duration selector */}
          <div>
            <p className="mb-3 text-sm font-medium text-slate-300">
              Select Duration
            </p>
            <div className="grid grid-cols-2 gap-2">
              {DURATIONS.map((mins) => {
                const price = displayHourlyRate * (mins / 60)
                const isRecommended = mins === recommendedDurationMin
                const isSelected = mins === selectedDuration

                return (
                  <button
                    key={mins}
                    onClick={() => setSelectedDuration(mins)}
                    className={`rounded-xl border px-4 py-3 text-left transition-all ${
                      isSelected
                        ? "border-indigo-500/50 bg-indigo-500/10 ring-1 ring-indigo-500/30"
                        : "border-slate-700/40 bg-slate-800/50 hover:border-slate-600/60"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-sm font-medium ${
                          isSelected ? "text-indigo-300" : "text-slate-300"
                        }`}
                      >
                        {mins} min
                      </span>
                      {isRecommended && (
                        <Badge className="bg-indigo-500/20 text-[10px] text-indigo-300">
                          Rec
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      ₹{price.toFixed(0)}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Consultation Fee */}
          <Card className="border-slate-700/40 bg-slate-800/50 p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Consultation Fee
            </p>
            <p className="mt-2 text-2xl font-bold text-white">
              ₹{consultationFee.toFixed(2)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {selectedDuration} minute consultation
            </p>
          </Card>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-700/40 p-5 space-y-3">
          {paymentSuccess ? (
            <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500/10 px-4 py-3">
              <CheckCircle2 className="size-5 text-emerald-400" />
              <span className="text-sm font-medium text-emerald-300">
                Payment verified!
              </span>
            </div>
          ) : (
            <Button
              onClick={handlePay}
              disabled={isProcessing || expertHourlyRate <= 0}
              className="w-full gap-2 bg-indigo-600 py-5 text-sm font-semibold hover:bg-indigo-500"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <IndianRupee className="size-4" />
                  Continue & Pay ₹{consultationFee.toFixed(0)}
                </>
              )}
            </Button>
          )}

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-600">
            <ShieldCheck className="size-3" />
            Secured by Razorpay
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
