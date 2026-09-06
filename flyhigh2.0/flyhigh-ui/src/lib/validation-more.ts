/**
 * Additional Zod validation schemas for non-payment API responses.
 * Split from validation.ts to keep the critical payment schemas isolated.
 */
import { z } from "zod"

// ── Expert Search ─────────────────────────────────────────────

export const ExpertSearchPageSchema = z.object({
  experts: z.array(z.object({
    id: z.string(),
    userId: z.string(),
    name: z.string(),
    professionalTitle: z.string().nullable().optional(),
    category: z.string().nullable().optional(),
    subCategory: z.string().nullable().optional(),
    experience: z.number().int().nullable().optional(),
    languages: z.array(z.string()).nullable().optional(),
    country: z.string().nullable().optional(),
    rating: z.number().nullable().optional(),
    reviewCount: z.number().int().nullable().optional(),
    sessionPrice: z.number().nullable().optional(),
    expertHourlyRate: z.number().nullable().optional(),
    availability: z.string().nullable().optional(),
    isOnline: z.boolean().nullable().optional(),
    status: z.string().nullable().optional(),
    lastSeen: z.string().nullable().optional(),
  })),
  totalElements: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  currentPage: z.number().int().nonnegative(),
  pageSize: z.number().int().positive(),
})

export const ExpertReviewSchema = z.object({
  callRequestId: z.string().nullable().optional(),
  clientName: z.string().nullable().optional(),
  rating: z.number().int().min(1).max(5),
  review: z.string().nullable().optional(),
  createdAt: z.string().nullable().optional(),
  expertResponse: z.string().nullable().optional(),
  expertRespondedAt: z.string().nullable().optional(),
})

export const ExpertPublicProfileSchema = z.object({
  id: z.string(),
  userId: z.string(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  fullName: z.string().nullable().optional(),
  professionalTitle: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  subCategory: z.string().nullable().optional(),
  yearsOfExperience: z.number().int().nullable().optional(),
  bio: z.string().nullable().optional(),
  hourlyRate: z.number().nullable().optional(),
  clientHourlyRate: z.number().nullable().optional(),
  phoneNumber: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  languages: z.array(z.string()).nullable().optional(),
  country: z.string().nullable().optional(),
  linkedIn: z.string().nullable().optional(),
  portfolio: z.string().nullable().optional(),
  github: z.string().nullable().optional(),
  averageRating: z.number().nullable().optional(),
  totalReviews: z.number().int().nullable().optional(),
  reviews: z.array(ExpertReviewSchema).nullable().optional(),
  isOnline: z.boolean().nullable().optional(),
  status: z.string().nullable().optional(),
  lastSeen: z.string().nullable().optional(),
  isApproved: z.boolean().nullable().optional(),
  profileExists: z.boolean().nullable().optional(),
  profileCompleted: z.boolean().nullable().optional(),
  createdAt: z.string().nullable().optional(),
  updatedAt: z.string().nullable().optional(),
})

// ── Dropdowns ─────────────────────────────────────────────────

export const DropdownOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
  parentValue: z.string().nullable().optional(),
  custom: z.boolean().nullable().optional(),
})

export const DropdownFieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  placeholder: z.string().nullable().optional(),
  allowCustom: z.boolean().nullable().optional(),
  multiSelect: z.boolean().nullable().optional(),
  dependsOn: z.string().nullable().optional(),
  options: z.array(DropdownOptionSchema).nullable().optional(),
})

export const DropdownCatalogResponseSchema = z.object({
  fields: z.array(DropdownFieldSchema).nullable().optional(),
  commissionPercent: z.number().optional(),
})

// ── Earnings ──────────────────────────────────────────────────

export const EarningsSummarySchema = z.object({
  availableBalance: z.number().nonnegative(),
  pendingBalance: z.number().nonnegative(),
  lifetimeEarnings: z.number().nonnegative(),
  platformCommission: z.number().nonnegative(),
  totalSessions: z.number().int().nonnegative(),
  averageRating: z.number().nonnegative(),
})

export const ExpertEarningSchema = z.object({
  id: z.string(),
  sessionDate: z.string().nullable().optional(),
  clientName: z.string().nullable().optional(),
  duration: z.number().int().nullable().optional(),
  clientPaid: z.number().nullable().optional(),
  platformFee: z.number().nullable().optional(),
  expertEarning: z.number().nullable().optional(),
  status: z.string(),
  payoutStatus: z.string().nullable().optional(),
})

export const EarningsPageSchema = z.object({
  earnings: z.array(ExpertEarningSchema),
  totalElements: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  currentPage: z.number().int().nonnegative(),
  pageSize: z.number().int().positive(),
})

// ── Call History ──────────────────────────────────────────────

export const CallHistoryItemSchema = z.object({
  id: z.string(),
  expertId: z.string().nullable().optional(),
  clientId: z.string().nullable().optional(),
  clientName: z.string().nullable().optional(),
  clientEmail: z.string().nullable().optional(),
  expertName: z.string().nullable().optional(),
  roomId: z.string().nullable().optional(),
  status: z.string(),
  rejectReason: z.string().nullable().optional(),
  createdAt: z.string().nullable().optional(),
  respondedAt: z.string().nullable().optional(),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  review: z.string().nullable().optional(),
  reviewSubmitted: z.boolean().nullable().optional(),
  feedbackPending: z.boolean().nullable().optional(),
  interactionId: z.string().nullable().optional(),
  totalPaidAmount: z.number().nullable().optional(),
  expertAmount: z.number().nullable().optional(),
  paymentStatus: z.string().nullable().optional(),
  durationMinutes: z.number().int().nullable().optional(),
})
