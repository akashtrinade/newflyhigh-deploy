// ── Centralized Dropdown Cache Service ──
//
// All dropdown data is stored under a single localStorage key
// ("flyhigh_dropdown_cache") to reduce storage fragmentation and simplify
// cache management.  Each dropdown section (countries, categories,
// subCategories, languages, and any future sections) lives side-by-side
// inside the same object.
//
// Features:
//   • 24-hour TTL with automatic invalidation
//   • Section-level partial updates — update one section without touching others
//   • Schema versioning — future structure changes auto-invalidate old caches
//   • Stale-cache fallback on API failure
//   • Developer-friendly console logging (DEV only)
//   • Generic design — add new sections (Skills, Certifications, …) by name

import type { DropdownField, DropdownCatalogResponse } from "@/types/api"

// ── Constants ──

const CACHE_KEY = "flyhigh_dropdown_cache"
const CACHE_VERSION = 1
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

// ── Types ──

/**
 * The single unified cache structure stored under the
 * `flyhigh_dropdown_cache` localStorage key.
 *
 * ```json
 * {
 *   "version": 1,
 *   "timestamp": 1751548800000,
 *   "countries": { … DropdownField … },
 *   "categories": { … DropdownField … },
 *   "subCategories": { … DropdownField … },
 *   "languages": { … DropdownField … }
 * }
 * ```
 *
 * Add new sections by simply writing to a new property name —
 * the index signature makes it extensible without code changes.
 */
export interface DropdownCache {
  version: number
  timestamp: number
  /** Named dropdown sections.  `version` & `timestamp` are reserved. */
  [section: string]: DropdownField | number
}

// ── Dev-only logging ──

const LOG_PREFIX = "[DropdownCache]"

function devLog(level: "log" | "warn", message: string): void {
  if (import.meta.env.DEV) {
    console[level](LOG_PREFIX, message)
  }
}

// ── Service ──

export const DropdownCacheService = {
  /**
   * Read the full cache object from localStorage.
   *
   * Returns `null` when:
   *   - The key does not exist
   *   - The stored JSON is corrupt
   *   - The stored version does not match the current `CACHE_VERSION`
   *     (old cache is automatically purged in that case)
   */
  getCache(): DropdownCache | null {
    try {
      const raw = localStorage.getItem(CACHE_KEY)
      if (!raw) return null

      const cache: DropdownCache = JSON.parse(raw)

      // Version guard — if the structure changes in a future release,
      // discard the old shape so we never serve stale-format data.
      if (cache.version !== CACHE_VERSION) {
        devLog(
          "warn",
          `Version mismatch (stored=${cache.version}, current=${CACHE_VERSION}). Purging old cache.`,
        )
        localStorage.removeItem(CACHE_KEY)
        return null
      }

      return cache
    } catch {
      return null
    }
  },

  /** Persist a cache object to localStorage (overwrites). */
  saveCache(cache: DropdownCache): void {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
    } catch {
      // localStorage full or unavailable — silently ignore
    }
  },

  /**
   * Returns `true` when the cache is missing, corrupt, or older than
   * `CACHE_TTL_MS` (24 hours).
   */
  isCacheExpired(): boolean {
    const cache = this.getCache()
    if (!cache) return true
    return Date.now() - cache.timestamp > CACHE_TTL_MS
  },

  /** Remove the entire cache from localStorage. */
  clearCache(): void {
    try {
      localStorage.removeItem(CACHE_KEY)
    } catch {
      // silently ignore
    }
  },

  /**
   * Update (or create) a single section without disturbing the rest of
   * the cache.  The global `timestamp` is refreshed so the updated
   * section benefits from a fresh TTL.
   *
   * ```ts
   * DropdownCacheService.updateSection("countries", countryField)
   * ```
   */
  updateSection(section: string, data: DropdownField): void {
    const cache = this.getCache() ?? {
      version: CACHE_VERSION,
      timestamp: Date.now(),
    }
    cache[section] = data
    cache.timestamp = Date.now()
    this.saveCache(cache)
  },

  /**
   * Retrieve a single section from the cache.
   *
   * Returns `null` when the cache (or this section) is missing, or when
   * the cache has expired (respects TTL).
   */
  getSection(section: string): DropdownField | null {
    if (this.isCacheExpired()) return null
    const cache = this.getCache()
    if (!cache) return null
    const value = cache[section]
    return value && typeof value === "object" ? (value as DropdownField) : null
  },
}

// ── Mapping: API field keys ↔ cache section names ──

/**
 * Backend `DropdownField.key` → cache section name.
 * Extend this map when new dropdown types are added to the backend.
 */
const FIELD_KEY_TO_SECTION: Record<string, string> = {
  country: "countries",
  category: "categories",
  subCategory: "subCategories",
  languages: "languages",
}

// ── High-level Fetch Wrapper ──

/**
 * Wrap a dropdown-catalog fetch function with the centralized cache.
 *
 * **Flow:**
 *  1. **Cache Hit**  — all requested sections are present and fresh →
 *     return cached data (zero network requests).
 *  2. **Cache Miss / Expired** — fetch fresh data from the backend,
 *     persist each field into its cache section, and return it.
 *  3. **API failure + stale cache** — return the cached data (even if
 *     expired) so the UI keeps working.
 *  4. **API failure + no cache** — propagate the error to the caller.
 *
 * @param sectionKeys  Cache section names (e.g. `["countries", "categories"]`)
 *                     that this catalog is expected to deliver.
 * @param fetchFn      The actual API call returning a `DropdownCatalogResponse`.
 */
export async function fetchDropdownCatalogWithCache(
  sectionKeys: string[],
  fetchFn: () => Promise<DropdownCatalogResponse>,
): Promise<DropdownCatalogResponse> {
  // ── 1. Cache Hit ──
  if (!DropdownCacheService.isCacheExpired()) {
    const cache = DropdownCacheService.getCache()
    const allPresent =
      cache &&
      sectionKeys.every((section) => {
        const value = cache[section]
        return value && typeof value === "object"
      })

    if (allPresent) {
      devLog("log", `Cache Hit — ${sectionKeys.join(", ")}`)
      const fields: DropdownField[] = sectionKeys.map(
        (section) => cache![section] as DropdownField,
      )
      return { fields }
    }

    devLog("log", `Cache Miss — some sections missing (needed: ${sectionKeys.join(", ")})`)
  } else {
    devLog("log", "Cache Expired — fetching fresh data")
  }

  // ── 2. Fetch fresh data ──
  try {
    const response = await fetchFn()

    // Merge into existing cache (preserve sections not in this response)
    const cache = DropdownCacheService.getCache() ?? {
      version: CACHE_VERSION,
      timestamp: Date.now(),
    }

    for (const field of response.fields) {
      const section = FIELD_KEY_TO_SECTION[field.key] ?? field.key
      cache[section] = field
    }
    cache.timestamp = Date.now()

    DropdownCacheService.saveCache(cache)
    devLog("log", "Cache Updated — fresh data persisted")

    return response
  } catch (error) {
    // ── 3. Stale-cache fallback ──
    const cache = DropdownCacheService.getCache()
    if (cache) {
      const staleFields: DropdownField[] = []
      for (const section of sectionKeys) {
        const value = cache[section]
        if (value && typeof value === "object") {
          staleFields.push(value as DropdownField)
        }
      }

      if (staleFields.length > 0) {
        devLog(
          "warn",
          `API request failed — serving stale cached data for: ${sectionKeys.join(", ")}`,
        )
        return { fields: staleFields }
      }
    }

    // No cache at all — propagate
    throw error
  }
}
