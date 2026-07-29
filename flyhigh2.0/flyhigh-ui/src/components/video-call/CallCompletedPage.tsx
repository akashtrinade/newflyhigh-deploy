import { useState, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { motion } from "framer-motion"
import { Star, Send, ChevronLeft, Clock, Calendar, User, DollarSign } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/hooks/use-toast"
import { api } from "@/api/client"

// ── Types ──

interface CallSummary {
  callRequestId: string
  peerName: string
  durationSeconds: number
  amount: number
  expertAmount: number
  dateTime: string
}

// ── Main Component ──

export default function CallCompletedPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const { toast } = useToast()

  const callRequestId = searchParams.get("callRequestId") || ""
  const peerName = searchParams.get("peerName") || "Participant"
  const durationSeconds = parseInt(searchParams.get("duration") || "0", 10)
  const clientAmount = parseFloat(searchParams.get("amount") || "0")
  const expertAmount = parseFloat(searchParams.get("expertAmount") || "0")
  const dateTime = searchParams.get("dateTime") || new Date().toLocaleString()
  const isExpert = user?.role === "EXPERT"

  // Rating state (client only)
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [review, setReview] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Load any existing rating data if re-visiting
  useEffect(() => {
    if (!callRequestId || !isExpert) return
    // Expert doesn't rate — just show summary
  }, [callRequestId, isExpert])

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    if (mins > 0) {
      return `${mins} min ${secs}s`
    }
    return `${secs}s`
  }

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({
        title: "Please select a rating",
        description: "Rate the expert before submitting.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      await api.post("/video-call/rating", {
        callRequestId,
        rating,
        review,
      })

      setSubmitted(true)
      toast({
        title: "Thank you!",
        description: "Your feedback has been submitted successfully.",
        variant: "success",
      })
    } catch {
      toast({
        title: "Failed to submit",
        description: "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBackToDashboard = () => {
    if (isExpert) {
      navigate("/expert/dashboard")
    } else {
      navigate("/client-dashboard")
    }
  }

  // ── Submitted / Expert view ──

  if (submitted || isExpert) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
        >
          <Card className="w-full max-w-md p-8 text-center shadow-xl">
            {submitted && (
              <motion.div
                initial={{ rotate: -20, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="mb-4"
              >
                <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100">
                  <svg className="size-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </motion.div>
            )}

            <h2 className="mb-2 text-xl font-bold text-slate-900">
              {submitted ? "Thank You!" : "Call Completed"}
            </h2>
            <p className="mb-6 text-sm text-slate-600">
              {submitted
                ? "Your rating and review have been submitted successfully."
                : `Your video consultation with ${peerName} has ended.`}
            </p>

            {/* Summary details */}
            <div className="mb-6 space-y-3 rounded-lg bg-slate-50 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-slate-500">
                  <User className="size-4" />
                  {isExpert ? "Client" : "Expert"}
                </span>
                <span className="font-medium text-slate-800">{peerName}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-slate-500">
                  <Clock className="size-4" />
                  Duration
                </span>
                <span className="font-medium text-slate-800">{formatDuration(durationSeconds)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-slate-500">
                  <DollarSign className="size-4" />
                  {isExpert ? "You Earned" : "Consultation Fee"}
                </span>
                <span className="font-medium text-slate-800">
                  {isExpert
                    ? (expertAmount > 0 ? `₹${expertAmount.toFixed(2)}` : "—")
                    : (clientAmount > 0 ? `₹${clientAmount.toFixed(2)}` : "—")}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-slate-500">
                  <Calendar className="size-4" />
                  Date & Time
                </span>
                <span className="font-medium text-slate-800">{dateTime}</span>
              </div>
            </div>

            <Button onClick={handleBackToDashboard} className="gap-2">
              <ChevronLeft className="size-4" />
              Back to Dashboard
            </Button>
          </Card>
        </motion.div>
      </div>
    )
  }

  // ── Client rating view ──

  return (
    <div className="flex min-h-svh items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
      >
        <Card className="w-full max-w-md p-8 shadow-xl">
          <div className="mb-4 text-center">
            <h2 className="mb-1 text-xl font-bold text-slate-900">Call Completed</h2>
            <p className="text-sm text-slate-600">
              Your consultation with <span className="font-medium">{peerName}</span> has ended.
            </p>
          </div>

          {/* Summary */}
          <div className="mb-6 space-y-2 rounded-lg bg-slate-50 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-slate-500">
                <Clock className="size-4" />
                Duration
              </span>
              <span className="font-medium text-slate-800">{formatDuration(durationSeconds)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-slate-500">
                <DollarSign className="size-4" />
                Consultation Fee
              </span>
              <span className="font-medium text-slate-800">
                {clientAmount > 0 ? `₹${clientAmount.toFixed(2)}` : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-slate-500">
                <Calendar className="size-4" />
                Date & Time
              </span>
              <span className="font-medium text-slate-800">{dateTime}</span>
            </div>
          </div>

          {/* Rating section */}
          <div className="mb-6 border-t border-slate-200 pt-6">
            <p className="mb-3 text-center text-sm font-medium text-slate-700">
              How was your session with {peerName}?
            </p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`size-8 ${
                      star <= (hoveredRating || rating)
                        ? "fill-amber-400 text-amber-400"
                        : "text-slate-300"
                    }`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="mt-2 text-center text-sm text-slate-500">
                {rating === 1 && "Poor"}
                {rating === 2 && "Fair"}
                {rating === 3 && "Good"}
                {rating === 4 && "Very Good"}
                {rating === 5 && "Excellent"}
              </p>
            )}
          </div>

          {/* Review text */}
          <div className="mb-6">
            <p className="mb-2 text-sm font-medium text-slate-700">
              Write a review (optional)
            </p>
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="Share your experience..."
              rows={4}
              className="w-full rounded-lg border border-slate-200 bg-white p-3 text-sm outline-none ring-1 ring-slate-200 transition-all placeholder:text-slate-400 focus:border-indigo-300 focus:ring-indigo-300"
            />
          </div>

          {/* Submit */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleBackToDashboard}
            >
              Skip
            </Button>
            <Button
              className="flex-1 gap-2 bg-indigo-600 hover:bg-indigo-700"
              onClick={handleSubmit}
              disabled={isSubmitting || rating === 0}
            >
              {isSubmitting ? (
                <>
                  <div className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="size-4" />
                  Submit Review
                </>
              )}
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  )
}
