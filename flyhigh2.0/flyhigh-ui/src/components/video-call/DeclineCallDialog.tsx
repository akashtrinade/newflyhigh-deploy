import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import * as Dialog from "@radix-ui/react-dialog"
import { X, AlertTriangle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

const DECLINE_REASONS = [
  "Currently Busy",
  "In Another Session",
  "Not Available Right Now",
  "Outside My Expertise",
  "Technical Issue",
  "Other",
]

interface DeclineCallDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (reason: string) => Promise<void>
  clientName: string
}

export default function DeclineCallDialog({ open, onOpenChange, onConfirm, clientName }: DeclineCallDialogProps) {
  const [selectedReason, setSelectedReason] = useState<string>("")
  const [customReason, setCustomReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    const reason = selectedReason === "Other" ? customReason : selectedReason
    if (!reason.trim()) return

    setIsSubmitting(true)
    try {
      await onConfirm(reason)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenChange = (val: boolean) => {
    if (!val) {
      setSelectedReason("")
      setCustomReason("")
    }
    onOpenChange(val)
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2"
              >
                <div className="relative overflow-hidden rounded-2xl border border-slate-700/60 bg-gradient-to-b from-slate-900 to-slate-950 p-6 shadow-2xl">
                  {/* Glassmorphism accent */}
                  <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-red-500/10 blur-3xl" />
                  <div className="absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-orange-500/10 blur-3xl" />

                  <div className="relative">
                    {/* Header */}
                    <div className="mb-6 flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="flex size-10 items-center justify-center rounded-full bg-red-500/20">
                          <AlertTriangle className="size-5 text-red-400" />
                        </div>
                        <div>
                          <Dialog.Title className="text-lg font-semibold text-white">
                            Decline Consultation
                          </Dialog.Title>
                          <p className="mt-1 text-sm text-slate-400">
                            Provide a reason for declining{" "}
                            <span className="font-medium text-white">{clientName}</span>'s request
                          </p>
                        </div>
                      </div>
                      <Dialog.Close asChild>
                        <button className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-300">
                          <X className="size-4" />
                        </button>
                      </Dialog.Close>
                    </div>

                    {/* Decline reasons */}
                    <div className="mb-5 space-y-2">
                      {DECLINE_REASONS.map((reason) => (
                        <button
                          key={reason}
                          onClick={() => setSelectedReason(reason)}
                          className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition-all ${
                            selectedReason === reason
                              ? "border-red-500/50 bg-red-500/10 text-red-300 shadow-sm shadow-red-500/10"
                              : "border-slate-700/50 bg-slate-800/50 text-slate-300 hover:border-slate-600 hover:bg-slate-800"
                          }`}
                        >
                          {reason}
                        </button>
                      ))}
                    </div>

                    {/* Custom reason textarea */}
                    <AnimatePresence>
                      {selectedReason === "Other" && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mb-5 overflow-hidden"
                        >
                          <textarea
                            value={customReason}
                            onChange={(e) => setCustomReason(e.target.value)}
                            placeholder="Describe your reason..."
                            rows={3}
                            className="w-full resize-none rounded-xl border border-slate-700/50 bg-slate-800/50 p-3 text-sm text-white placeholder-slate-500 outline-none ring-1 ring-transparent transition-all focus:border-red-500/50 focus:ring-red-500/20"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Actions */}
                    <div className="flex gap-3">
                      <Dialog.Close asChild>
                        <Button variant="outline" className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white">
                          Cancel
                        </Button>
                      </Dialog.Close>
                      <Button
                        className="flex-1 gap-2 bg-red-600 text-white hover:bg-red-700"
                        onClick={handleSubmit}
                        disabled={!selectedReason || isSubmitting || (selectedReason === "Other" && !customReason.trim())}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          "Decline Call"
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}