import { useState } from "react"
import { motion } from "framer-motion"
import { Star, Send, ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { api } from "@/api/client"

interface PostCallRatingProps {
  callRequestId: string
  onClose: () => void
}

export default function PostCallRating({ callRequestId, onClose }: PostCallRatingProps) {
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [review, setReview] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({
        title: "Please select a rating",
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
        title: "Rating submitted",
        description: "Thank you for your feedback!",
        variant: "success",
      })
    } catch (err) {
      toast({
        title: "Failed to submit rating",
        description: "Please try again",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
        >
          <Card className="w-full max-w-md p-8 text-center shadow-xl">
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
            <h2 className="mb-2 text-xl font-bold text-slate-900">Thank You!</h2>
            <p className="mb-2 text-sm text-slate-600">
              Your rating and review have been submitted successfully.
            </p>
            <p className="mb-6 text-xs text-slate-500">
              Your feedback helps us improve the experience for everyone.
            </p>
            <Button onClick={onClose} className="gap-2">
              <ChevronLeft className="size-4" />
              Return to Dashboard
            </Button>
          </Card>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
      >
        <Card className="w-full max-w-md p-8 shadow-xl">
          <div className="mb-6 text-center">
            <h2 className="mb-2 text-xl font-bold text-slate-900">How was your session?</h2>
            <p className="text-sm text-slate-600">
              Your feedback helps us improve. Rate your experience with the expert.
            </p>
          </div>

          {/* Star rating */}
          <div className="mb-6">
            <p className="mb-3 text-center text-sm font-medium text-slate-700">Rating</p>
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
              onClick={onClose}
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
                  Submit
                </>
              )}
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  )
}