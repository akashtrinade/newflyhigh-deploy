import { api } from "@/api/client"
import type {
  EarningsSummary,
  EarningsPage,
  EarningsFilters,
  ExpertPayout,
  PayoutDetails,
  PayoutDetailsInput,
} from "@/types/earnings"
import { z } from "zod"
import { EarningsSummarySchema, EarningsPageSchema } from "@/lib/validation-more"

/** Wrapper for endpoints returning { success, data } */
const EarningsSummaryWrapper = z.object({
  success: z.boolean(),
  data: EarningsSummarySchema,
})

const EarningsPageWrapper = z.object({
  success: z.boolean(),
  data: EarningsPageSchema,
})

const ExpertPayoutSchema = z.object({
  id: z.string(),
  payoutAmount: z.number().nullable().optional(),
  status: z.string(),
  gatewayReferenceId: z.string().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  earningCount: z.number().int().nullable().optional(),
  accountNumber: z.string().nullable().optional(),
  upiId: z.string().nullable().optional(),
  createdAt: z.string().nullable().optional(),
  processedAt: z.string().nullable().optional(),
})

const PayoutDetailsSchema = z.object({
  accountHolderName: z.string().nullable().optional(),
  accountNumber: z.string().nullable().optional(),
  accountNumberLast4: z.string().nullable().optional(),
  ifsc: z.string().nullable().optional(),
  upiId: z.string().nullable().optional(),
  verificationStatus: z.string().nullable().optional(),
  verificationNote: z.string().nullable().optional(),
})

/**
 * Fetches the aggregated earnings summary for the expert dashboard.
 */
export async function fetchEarningsSummary(): Promise<EarningsSummary> {
  return api
    .get<{ success: boolean; data: EarningsSummary }>(
      "/expert/earnings/summary",
      undefined,
      { schema: EarningsSummaryWrapper },
    )
    .then((res) => res.data)
}

/**
 * Fetches paginated earnings history with optional filters.
 */
export async function fetchEarningsHistory(
  filters: EarningsFilters = {},
): Promise<EarningsPage> {
  return api
    .get<{ success: boolean; data: EarningsPage }>(
      "/expert/earnings/history",
      {
        page: filters.page ?? 0,
        size: filters.size ?? 20,
        status: filters.status,
        fromDate: filters.fromDate,
        toDate: filters.toDate,
        search: filters.search,
      },
      { schema: EarningsPageWrapper },
    )
    .then((res) => res.data)
}

/**
 * Fetches the expert's withdrawal (payout) history.
 */
export async function fetchPayouts(): Promise<ExpertPayout[]> {
  return api
    .get<{ success: boolean; data: ExpertPayout[] }>(
      "/expert/payouts",
      undefined,
      { schema: z.object({ success: z.boolean(), data: z.array(ExpertPayoutSchema) }) },
    )
    .then((res) => res.data)
}

/**
 * Requests a withdrawal of all eligible available earnings.
 */
export async function requestWithdrawal(): Promise<{
  payoutId: string
  amount: number
  earningCount: number
}> {
  const WithdrawalWrapper = z.object({
    success: z.boolean(),
    message: z.string().optional(),
    data: z.object({
      payoutId: z.string(),
      amount: z.number(),
      earningCount: z.number().int(),
    }),
  })
  return api
    .post<{ success: boolean; message?: string; data: { payoutId: string; amount: number; earningCount: number } }>(
      "/expert/payouts/withdraw",
      undefined,
      { schema: WithdrawalWrapper },
    )
    .then((res) => res.data)
}

/**
 * Fetches the expert's saved bank / UPI payout details.
 */
export async function fetchPayoutDetails(): Promise<PayoutDetails> {
  return api
    .get<{ success: boolean; data: PayoutDetails }>(
      "/expert/payouts/details",
      undefined,
      { schema: z.object({ success: z.boolean(), data: PayoutDetailsSchema }) },
    )
    .then((res) => res.data)
}

/**
 * Saves the expert's bank / UPI payout details.
 */
export async function savePayoutDetails(
  details: PayoutDetailsInput,
): Promise<void> {
  await api.put<{ success: boolean; message?: string }>(
    "/expert/payouts/details",
    details,
    { schema: z.object({ success: z.boolean(), message: z.string().optional() }) },
  )
}
