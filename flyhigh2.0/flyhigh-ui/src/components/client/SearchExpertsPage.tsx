import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { AlertCircle, ChevronLeft, ChevronRight, Filter, RotateCcw, SlidersHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ExpertCard } from "./ExpertCard"
import { experienceOptions, priceOptions, ratingOptions, sortOptions } from "./mock-data"
import {
  buildFilterFieldMap,
  fetchExpertFilters,
  searchExperts,
  type DropdownField,
  type ExpertSummary,
} from "@/lib/expert-search"
import { FilterSelect } from "@/shared/components/molecules/FilterSelect"
import { SearchBar } from "@/shared/components/molecules/SearchBar"

const availabilityOptions = ["Any", "Online", "Offline"] as const

// ── Filter State (useReducer — stable, no revert) ──

interface FilterState {
  query: string
  debouncedQuery: string
  category: string
  subCategory: string
  rating: string
  price: string
  experience: string
  language: string
  country: string
  availability: string
  sortBy: string
  currentPage: number
}

type FilterAction =
  | { type: "reset" }
  | Partial<FilterState>

function initialFilterState(searchParams: URLSearchParams): FilterState {
  return {
    query: searchParams.get("q") || "",
    debouncedQuery: searchParams.get("q") || "",
    category: searchParams.get("category") || "Any",
    subCategory: "Any",
    rating: "Any",
    price: "Any",
    experience: "Any",
    language: "Any",
    country: "Any",
    availability: searchParams.get("availability") || "Any",
    sortBy: searchParams.get("sort") || "Most Relevant",
    currentPage: 0,
  }
}

function filterReducer(prev: FilterState, action: FilterAction): FilterState {
  if ("type" in action && action.type === "reset") {
    return {
      query: "",
      debouncedQuery: "",
      category: "Any",
      subCategory: "Any",
      rating: "Any",
      price: "Any",
      experience: "Any",
      language: "Any",
      country: "Any",
      availability: "Any",
      sortBy: "Most Relevant",
      currentPage: 0,
    }
  }
  // Only reset to page 0 when changing filters, NOT when explicitly paginating
  const isPaginating = "currentPage" in action
  return {
    ...prev,
    ...action,
    currentPage: isPaginating ? (action.currentPage ?? prev.currentPage) : 0,
  }
}

// ── Component ──

