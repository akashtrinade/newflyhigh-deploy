import { api } from "@/api/client"
import type { DropdownField, DropdownCatalogResponse } from "@/types/api"
import type {
  ExpertPublicProfile,
  SaveExpertProfilePayload,
} from "@/types/expert"
import { fetchDropdownCatalogWithCache } from "@/lib/dropdown-cache"
import {
  DropdownCatalogResponseSchema,
  ExpertPublicProfileSchema,
} from "@/lib/validation-more"
import { MessageResponseSchema } from "@/lib/validation"

export type {
  DropdownField,
  DropdownCatalogResponse,
} from "@/types/api"
export type {
  ExpertPublicProfile,
  SaveExpertProfilePayload,
  ExpertReview,
} from "@/types/expert"

/** Alias for backward compatibility with components expecting the old name. */
export type ExpertProfileResponse = ExpertPublicProfile

const PROFILE_PATH = "/expert/profile"

/** Cache section names used by the expert profile form. */
const PROFILE_DROPDOWN_SECTIONS = ["countries", "categories", "subCategories", "languages"]

export async function fetchExpertProfileDropdowns() {
  return fetchDropdownCatalogWithCache(PROFILE_DROPDOWN_SECTIONS, () =>
    api.get<DropdownCatalogResponse>(`${PROFILE_PATH}/dropdowns`, undefined, {
      schema: DropdownCatalogResponseSchema,
    }),
  )
}

export async function fetchExpertProfile() {
  return api.get<ExpertPublicProfile>(PROFILE_PATH, undefined, {
    schema: ExpertPublicProfileSchema,
  })
}

export async function saveExpertProfile(payload: SaveExpertProfilePayload) {
  return api.post<{ success: boolean; message: string }>(
    PROFILE_PATH,
    payload,
    { schema: MessageResponseSchema },
  )
}

export function buildDropdownFieldMap(
  fields: DropdownField[],
): Map<string, DropdownField> {
  return new Map(fields.map((f) => [f.key, f]))
}
