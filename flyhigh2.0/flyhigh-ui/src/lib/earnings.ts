import { api } from "@/api/client"
import type { EarningsSummary, EarningsPage, EarningsFilters } from "@/types/earnings"
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
