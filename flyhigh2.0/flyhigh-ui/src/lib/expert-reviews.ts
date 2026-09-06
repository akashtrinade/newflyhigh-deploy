/**
 * Expert reviews API — fetch my reviews and submit responses.
 */
import { api } from "@/api/client"
import type { ExpertReview } from "@/types/expert"

export async function fetchMyReviews(): Promise<ExpertReview[]> {
  return api.get<ExpertReview[]>("/video-call/my-reviews")
}

export async function submitReviewResponse(
  callRequestId: string,
  expertResponse: string,
): Promise<ExpertReview> {
  return api.post<ExpertReview>("/video-call/review-response", {
    callRequestId,
    expertResponse,
  })
}
