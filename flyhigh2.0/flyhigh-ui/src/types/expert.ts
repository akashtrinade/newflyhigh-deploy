// ── Expert-related types — single source of truth ──

export interface ExpertSummary {
  id: string
  userId: string
  name: string
  professionalTitle: string
  category: string
  subCategory: string
  experience: number
  languages: string[]
  country: string
  rating: number
  reviewCount: number
  sessionPrice: number          // Client-facing price (expert rate + platform commission)
  expertHourlyRate?: number     // Expert's base earning rate (for expert-only views)
  availability: "Online" | "Offline"
  isOnline: boolean
}

export interface ExpertSearchPage {
  experts: ExpertSummary[]
  totalElements: number
  totalPages: number
  currentPage: number
  pageSize: number
}

export interface ExpertSearchParams {
  q?: string
  category?: string
  subCategory?: string
  language?: string
  country?: string
  availability?: string
  rating?: string
  price?: string
  experience?: string
  sort?: string
  page?: number
  size?: number
}

export interface ExpertReview {
  callRequestId?: string | null
  clientName: string
  rating: number
  review: string
  createdAt: string
  expertResponse?: string | null
  expertRespondedAt?: string | null
}

export interface ExpertPublicProfile {
  id?: string | null
  userId?: string | null
  firstName?: string | null
  lastName?: string | null
  country?: string | null
  professionalTitle?: string | null
  category?: string | null
  subCategory?: string | null
  yearsOfExperience?: number | null
  bio?: string | null
  hourlyRate?: number | null
  clientHourlyRate?: number | null  // Client-facing price (expert rate + commission)
  phoneNumber?: string | null
  city?: string | null
  languages?: string[] | null
  linkedIn?: string | null
  portfolio?: string | null
  github?: string | null
  averageRating?: number | null
  totalReviews?: number | null
  reviews?: ExpertReview[] | null
  isOnline?: boolean | null
  isApproved?: boolean | null
  profileExists?: boolean | null
  profileCompleted?: boolean | null
  lastRateUpdatedAt?: string | null
}

export interface SaveExpertProfilePayload {
  firstName: string
  lastName: string
  country: string
  professionalTitle: string
  category: string
  subCategory: string
  yearsOfExperience: number
  bio: string
  hourlyRate: number
  phoneNumber: string
  city?: string | null
  languages: string[]
  linkedIn?: string | null
  portfolio?: string | null
  github?: string | null
}

export interface CallHistoryItem {
  id: string
  expertId?: string | null
  clientId?: string | null
  clientName?: string | null
  clientEmail?: string | null
  expertName?: string | null
  roomId?: string | null
  status: string
  rejectReason?: string | null
  createdAt?: string | null
  respondedAt?: string | null
  rating?: number | null
  review?: string | null
  topic?: string | null
  interactionId?: string | null
  totalPaidAmount?: number | null
  expertAmount?: number | null
  paymentStatus?: string | null
  durationMinutes?: number | null
}
