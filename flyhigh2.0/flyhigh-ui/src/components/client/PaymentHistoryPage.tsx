import { useCallback, useEffect, useState } from "react"
import { motion } from "framer-motion"
import { CreditCard, Receipt, IndianRupee, CalendarCheck } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StatCard } from "@/shared/components/molecules/StatCard"
import { EmptyState } from "@/shared/components/atoms/EmptyState"
import { ErrorAlert } from "@/shared/components/atoms/ErrorAlert"
import { fetchPaymentHistory } from "@/lib/payments"
import type { PaymentHistoryItem, PaymentHistoryPage as PaymentHistoryPageType } from "@/types/payment"

// ── Constants ──

const INR_FORMAT = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0, maximumFractionDigits: 0 })
function formatINR(a: number | undefined) { return INR_FORMAT.format(a ?? 0) }

// ── Helpers ──

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

function formatTime(isoString: string): string {
  if (!isoString) return ""
  try {
    const d = new Date(isoString)
    return d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return ""
  }
}

function maskPaymentId(id: string | null): string {
  if (!id) return "—"
  if (id.length <= 12) return id
  return `${id.slice(0, 8)}****${id.slice(-4)}`
}

function sessionStatusVariant(status: string): "secondary" | "default" | "outline" | "destructive" {
  switch (status) {
    case "COMPLETED":
      return "default"
    case "CANCELLED":
    case "FREE_SESSION_EXPIRED":
      return "destructive"
    case "ACTIVE":
    case "PAID_SESSION":
      return "secondary"
    default:
      return "outline"
  }
}

function paymentStatusVariant(status: string): "secondary" | "default" | "outline" {
  switch (status) {
    case "PAID":
      return "default"
    case "HELD":
      return "secondary"
    case "UNPAID":
      return "outline"
    default:
      return "outline"
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
      <SkeletonBlock className="h-5 w-16 rounded-full" />
    </div>
  )
}

// ── Component ──

export default function PaymentHistoryPage() {
  const [pageData, setPageData] = useState<PaymentHistoryPageType | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(0)

  const loadData = useCallback(async (page: number) => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchPaymentHistory(page, 10)
      setPageData(data)
    } catch (err: any) {
      setError(err?.message ?? "Failed to load payment history")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData(currentPage)
  }, [currentPage, loadData])

  const payments = pageData?.content ?? []
  const totalPages = pageData?.totalPages ?? 0
  const totalElements = pageData?.totalElements ?? 0

  // Compute summary stats from current page (approximation — total across all pages)
  const totalPaid = payments.reduce((sum, p) => sum + p.totalPaidAmount, 0)
  const paidSessions = payments.filter((p) => p.paymentStatus === "PAID" || p.paymentStatus === "HELD").length
  const totalTransactions = payments.filter((p) => p.razorpayPaymentId).length

  const showPagination = totalPages > 1
  const showEmpty = !isLoading && !error && payments.length === 0
  const showTable = !isLoading && !error && payments.length > 0

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold tracking-tight text-[var(--flyhigh-text)]">
          Payment History
        </h1>
        <p className="mt-1 text-sm text-[var(--flyhigh-text-muted)]">
          View all your past payments and transaction details.
        </p>
      </motion.div>

      {/* Summary Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : error ? (
          <div className="col-span-full">
            <ErrorAlert message={error} variant="banner" onRetry={() => loadData(currentPage)} />
          </div>
        ) : (
          <>
            <StatCard
              label="Total Spent"
              value={formatINR(totalPaid)}
              icon={IndianRupee}
              color="bg-blue-50 text-blue-600"
            />
            <StatCard
              label="Paid Sessions"
              value={String(paidSessions)}
              icon={CalendarCheck}
              color="bg-emerald-50 text-emerald-600"
            />
            <StatCard
              label="Transactions"
              value={String(totalTransactions)}
              icon={Receipt}
              color="bg-indigo-50 text-indigo-600"
            />
          </>
        )}
      </motion.div>

      {/* Payment Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Loading */}
            {isLoading && (
              <div className="space-y-1">
                <TableRowSkeleton />
                <TableRowSkeleton />
                <TableRowSkeleton />
                <TableRowSkeleton />
                <TableRowSkeleton />
              </div>
            )}

            {/* Error */}
            {error && (
              <ErrorAlert
                message={error}
                variant="banner"
                onRetry={() => loadData(currentPage)}
              />
            )}

            {/* Empty */}
            {showEmpty && (
              <EmptyState
                title="No payments yet"
                description="Your payment history will appear here after your first paid consultation."
                icon={<CreditCard className="size-10" />}
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
                        <th className="px-4 py-3">Expert</th>
                        <th className="px-4 py-3">Duration</th>
                        <th className="px-4 py-3">Amount</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Transaction ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment) => (
                        <tr
                          key={payment.id}
                          className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                        >
                          <td className="px-4 py-3 whitespace-nowrap text-[var(--flyhigh-text)]">
                            <div>{formatDate(payment.sessionDate)}</div>
                            <div className="text-xs text-[var(--flyhigh-text-muted)]">
                              {formatTime(payment.sessionDate)}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-[var(--flyhigh-text)] font-medium">
                            {payment.expertName}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-[var(--flyhigh-text)]">
                            {payment.duration} min
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap font-semibold text-[var(--flyhigh-text)]">
                            {payment.totalPaidAmount > 0 ? (
                              formatINR(payment.totalPaidAmount)
                            ) : (
                              <span className="text-slate-400">Free</span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <Badge variant={sessionStatusVariant(payment.sessionStatus)}>
                              {payment.sessionStatus}
                            </Badge>
                            {payment.paymentStatus === "HELD" && (
                              <Badge variant="secondary" className="ml-1">
                                {payment.paymentStatus}
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-xs font-mono text-[var(--flyhigh-text-muted)]">
                            {maskPaymentId(payment.razorpayPaymentId)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden space-y-3">
                  {payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="rounded-lg border border-slate-200 p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-[var(--flyhigh-text)]">
                          {payment.expertName}
                        </span>
                        <Badge variant={sessionStatusVariant(payment.sessionStatus)}>
                          {payment.sessionStatus}
                        </Badge>
                      </div>
                      <div className="text-xs text-[var(--flyhigh-text-muted)]">
                        {formatDate(payment.sessionDate)} · {payment.duration} min
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-[var(--flyhigh-text-muted)]">Amount</span>
                          <p className="font-semibold text-[var(--flyhigh-text)]">
                            {payment.totalPaidAmount > 0
                              ? formatINR(payment.totalPaidAmount)
                              : "Free"}
                          </p>
                        </div>
                        <div>
                          <span className="text-[var(--flyhigh-text-muted)]">Transaction</span>
                          <p className="font-mono text-xs text-[var(--flyhigh-text-muted)]">
                            {maskPaymentId(payment.razorpayPaymentId)}
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
                      Page {currentPage + 1} of {totalPages} · {totalElements} total
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const prev = Math.max(0, currentPage - 1)
                          setCurrentPage(prev)
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
      </motion.div>
    </div>
  )
}
