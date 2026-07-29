import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { motion } from "framer-motion"
import { Tabs as TabsPrimitive } from "radix-ui"
import {
  CalendarCheck,
  Clock,
  DollarSign,
  Star,
  Wallet,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/AuthContext"
import { useCountUp } from "@/hooks/use-count-up"
import { fetchEarningsHistory, fetchEarningsSummary } from "@/lib/earnings"
import { StatCard } from "@/shared/components/molecules/StatCard"
import { EmptyState } from "@/shared/components/atoms/EmptyState"
import { ErrorAlert } from "@/shared/components/atoms/ErrorAlert"
import type { EarningsSummary, ExpertEarning, EarningsPage } from "@/types/earnings"

// ── Constants ──

const TABS = ["Overview", "Pending", "Available", "History"] as const
type Tab = (typeof TABS)[number]

const INR_FORMAT = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

// ── Helpers ──

function formatINR(amount: number): string {
  return INR_FORMAT.format(amount)
}

function statusVariant(status: string): "secondary" | "default" | "outline" {
  switch (status) {
    case "PENDING":
      return "secondary"
    case "AVAILABLE":
      return "default"
    case "WITHDRAWN":
      return "outline"
    default:
      return "secondary"
  }
}

function formatDate(isoString: string): string {
  if (!isoString) return "—"
  try {
    const d = new Date(isoString)
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  } catch {
    return isoString
  }
}

// ── Skeleton ──

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-slate-200 ${className ?? ""}`}
    />
  )
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <SkeletonBlock className="h-3 w-20" />
            <SkeletonBlock className="h-7 w-24" />
          </div>
          <SkeletonBlock className="size-10 rounded-xl" />
        </div>
      </CardContent>
    </Card>
  )
}

function TableRowSkeleton() {
  return (
    <div className="flex items-center gap-4 border-b border-slate-100 px-4 py-3">
      <SkeletonBlock className="h-4 w-24" />
      <SkeletonBlock className="h-4 w-28" />
      <SkeletonBlock className="h-4 w-12" />
      <SkeletonBlock className="h-4 w-20" />
      <SkeletonBlock className="h-4 w-20" />
      <SkeletonBlock className="h-4 w-20" />
      <SkeletonBlock className="h-5 w-16 rounded-full" />
    </div>
  )
}

// ── Component ──

export default function ExpertEarningsPage() {
  const { user } = useAuth()
  const [summary, setSummary] = useState<EarningsSummary | null>(null)
  const [page, setPage] = useState<EarningsPage | null>(null)
  const [isLoadingSummary, setIsLoadingSummary] = useState(true)
  const [isLoadingPage, setIsLoadingPage] = useState(true)
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const [pageError, setPageError] = useState<string | null>(null)

  const [activeTab, setActiveTab] = useState<Tab>("Overview")
  const [currentPage, setCurrentPage] = useState(0)
  const [search, setSearch] = useState("")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")

  const overviewRef = useRef<HTMLDivElement>(null)
  const isInView = true // simplified; useInView could be added

  // ── Data fetching ──

  const loadSummary = useCallback(async () => {
    setIsLoadingSummary(true)
    setSummaryError(null)
    try {
      const data = await fetchEarningsSummary()
      setSummary(data)
    } catch (err: any) {
      setSummaryError(err?.message ?? "Failed to load earnings summary")
    } finally {
      setIsLoadingSummary(false)
    }
  }, [])

  const loadPage = useCallback(
    async (pageNum: number, tab: Tab) => {
      setIsLoadingPage(true)
      setPageError(null)
      try {
        const statusFilter =
          tab === "Overview" || tab === "History"
            ? undefined
            : tab.toUpperCase()
        const data = await fetchEarningsHistory({
          page: pageNum,
          size: 20,
          status: statusFilter,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
          search: search || undefined,
        })
        setPage(data)
      } catch (err: any) {
        console.error("[Earnings] Page fetch failed:", err)
        setPageError(err?.message ?? "Failed to load earnings")
      } finally {
        setIsLoadingPage(false)
      }
    },
    [fromDate, toDate, search],
  )

  useEffect(() => {
    loadSummary()
  }, [loadSummary])

  useEffect(() => {
    setCurrentPage(0)
    loadPage(0, activeTab)
  }, [activeTab, loadPage])

  // ── Animated counters ──

  const animatedAvailable = useCountUp({
    end: summary?.availableBalance ?? 0,
    duration: 1500,
    enabled: !isLoadingSummary && isInView,
  })

  const animatedPending = useCountUp({
    end: summary?.pendingBalance ?? 0,
    duration: 1500,
    enabled: !isLoadingSummary && isInView,
  })

  const animatedLifetime = useCountUp({
    end: summary?.lifetimeEarnings ?? 0,
    duration: 1500,
    enabled: !isLoadingSummary && isInView,
  })

  // ── Pagination helpers ──

  const totalPages = page?.totalPages ?? 0

  const earnings = page?.earnings ?? []
  const showPagination = totalPages > 1
  const showEmpty =
    !isLoadingPage && !pageError && earnings.length === 0
  const showTable = !isLoadingPage && !pageError && earnings.length > 0

  // ── Render ──

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold tracking-tight text-[var(--flyhigh-text)]">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-[var(--flyhigh-text-muted)]">
          Overview of your earnings, sessions, and platform activity.
        </p>
      </motion.div>

      {/* ── Overview Cards (shown on all tabs) ── */}
      <motion.div
        ref={overviewRef}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {isLoadingSummary ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : summaryError ? (
          <div className="col-span-full">
            <ErrorAlert
              message={summaryError}
              variant="banner"
              onRetry={loadSummary}
            />
          </div>
        ) : (
          <>
            <StatCard
              label="Available Balance"
              value={formatINR(animatedAvailable)}
              icon={Wallet}
              color="bg-emerald-50 text-emerald-600"
            />
            <StatCard
              label="Pending Balance"
              value={formatINR(animatedPending)}
              icon={Clock}
              color="bg-amber-50 text-amber-600"
            />
            <StatCard
              label="Lifetime Earnings"
              value={formatINR(animatedLifetime)}
              icon={DollarSign}
              color="bg-blue-50 text-blue-600"
            />
            <StatCard
              label="Total Sessions"
              value={
                isLoadingSummary
                  ? "..."
                  : String(summary?.totalSessions ?? 0)
              }
              icon={CalendarCheck}
              color="bg-indigo-50 text-indigo-600"
            />
            <StatCard
              label="Average Rating"
              value={
                isLoadingSummary
                  ? "..."
                  : `${(summary?.averageRating ?? 0).toFixed(1)}/5.0`
              }
              icon={Star}
              color="bg-yellow-50 text-yellow-600"
            />
          </>
        )}
      </motion.div>

      {/* ── Tabs ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <TabsPrimitive.Root
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as Tab)}
        >
          <TabsPrimitive.List className="flex gap-1 rounded-xl bg-slate-100 p-1 w-fit">
            {TABS.map((tab) => (
              <TabsPrimitive.Trigger
                key={tab}
                value={tab}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === tab
                    ? "bg-white text-[var(--flyhigh-text)] shadow-sm"
                    : "text-[var(--flyhigh-text-muted)] hover:text-[var(--flyhigh-text)]"
                }`}
              >
                {tab}
              </TabsPrimitive.Trigger>
            ))}
          </TabsPrimitive.List>

          {TABS.map((tab) => (
            <TabsPrimitive.Content key={tab} value={tab} className="mt-6">
              {/* ── Filters (non-Overview tabs) ── */}
              {tab !== "Overview" && (
                <div className="mb-4 flex flex-wrap items-end gap-3">
                  <div className="flex-1 min-w-[180px]">
                    <label className="block text-xs font-medium text-[var(--flyhigh-text-muted)] mb-1">
                      Search
                    </label>
                    <input
                      type="text"
                      placeholder="Client name or email..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--flyhigh-primary)]/20 focus:border-[var(--flyhigh-primary)]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--flyhigh-text-muted)] mb-1">
                      From
                    </label>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--flyhigh-primary)]/20 focus:border-[var(--flyhigh-primary)]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--flyhigh-text-muted)] mb-1">
                      To
                    </label>
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--flyhigh-primary)]/20 focus:border-[var(--flyhigh-primary)]"
                    />
                  </div>
                </div>
              )}

              {/* ── Content ── */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    {tab === "Overview"
                      ? "Recent Earnings"
                      : `${tab} Earnings`}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Loading */}
                  {isLoadingPage && (
                    <div className="space-y-1">
                      <TableRowSkeleton />
                      <TableRowSkeleton />
                      <TableRowSkeleton />
                      <TableRowSkeleton />
                      <TableRowSkeleton />
                    </div>
                  )}

                  {/* Error */}
                  {pageError && (
                    <ErrorAlert
                      message={pageError}
                      variant="banner"
                      onRetry={() => loadPage(currentPage, activeTab)}
                    />
                  )}

                  {/* Empty */}
                  {showEmpty && (
                    <EmptyState
                      title={
                        tab === "Overview"
                          ? "No earnings yet"
                          : `No ${tab.toLowerCase()} earnings`
                      }
                      description={
                        tab === "Overview"
                          ? "Complete your first paid session to start earning."
                          : `Earnings with status "${tab}" will appear here.`
                      }
                      icon={<DollarSign className="size-10" />}
                    />
                  )}

                  {/* Table */}
                  {showTable && (
                    <>
                      {/* Desktop table */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-200 text-left text-xs font-medium text-[var(--flyhigh-text-muted)] uppercase tracking-wider">
                              <th className="px-4 py-3">Date</th>
                              <th className="px-4 py-3">Client</th>
                              <th className="px-4 py-3">Duration</th>
                              <th className="px-4 py-3">Your Earning</th>
                              <th className="px-4 py-3">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {earnings.map((earning) => (
                              <tr
                                key={earning.id}
                                className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                              >
                                <td className="px-4 py-3 whitespace-nowrap text-[var(--flyhigh-text)]">
                                  {formatDate(earning.sessionDate)}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-[var(--flyhigh-text)] font-medium">
                                  {earning.clientName}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-[var(--flyhigh-text)]">
                                  {earning.duration} min
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap font-semibold text-emerald-600">
                                  {formatINR(earning.expertEarning)}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <Badge variant={statusVariant(earning.status)}>
                                    {earning.status}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile cards */}
                      <div className="md:hidden space-y-3">
                        {earnings.map((earning) => (
                          <div
                            key={earning.id}
                            className="rounded-lg border border-slate-200 p-4 space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-[var(--flyhigh-text)]">
                                {earning.clientName}
                              </span>
                              <Badge variant={statusVariant(earning.status)}>
                                {earning.status}
                              </Badge>
                            </div>
                            <div className="text-xs text-[var(--flyhigh-text-muted)]">
                              {formatDate(earning.sessionDate)} ·{" "}
                              {earning.duration} min
                            </div>
                            <div className="grid grid-cols-1 gap-2 text-sm">
                              <div>
                                <span className="text-[var(--flyhigh-text-muted)]">
                                  Your Earning
                                </span>
                                <p className="font-semibold text-emerald-600">
                                  {formatINR(earning.expertEarning)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Pagination */}
                      {showPagination && (
                        <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4">
                          <p className="text-xs text-[var(--flyhigh-text-muted)]">
                            Page {currentPage + 1} of {totalPages}
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                const prev = Math.max(0, currentPage - 1)
                                setCurrentPage(prev)
                                loadPage(prev, activeTab)
                              }}
                              disabled={currentPage === 0}
                              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-[var(--flyhigh-text)] hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                              Previous
                            </button>
                            <button
                              onClick={() => {
                                const next = currentPage + 1
                                setCurrentPage(next)
                                loadPage(next, activeTab)
                              }}
                              disabled={currentPage >= totalPages - 1}
                              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-[var(--flyhigh-text)] hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsPrimitive.Content>
          ))}
        </TabsPrimitive.Root>
      </motion.div>
    </div>
  )
}
