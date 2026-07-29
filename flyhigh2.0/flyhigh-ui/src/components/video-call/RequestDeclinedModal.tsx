import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import * as Dialog from "@radix-ui/react-dialog"
import { X, Frown, CalendarPlus, Search, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { searchExperts, type ExpertSummary } from "@/lib/expert-search"

interface RequestDeclinedModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  expertName: string
  reason: string
  category?: string
  subCategory?: string
}

export default function RequestDeclinedModal({
  open,
  onOpenChange,
  expertName,
  reason,
  category,
  subCategory,
}: RequestDeclinedModalProps) {
  const navigate = useNavigate()
  const [similarExperts, setSimilarExperts] = useState<ExpertSummary[]>([])
  const [loadingSimilar, setLoadingSimilar] = useState(false)

  useEffect(() => {
    if (!open) return

    const fetchSimilar = async () => {
      setLoadingSimilar(true)
      try {
        const params: Record<string, any> = { size: 3 }
        if (category) params.category = category
        if (subCategory) params.subCategory = subCategory
        const result = await searchExperts(params as any)
        // Filter out the declined expert
        setSimilarExperts(result.experts.filter((e) => e.name !== expertName))
      } catch {
        setSimilarExperts([])
      } finally {
        setLoadingSimilar(false)
      }
    }
    fetchSimilar()
  }, [open, category, subCategory, expertName])

  const handleBookSession = () => {
    onOpenChange(false)
    navigate("/search-experts")
  }

  const handleFindOthers = () => {
    const params = new URLSearchParams()
    if (category) params.set("category", category)
    if (subCategory) params.set("subCategory", subCategory)
    onOpenChange(false)
    navigate(`/search-experts?${params.toString()}`)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
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
                className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2"
              >
                <div className="relative overflow-hidden rounded-2xl border border-slate-700/60 bg-gradient-to-b from-slate-900 to-slate-950 p-6 shadow-2xl">
                  {/* Glassmorphism blurs */}
                  <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-amber-500/10 blur-3xl" />
                  <div className="absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-rose-500/10 blur-3xl" />

                  <div className="relative">
                    {/* Close */}
                    <Dialog.Close asChild>
                      <button className="absolute right-0 top-0 rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-300">
                        <X className="size-4" />
                      </button>
                    </Dialog.Close>

                    {/* Icon */}
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-400/20 to-rose-400/20"
                    >
                      <Frown className="size-8 text-amber-400" />
                    </motion.div>

                    {/* Content */}
                    <div className="mb-6 text-center">
                      <Dialog.Title className="text-xl font-bold text-white">
                        Consultation Declined
                      </Dialog.Title>
                      <p className="mt-2 text-sm text-slate-400">
                        <span className="font-semibold text-amber-300">{expertName}</span>{" "}
                        was unable to accept your request
                      </p>
                    </div>

                    {/* Reason card */}
                    <div className="mb-6 rounded-xl border border-slate-700/50 bg-slate-800/50 p-4">
                      <p className="mb-1 text-xs font-medium uppercase tracking-wider text-slate-500">
                        Reason
                      </p>
                      <p className="text-sm text-slate-300">{reason}</p>
                    </div>

                    {/* Actions */}
                    <div className="mb-6 flex gap-3">
                      <Button
                        variant="outline"
                        className="flex-1 gap-2 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
                        onClick={handleBookSession}
                      >
                        <CalendarPlus className="size-4" />
                        Book Session
                      </Button>
                      <Button
                        className="flex-1 gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-500 hover:to-purple-500"
                        onClick={handleFindOthers}
                      >
                        <Search className="size-4" />
                        Find Experts
                      </Button>
                    </div>

                    {/* Similar experts */}
                    {loadingSimilar && (
                      <div className="flex items-center justify-center py-4">
                        <div className="size-5 animate-spin rounded-full border-2 border-slate-600 border-t-white" />
                      </div>
                    )}
                    {similarExperts.length > 0 && !loadingSimilar && (
                      <div>
                        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-500">
                          Similar Experts Available
                        </p>
                        <div className="space-y-2">
                          {similarExperts.slice(0, 2).map((expert) => (
                            <button
                              key={expert.id}
                              onClick={() => {
                                onOpenChange(false)
                                navigate(`/expert-profile/${expert.id}`)
                              }}
                              className="flex w-full items-center justify-between rounded-xl border border-slate-700/50 bg-slate-800/30 p-3 text-left transition-all hover:border-slate-600 hover:bg-slate-800"
                            >
                              <div>
                                <p className="text-sm font-medium text-slate-200">{expert.name}</p>
                                <p className="text-xs text-slate-500">{expert.professionalTitle}</p>
                              </div>
                              <ArrowRight className="size-4 text-slate-500" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
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