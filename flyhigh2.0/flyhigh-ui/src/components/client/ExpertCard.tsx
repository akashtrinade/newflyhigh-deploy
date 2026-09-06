import { useState } from "react"
import { Link } from "react-router-dom"
import { Eye, Loader2, MessageCircle, Star } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useSocket } from "@/hooks/useSocket"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/hooks/use-toast"
import WaitingForExpert from "@/components/video-call/WaitingForExpert"
import { api } from "@/api/client"
import type { ExpertSummary } from "@/lib/expert-search"

type ExpertAvailability = ExpertSummary["availability"]

function availabilityStyles(status: ExpertAvailability) {
  if (status === "Online") return "bg-emerald-50 text-emerald-700 ring-emerald-100"
  return "bg-slate-100 text-slate-600 ring-slate-200"
}

export function ExpertCard({ expert }: { expert: ExpertSummary }) {
  const isOnline = expert.availability === "Online"
  const { user } = useAuth()
  const { emitCallRequest } = useSocket()
  const { toast } = useToast()

  const [connecting, setConnecting] = useState(false)
  const [callRequestId, setCallRequestId] = useState<string | null>(null)

  const handleConnectNow = async () => {
    if (!expert.userId || !user) {
      toast({
        title: "Cannot start call",
        description: "Missing user information.",
        variant: "destructive",
      })
      return
    }

    setConnecting(true)
    try {
      // Fetch expert's email for WebSocket notification
      let expertEmail = expert.userId // fallback to userId
      try {
        const emailData = await api.get<{ email?: string }>(
          `/video-call/expert/${expert.userId}/email`,
        )
        expertEmail = emailData.email || expertEmail
      } catch {
        // Ignore, use userId as fallback
      }

      // Create call request in backend
      const data = await api.post<{ id: string; message?: string }>(
        "/video-call/request",
        { expertId: expert.userId },
      )
      setCallRequestId(data.id)

      // Notify expert via WebSocket
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

  // Show waiting screen while connecting
  if (connecting && callRequestId) {
    return (
      <WaitingForExpert
        callRequestId={callRequestId}
        expertName={expert.name}
        expertEmail={expert.userId || ""}
        onCancel={handleCancelCall}
        expertCategory={expert.category}
        expertSubCategory={expert.subCategory}
      />
    )
  }

  return (
    <Card className="rounded-lg border-slate-200 shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-slate-950">{expert.name}</h3>
            <p className="mt-1 text-sm text-slate-600">{expert.professionalTitle}</p>
          </div>
          <span className={cn("rounded-full px-2 py-1 text-xs font-semibold ring-1", availabilityStyles(expert.availability))}>
            {expert.availability}
          </span>
        </div>

        <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
          <p><span className="font-medium text-slate-900">Category:</span> {expert.category}</p>
          <p><span className="font-medium text-slate-900">Sub Category:</span> {expert.subCategory}</p>
          <p><span className="font-medium text-slate-900">Experience:</span> {expert.experience} years</p>
          <p><span className="font-medium text-slate-900">Country:</span> {expert.country}</p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {expert.languages.map((language) => (
            <Badge key={language} variant="secondary" className="rounded-md">
              {language}
            </Badge>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="flex items-center gap-1 font-semibold text-slate-950">
              <Star className="size-4 fill-amber-400 text-amber-400" />
              {expert.rating.toFixed(1)}
            </span>
            <span className="text-slate-500">{expert.reviewCount} reviews</span>
          </div>
          <p className="text-sm font-semibold text-slate-950">₹{expert.sessionPrice.toFixed(0)}/hr</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="h-9 gap-2">
            <Link to={`/expert-profile/${expert.id}`}>
              <Eye className="size-4" />
              View Profile
            </Link>
          </Button>
          {isOnline && (
            <Button
              className="h-9 gap-2 bg-emerald-600 hover:bg-emerald-700"
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
        </div>
      </CardContent>
    </Card>
  )
}
