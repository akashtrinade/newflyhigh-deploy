import { useEffect, useState } from "react"
import { Link, useParams, useNavigate } from "react-router-dom"
import { AlertCircle, ArrowLeft, CalendarPlus, ChevronLeft, ChevronRight, Languages, MapPin, MessageCircle, RotateCcw, Star, Loader2, MessageSquare, User } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { fetchExpertById, type ExpertPublicProfile, type ExpertReview } from "@/lib/expert-search"
import { useSocket } from "@/hooks/useSocket"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/hooks/use-toast"
import WaitingForExpert from "@/components/video-call/WaitingForExpert"
import { api } from "@/api/client"

export default function ExpertProfileViewPage() {
  const { expertId } = useParams<{ expertId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { emitCallRequest } = useSocket()
  const { toast } = useToast()

  const [expert, setExpert] = useState<ExpertPublicProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [callRequestId, setCallRequestId] = useState<string | null>(null)

  // Reviews pagination
  const [showAllReviews, setShowAllReviews] = useState(false)
  const [reviewsPage, setReviewsPage] = useState(0)
  const PREVIEW_COUNT = 3
  const REVIEWS_PER_PAGE = 5

  const loadExpert = async () => {
    if (!expertId) return
    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchExpertById(expertId)
      setExpert(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load expert profile")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadExpert()
  }, [expertId])

  const handleConnectNow = async () => {
    if (!expertId || !expert?.userId || !user) {
      toast({
        title: "Cannot start call",
        description: "Missing user information.",
        variant: "destructive",
      })
      return
    }

    setConnecting(true)
    try {
      // First, fetch expert's email for socket notification
      let expertEmail = expert.userId // fallback to userId
      try {
        const emailData = await api.get<{ email?: string }>(
          `/video-call/expert/${expert.userId}/email`,
        )
        expertEmail = emailData.email || expertEmail
      } catch (e) {
        // Ignore, use userId as fallback
      }

      const data = await api.post<{ id: string; message?: string }>(
        "/video-call/request",
        { expertId: expert.userId },
      )
      setCallRequestId(data.id)

      // Notify expert via socket with their actual email
      emitCallRequest({
        expertEmail: expertEmail,
        callRequestId: data.id,
        clientName: user.fullName || user.firstName || "A Client",
        expertId: expert.userId,
        clientId: user.email,
      })

      toast({
        title: "Call Request Sent",
        description: "Waiting for the expert to respond...",
      })
    } catch (err: any) {
      toast({
        title: "Connection Failed",
        description: err.message || "Could not connect to the expert.",
        variant: "destructive",
      })
      setConnecting(false)
    }
  }

  const handleCancelCall = () => {
    setConnecting(false)
    setCallRequestId(null)
  }

  // Loading state
  if (isLoading) {
    return (
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="size-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#2563EB]" />
            <p className="text-sm text-slate-500">Loading expert profile...</p>
          </div>
        </div>
    )
  }

  // Error state
  if (error || !expert) {
    return (
        <div className="space-y-5">
          <Button asChild variant="ghost" className="gap-2 px-0 text-slate-600 hover:bg-transparent hover:text-slate-950">
            <Link to="/search-experts">
              <ArrowLeft className="size-4" />
              Back to Search
            </Link>
          </Button>
          <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
            <AlertCircle className="mx-auto mb-3 size-7 text-red-500" />
            <p className="font-semibold text-red-800">Failed to load expert profile</p>
            <p className="mt-1 text-sm text-red-600">{error || "Expert not found"}</p>
            <Button variant="outline" className="mt-4 gap-2" onClick={loadExpert}>
              <RotateCcw className="size-4" />
              Retry
            </Button>
          </div>
        </div>
    )
  }

  const isOnline = Boolean(expert.isOnline)
  const fullName = `${expert.firstName ?? ""} ${expert.lastName ?? ""}`.trim() || "Expert"
  const languages = expert.languages ?? []
  // Client sees the final price (expert rate + commission), NOT the expert's base earning
  const displayPrice = expert.clientHourlyRate ?? expert.hourlyRate ?? 0
  const experience = expert.yearsOfExperience ?? 0

  // Waiting screen
  if (connecting && callRequestId) {
    return (
      <WaitingForExpert
        callRequestId={callRequestId}
        expertName={fullName}
        expertEmail={expert.userId || ""}
        onCancel={handleCancelCall}
        expertCategory={expert.category || undefined}
        expertSubCategory={expert.subCategory || undefined}
      />
    )
  }

  return (
      <div className="space-y-5">
        <Button asChild variant="ghost" className="gap-2 px-0 text-slate-600 hover:bg-transparent hover:text-slate-950">
          <Link to="/search-experts">
            <ArrowLeft className="size-4" />
            Back to Search
          </Link>
        </Button>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div
                className={`mb-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
                  isOnline
                    ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                    : "bg-slate-100 text-slate-600 ring-slate-200"
                }`}
              >
                {isOnline ? "Online" : "Offline"}
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">{fullName}</h2>
              <p className="mt-2 text-base text-slate-600">{expert.professionalTitle}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {expert.category && <Badge variant="secondary" className="rounded-md">{expert.category}</Badge>}
                {expert.subCategory && <Badge variant="secondary" className="rounded-md">{expert.subCategory}</Badge>}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {isOnline && (
                <Button
                  className="h-10 gap-2 bg-emerald-600 hover:bg-emerald-700"
                  onClick={handleConnectNow}
                  disabled={connecting}
                >
                  {connecting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <MessageCircle className="size-4" />
                  )}
                  {connecting ? "Connecting..." : "Connect Now"}
                </Button>
              )}
              <Button className="h-10 gap-2 bg-slate-950 hover:bg-slate-800">
                <CalendarPlus className="size-4" />
                Book Session
              </Button>
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ProfileMetric label="Experience" value={`${experience} years`} />
          <ProfileMetric label="Hourly Rate" value={`₹${displayPrice.toFixed(0)}/hr`} />
          <ProfileMetric label="Rating" value={`${(expert.averageRating ?? 0).toFixed(1)} / 5`} icon={Star} />
          <ProfileMetric label="Reviews" value={`${expert.totalReviews ?? 0}`} />
        </div>

        <Card className="rounded-lg border-slate-200 shadow-sm">
          <CardContent className="grid gap-5 p-5 md:grid-cols-2">
            <div>
              <h3 className="font-semibold text-slate-950">Profile Summary</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {expert.bio || `${fullName} helps clients solve focused problems in ${expert.subCategory?.toLowerCase() ?? "their field"} with clear, practical guidance.`}
              </p>
            </div>
            <div className="space-y-3">
              <p className="flex items-center gap-2 text-sm text-slate-600">
                <MapPin className="size-4 text-slate-400" />
                {expert.country ?? "Not specified"}
              </p>
              <p className="flex items-start gap-2 text-sm text-slate-600">
                <Languages className="mt-0.5 size-4 text-slate-400" />
                {languages.length > 0 ? languages.join(", ") : "Not specified"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Client Reviews & Ratings */}
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="size-5 text-slate-700" />
              <h3 className="text-lg font-semibold text-slate-950">
                Client Reviews {expert.totalReviews != null && expert.totalReviews > 0 ? `(${expert.totalReviews})` : ""}
              </h3>
            </div>
            {expert.reviews && expert.reviews.length > PREVIEW_COUNT && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-slate-500 hover:text-slate-900"
                onClick={() => {
                  setShowAllReviews(!showAllReviews)
                  setReviewsPage(0)
                }}
              >
                {showAllReviews ? "Show Less" : `See All (${expert.reviews.length})`}
              </Button>
            )}
          </div>

          {!expert.reviews || expert.reviews.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
              <Star className="mx-auto mb-2 size-6 text-slate-300" />
              <p className="text-sm text-slate-500">No reviews yet</p>
              <p className="mt-1 text-xs text-slate-400">
                Reviews will appear here once clients rate their sessions with {fullName}.
              </p>
            </div>
          ) : (
            <>
              <ReviewList
                reviews={expert.reviews}
                showAll={showAllReviews}
                page={reviewsPage}
                previewCount={PREVIEW_COUNT}
                perPage={REVIEWS_PER_PAGE}
              />
              {showAllReviews && expert.reviews.length > REVIEWS_PER_PAGE && (
                <div className="mt-4 flex items-center justify-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 text-xs"
                    disabled={reviewsPage === 0}
                    onClick={() => setReviewsPage((p) => p - 1)}
                  >
                    <ChevronLeft className="size-3.5" />
                    Previous
                  </Button>
                  <span className="text-xs text-slate-500">
                    {reviewsPage + 1} / {Math.ceil(expert.reviews.length / REVIEWS_PER_PAGE)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 text-xs"
                    disabled={(reviewsPage + 1) * REVIEWS_PER_PAGE >= expert.reviews.length}
                    onClick={() => setReviewsPage((p) => p + 1)}
                  >
                    Next
                    <ChevronRight className="size-3.5" />
                  </Button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
  )
}

function ProfileMetric({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon?: typeof Star
}) {
  return (
    <Card className="rounded-lg border-slate-200 shadow-sm">
      <CardContent className="p-4">
        <p className="text-sm text-slate-500">{label}</p>
        <p className="mt-1 flex items-center gap-2 text-xl font-bold text-slate-950">
          {Icon && <Icon className="size-5 fill-amber-400 text-amber-400" />}
          {value}
        </p>
      </CardContent>
    </Card>
  )
}

function ReviewList({
  reviews,
  showAll,
  page,
  previewCount,
  perPage,
}: {
  reviews: ExpertReview[]
  showAll: boolean
  page: number
  previewCount: number
  perPage: number
}) {
  const displayedReviews = showAll
    ? reviews.slice(page * perPage, (page + 1) * perPage)
    : reviews.slice(0, previewCount)

  return (
    <div className="space-y-4">
      {displayedReviews.map((review, index) => (
        <div
          key={index}
          className="rounded-lg border border-slate-100 bg-slate-50/50 p-4 transition-colors hover:bg-slate-50"
        >
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
                {review.createdAt && (
                  <p className="mt-2 text-xs text-slate-400">
                    {new Date(review.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                )}
              </div>
            </div>
            <Badge variant="secondary" className="shrink-0 rounded-md text-xs">
              {review.rating}/5
            </Badge>
          </div>
        </div>
      ))}
    </div>
  )
}