export default function SearchExpertsPage() {
  const [searchParams] = useSearchParams()

  // useReducer — deterministic, no revert to initial state
  const [filters, dispatchFilter] = useReducer(
    filterReducer,
    searchParams,
    initialFilterState,
  )

  /** Apply a filter change + trigger data fetch */
  const applyFilter = useCallback(
    (update: Partial<FilterState>) => {
      dispatchFilter(update)
    },
    [],
  )

  // Data state
  const [experts, setExperts] = useState<ExpertSummary[]>([])
  const [totalElements, setTotalElements] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterFields, setFilterFields] = useState<Map<string, DropdownField>>(() => new Map())

  // Debounce text search
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      applyFilter({ debouncedQuery: filters.query })
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [filters.query])

  // Fetch filter dropdown options on mount (cached by browser, not re-fetched)
  useEffect(() => {
    fetchExpertFilters()
      .then((catalog) => setFilterFields(buildFilterFieldMap(catalog.fields)))
      .catch(() => {
        // Filters remain empty; search still works
      })
  }, [])

  // Fetch experts when filters change
  const { debouncedQuery, category, subCategory, language, country, availability, rating, price, experience, sortBy, currentPage } = filters

  const fetchExperts = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await searchExperts({
        q: debouncedQuery || undefined,
        category,
        subCategory,
        language,
        country,
        availability,
        rating,
        price,
        experience,
        sort: sortBy,
        page: currentPage,
        size: 12,
      })
      setExperts(result.experts)
      setTotalElements(result.totalElements)
      setTotalPages(result.totalPages)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load experts")
      setExperts([])
      setTotalElements(0)
      setTotalPages(0)
    } finally {
      setIsLoading(false)
    }
  }, [debouncedQuery, category, subCategory, language, country, availability, rating, price, experience, sortBy, currentPage])

  useEffect(() => {
    fetchExperts()
  }, [fetchExperts])

  // Derived filter option lists — memoized for performance
  const categories = useMemo(() => {
    const options = filterFields.get("category")?.options?.map((o) => o.label) ?? []
    return ["Any", ...options] as const
  }, [filterFields])

  const subCategories = useMemo(() => {
    if (category === "Any") {
      const options = filterFields.get("subCategory")?.options?.map((o) => o.label) ?? []
      return ["Any", ...options]
    }
    const options =
      filterFields
        .get("subCategory")
        ?.options?.filter((o) => o.parentValue === category)
        .map((o) => o.label) ?? []
    return ["Any", ...options]
  }, [filterFields, category])

  const languages = useMemo(() => {
    const options = filterFields.get("languages")?.options?.map((o) => o.label) ?? []
    return ["Any", ...options]
  }, [filterFields])

  const countries = useMemo(() => {
    const options = filterFields.get("country")?.options?.map((o) => o.label) ?? []
    return ["Any", ...options]
  }, [filterFields])

  const setFilter = useCallback(
    (field: keyof FilterState) => (value: string) => {
      applyFilter({ [field]: value })
    },
    [applyFilter],
  )

  const handleQueryChange = useCallback(
    (v: string) => applyFilter({ query: v }),
    [applyFilter],
  )

  return (
      <div className="space-y-5">
        {/* Header + search bar */}
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:p-5">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-950">
                Search Experts
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Find experts by specialty, rating, pricing, and availability.
              </p>
            </div>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => dispatchFilter({ type: "reset" })}
            >
              <RotateCcw className="size-4" />
              Reset
            </Button>
          </div>
          <SearchBar
            value={filters.query}
            onChange={handleQueryChange}
            placeholder="Search by name, title, category, language, or country"
          />
        </section>

        <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
          {/* Filters sidebar */}
          <Card className="h-fit rounded-lg border-slate-200 shadow-sm">
            <CardContent className="space-y-4 p-4">
              <div className="flex items-center gap-2">
                <Filter className="size-4 text-slate-500" />
                <h3 className="font-semibold text-slate-950">Filters</h3>
              </div>
              <FilterSelect label="Category" value={filters.category} onChange={setFilter("category")} options={categories} />
              <FilterSelect label="Sub Category" value={filters.subCategory} onChange={setFilter("subCategory")} options={subCategories} />
              <FilterSelect label="Rating" value={filters.rating} onChange={setFilter("rating")} options={ratingOptions} />
              <FilterSelect label="Price" value={filters.price} onChange={setFilter("price")} options={priceOptions} />
              <FilterSelect label="Experience" value={filters.experience} onChange={setFilter("experience")} options={experienceOptions} />
              <FilterSelect label="Language" value={filters.language} onChange={setFilter("language")} options={languages} />
              <FilterSelect label="Country" value={filters.country} onChange={setFilter("country")} options={countries} />
              <FilterSelect label="Availability" value={filters.availability} onChange={setFilter("availability")} options={availabilityOptions} />
            </CardContent>
          </Card>

          {/* Results */}
          <section className="space-y-4">
            {/* Sort bar */}
            <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                {isLoading ? (
                  <p className="text-sm text-slate-500">Searching experts...</p>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-slate-950">
                      {totalElements} experts found
                    </p>
                    <p className="text-sm text-slate-500">
                      Showing page {currentPage + 1} of {Math.max(totalPages, 1)}
                    </p>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="size-4 text-slate-400" />
                <select
                  value={filters.sortBy}
                  onChange={(e) => applyFilter({ sortBy: e.target.value })}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-slate-400"
                >
                  {sortOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Loading */}
            {isLoading && (
              <div className="flex min-h-[40vh] items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="size-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#2563EB]" />
                  <p className="text-sm text-slate-500">Loading experts...</p>
                </div>
              </div>
            )}

            {/* Error */}
            {!isLoading && error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
                <AlertCircle className="mx-auto mb-3 size-7 text-red-500" />
                <p className="font-semibold text-red-800">Failed to load experts</p>
                <p className="mt-1 text-sm text-red-600">{error}</p>
                <Button variant="outline" className="mt-4 gap-2" onClick={fetchExperts}>
                  <RotateCcw className="size-4" />
                  Retry
                </Button>
              </div>
            )}

            {/* Expert grid */}
            {!isLoading && !error && (
              <div className="grid gap-4 xl:grid-cols-2">
                {experts.map((expert) => (
                  <ExpertCard key={expert.id} expert={expert} />
                ))}
              </div>
            )}

            {/* Empty */}
            {!isLoading && !error && experts.length === 0 && (
              <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
                <p className="font-semibold text-slate-950">No experts match these filters</p>
                <p className="mt-1 text-sm text-slate-500">
                  Try removing a filter or using a broader search term.
                </p>
              </div>
            )}

            {/* Pagination */}
            {!isLoading && !error && totalPages > 1 && (
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-sm text-slate-500">
                  Showing {experts.length} of {totalElements} experts
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    disabled={currentPage === 0}
                    onClick={() => applyFilter({ currentPage: Math.max(0, currentPage - 1) })}
                  >
                    <ChevronLeft className="size-4" />
                    Previous
                  </Button>
                  <span className="px-2 text-sm text-slate-600">
                    {currentPage + 1} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    disabled={currentPage >= totalPages - 1}
                    onClick={() => applyFilter({ currentPage: currentPage + 1 })}
                  >
                    Next
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
  )
}
