import { useCallback, useEffect, useState } from "react"
import { motion } from "framer-motion"
import { MessageSquare, Star, User } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StatCard } from "@/shared/components/molecules/StatCard"
import { EmptyState } from "@/shared/components/atoms/EmptyState"
import { ErrorAlert } from "@/shared/components/atoms/ErrorAlert"
import { fetchMyReviews, submitReviewResponse } from "@/lib/expert-reviews"
import type { ExpertReview } from "@/types/expert"

// ── Constants ──

const REVIEWS_PER_PAGE = 10

// ── Helpers ──

function formatDate(isoString: string): string {
  if (!isoString) return "—"
  try {
    const d = new Date(isoString)
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  } catch {
    return isoString
  }
}

// ── Skeleton ──

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-slate-200 ${className ?? ""}`} />
  )
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <SkeletonBlock className="h-3 w-20" />
            <SkeletonBlock className="h-7 w-24" />
          </div>
          <SkeletonBlock className="size-10 rounded-xl" />
        </div>
      </CardContent>
    </Card>
  )
}

function ReviewCardSkeleton() {
  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-center gap-3">
          <SkeletonBlock className="size-9 rounded-full" />
          <SkeletonBlock className="h-4 w-32" />
        </div>
        <SkeletonBlock className="h-4 w-24" />
        <SkeletonBlock className="h-14 w-full" />
      </CardContent>
    </Card>
  )
}

// ── Page Component ──

export default function ExpertReviewsPage() {
  const [reviews, setReviews] = useState<ExpertReview[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [respondingTo, setRespondingTo] = useState<string | null>(null)
  const [responseText, setResponseText] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadReviews = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchMyReviews()
      setReviews(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reviews")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadReviews()
  }, [loadReviews])

  const handleSubmitResponse = async (callRequestId: string) => {
    if (!responseText.trim()) return
    setIsSubmitting(true)
    try {
      await submitReviewResponse(callRequestId, responseText.trim())
      setRespondingTo(null)
      setResponseText("")
      await loadReviews()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit response")
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Computed ──

  const totalReviews = reviews.length
  const averageRating =
    totalReviews > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
      : 0
  const respondedCount = reviews.filter((r) => r.expertResponse).length
  const responseRate = totalReviews > 0 ? Math.round((respondedCount / totalReviews) * 100) : 0

  const totalPages = Math.max(1, Math.ceil(totalReviews / REVIEWS_PER_PAGE))
  const paginatedReviews = reviews.slice(
    page * REVIEWS_PER_PAGE,
    (page + 1) * REVIEWS_PER_PAGE,
  )

  // Rating distribution
  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
    pct: totalReviews > 0 ? Math.round((reviews.filter((r) => r.rating === star).length / totalReviews) * 100) : 0,
  }))

  // ── Render ──

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="mx-auto max-w-4xl space-y-6 px-4 py-6 md:px-0"
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-950">My Reviews</h1>
        <p className="mt-1 text-sm text-slate-500">
          See what your clients are saying and respond to their feedback.
        </p>
      </div>

      {/* Error */}
      {error && <ErrorAlert message={error} onRetry={loadReviews} />}

      {/* Loading — Stat Cards */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
      )}

      {/* Stat Cards */}
      {!isLoading && !error && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Total Reviews"
            value={String(totalReviews)}
            icon={MessageSquare}
            color="bg-blue-50 text-blue-600"
          />
          <StatCard
            label="Average Rating"
            value={`${averageRating.toFixed(1)}/5.0`}
            icon={Star}
            color="bg-yellow-50 text-yellow-600"
          />
          <StatCard
            label="Response Rate"
            value={`${responseRate}%`}
            icon={MessageSquare}
            color="bg-green-50 text-green-600"
          />
        </div>
      )}

      {/* Rating Distribution */}
      {!isLoading && !error && totalReviews > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rating Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {distribution.map((d) => (
              <div key={d.star} className="flex items-center gap-3 text-sm">
                <span className="flex w-16 items-center gap-1 text-slate-600">
                  {d.star} <Star className="size-3.5 fill-amber-400 text-amber-400" />
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${d.pct}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="h-full rounded-full bg-amber-400"
                  />
                </div>
                <span className="w-10 text-right text-slate-500">{d.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Loading — Review Cards */}
      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }, (_, i) => (
            <ReviewCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && totalReviews === 0 && (
        <EmptyState
          icon={<Star className="size-8 text-slate-300" />}
          title="No reviews yet"
          description="Complete your first session to start earning reviews from clients."
        />
      )}

      {/* Review Cards */}
      {!isLoading && !error && totalReviews > 0 && (
        <div className="space-y-4">
          {paginatedReviews.map((review, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
            >
              <Card className="overflow-hidden">
                <CardContent className="p-5">
                  {/* Header: Avatar + Name + Stars + Date */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-200">
                        <User className="size-4 text-slate-500" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-slate-900">
                            {review.clientName}
                          </p>
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: 5 }, (_, i) => (
                              <Star
                                key={i}
                                className={`size-3.5 ${
                                  i < review.rating
                                    ? "fill-amber-400 text-amber-400"
                                    : "fill-slate-200 text-slate-200"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        {review.review && (
                          <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                            {review.review}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Badge variant="secondary" className="text-xs">
                        {review.rating}/5
                      </Badge>
                      <span className="text-xs text-slate-400">
                        {formatDate(review.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Expert Response Section */}
                  {review.expertResponse ? (
                    <div className="mt-4 rounded-md border border-blue-200 bg-blue-50/60 p-3">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-medium text-blue-700">Your response:</p>
                        {review.expertRespondedAt && (
                          <span className="text-xs text-blue-400">
                            {formatDate(review.expertRespondedAt)}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-slate-700">
                        {review.expertResponse}
                      </p>
                    </div>
                  ) : (
                    <div className="mt-4">
                      {respondingTo === review.callRequestId ? (
                        <div className="space-y-3">
                          <textarea
                            className="w-full rounded-lg border border-slate-200 p-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                            rows={3}
                            maxLength={2000}
                            placeholder="Write your response to this review..."
                            value={responseText}
                            onChange={(e) => setResponseText(e.target.value)}
                          />
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-400">
                              {responseText.length}/2000
                            </span>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={isSubmitting}
                                onClick={() => {
                                  setRespondingTo(null)
                                  setResponseText("")
                                }}
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                disabled={!responseText.trim() || isSubmitting}
                                onClick={() => handleSubmitResponse(review.callRequestId!)}
                              >
                                {isSubmitting ? "Submitting..." : "Submit Response"}
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setRespondingTo(review.callRequestId!)
                            setResponseText("")
                          }}
                        >
                          <MessageSquare className="mr-1.5 size-3.5" />
                          Respond to Review
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-slate-500">
                {page + 1} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page + 1 >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}
