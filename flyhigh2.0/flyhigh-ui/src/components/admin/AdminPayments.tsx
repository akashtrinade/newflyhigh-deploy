import { useEffect, useState } from "react"
import { motion } from "framer-motion"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AdminPagination } from "@/components/admin/AdminPagination"
import { api } from "@/api/client"
import { toast } from "@/hooks/use-toast"

// ── Types ──

interface Payment {
  id: string
  amount: number
  currency: string
  status: string
  createdAt: string
}

interface PageResponse {
  content: Payment[]
  totalPages: number
  totalElements: number
  page: number
}

const INR_FORMAT = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0, maximumFractionDigits: 0 })
function formatINR(a: number | undefined) { return INR_FORMAT.format(a ?? 0) }

// ── Helpers ──

function formatDate(isoString: string): string {
  if (!isoString) return "—"
  try {
    return new Date(isoString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  } catch {
    return isoString
  }
}

function statusBadgeVariant(
  status: string,
): "default" | "secondary" | "outline" | "destructive" {
  switch (status?.toUpperCase()) {
    case "COMPLETED":
    case "PAID":
    case "CAPTURED":
      return "default"
    case "PENDING":
    case "PROCESSING":
    case "HELD":
      return "secondary"
    case "FAILED":
    case "REFUNDED":
      return "destructive"
    case "CREATED":
    case "AUTHORIZED":
      return "outline"
    default:
      return "outline"
  }
}

// ── Skeleton ──

function TableRowSkeleton() {
  return (
    <div className="flex items-center gap-4 border-b border-slate-100 px-4 py-3">
      <div className="h-4 w-16 animate-pulse rounded bg-slate-200" />
      <div className="h-4 w-20 animate-pulse rounded bg-slate-200" />
      <div className="h-4 w-12 animate-pulse rounded bg-slate-200" />
      <div className="h-5 w-16 animate-pulse rounded-full bg-slate-200" />
      <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
    </div>
  )
}

// ── Component ──

export default function AdminPayments() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadPayments = async (pageNum: number) => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await api.get<PageResponse>(
        `/admin/payments?page=${pageNum}`,
      )
      setPayments(data.content ?? [])
      setTotalPages(data.totalPages ?? 0)
      setTotalElements(data.totalElements ?? 0)
    } catch (err: any) {
      const msg = err?.message ?? "Failed to load payments"
      setError(msg)
      toast({
        title: "Error loading payments",
        description: msg,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadPayments(page)
  }, [page])

  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
      >
        <h2 className="text-2xl font-bold tracking-tight text-slate-950">
          Payments
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Track all payment transactions processed through the platform.
        </p>
      </motion.section>

      {/* Table */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <Card>
          <CardHeader className="p-4 pb-0">
            <CardTitle className="text-base">
              All Payments
              {totalElements > 0 && (
                <span className="ml-2 text-sm font-normal text-slate-500">
                  ({totalElements} total)
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-3">
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
            {!isLoading && error && (
              <div className="py-6 text-center">
                <p className="text-sm text-red-600">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => loadPayments(page)}
                >
                  Retry
                </Button>
              </div>
            )}

            {/* Empty */}
            {!isLoading && !error && payments.length === 0 && (
              <p className="py-6 text-center text-sm text-slate-500">
                No data available.
              </p>
            )}

            {/* Table Content */}
            {!isLoading && !error && payments.length > 0 && (
              <>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase text-slate-500">
                        <th className="px-4 py-3">ID</th>
                        <th className="px-4 py-3">Amount</th>
                        <th className="px-4 py-3">Currency</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment) => (
                        <tr
                          key={payment.id}
                          className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                        >
                          <td className="px-4 py-3 text-xs font-mono text-slate-500">
                            {payment.id}
                          </td>
                          <td className="px-4 py-3 font-semibold text-emerald-600">
                            {formatINR(payment.amount)}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {payment.currency || "INR"}
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant={statusBadgeVariant(payment.status)}
                            >
                              {payment.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                            {formatDate(payment.createdAt)}
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
                        <span className="text-xs font-mono text-slate-500">
                          {payment.id}
                        </span>
                        <Badge
                          variant={statusBadgeVariant(payment.status)}
                        >
                          {payment.status}
                        </Badge>
                      </div>
                      <p className="text-lg font-semibold text-emerald-600">
                        {formatINR(payment.amount)}
                      </p>
                      <div className="text-xs text-slate-500">
                        {payment.currency || "INR"} ·{" "}
                        {formatDate(payment.createdAt)}
                      </div>
                    </div>
                  ))}
                </div>

                <AdminPagination page={page} totalPages={totalPages} onPageChange={setPage} layout="justify-between" />
              </>
            )}
          </CardContent>
        </Card>
      </motion.section>
    </div>
  )
}
