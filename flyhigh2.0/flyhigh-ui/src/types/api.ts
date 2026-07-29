// ── Centralized API types — single source of truth ──

export interface ApiMessageResponse {
  success: boolean
  message: string
}

// ── Dropdown / Filter types (shared between expert-search & expert-profile) ──

export interface DropdownOption {
  value: string
  label: string
  parentValue?: string | null
  custom?: boolean | null
}

export interface DropdownField {
  key: string
  label: string
  placeholder?: string | null
  allowCustom?: boolean | null
  multiSelect?: boolean | null
  dependsOn?: string | null
  options: DropdownOption[]
}

export interface DropdownCatalogResponse {
  fields: DropdownField[]
}

/** Build a Map for O(1) lookup by key instead of repeated .find() calls */
export function buildFilterFieldMap(
  fields: DropdownField[],
): Map<string, DropdownField> {
  return new Map(fields.map((f) => [f.key, f]))
}
