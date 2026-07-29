import { api } from "@/api/client"
import type {
  ExpertSearchPage,
  ExpertSearchParams,
  ExpertPublicProfile,
} from "@/types/expert"
import type { DropdownField, DropdownCatalogResponse } from "@/types/api"
import { fetchDropdownCatalogWithCache } from "@/lib/dropdown-cache"
import { ExpertSearchPageSchema, ExpertPublicProfileSchema, DropdownCatalogResponseSchema } from "@/lib/validation-more"
import { setCommissionPercent } from "@/lib/pricing"

export type {
  ExpertSummary,
  ExpertSearchPage,
  ExpertSearchParams,
  ExpertPublicProfile,
  ExpertReview,
} from "@/types/expert"
export type { DropdownField, DropdownCatalogResponse } from "@/types/api"

const EXPERTS_PATH = "/experts"

/** Cache section names used by the search/filter page. */
const SEARCH_FILTER_SECTIONS = ["countries", "categories", "subCategories", "languages"]

export async function searchExperts(
  params: ExpertSearchParams,
): Promise<ExpertSearchPage> {
  return api.get<ExpertSearchPage>(
    EXPERTS_PATH,
    params as Record<string, string | number | undefined>,
    { schema: ExpertSearchPageSchema },
  )
}

export async function fetchExpertById(
  expertId: string,
): Promise<ExpertPublicProfile> {
  return api.get<ExpertPublicProfile>(`${EXPERTS_PATH}/${expertId}`, undefined, {
    schema: ExpertPublicProfileSchema,
  })
}

export async function fetchExpertFilters(): Promise<DropdownCatalogResponse> {
  const result = await fetchDropdownCatalogWithCache(SEARCH_FILTER_SECTIONS, () =>
    api.get<DropdownCatalogResponse>(`${EXPERTS_PATH}/filters`, undefined, {
      schema: DropdownCatalogResponseSchema,
    }),
  )
  // Sync commission percent from backend to frontend pricing module
  if (result && typeof result.commissionPercent === "number") {
    setCommissionPercent(result.commissionPercent)
  }
  return result
}

/**
 * Build a Map of dropdown key -> DropdownField for O(1) lookup.
 * Using Map instead of Record because repeated .get() is more explicit
 * and avoids prototype-chain issues.
 */
export function buildFilterFieldMap(
  fields: DropdownField[],
): Map<string, DropdownField> {
  return new Map(fields.map((f) => [f.key, f]))
}
