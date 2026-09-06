import { useEffect, useState } from "react"
import { motion } from "framer-motion"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AdminPagination } from "@/components/admin/AdminPagination"
import { api } from "@/api/client"
import { toast } from "@/hooks/use-toast"

// ── Types ──

interface Consultation {
  id: string
  clientId: string
  expertId: string
  status: string
  createdAt: string
}

interface PageResponse {
  content: Consultation[]
  totalPages: number
  totalElements: number
  page: number
}

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
      return "default"
    case "PENDING":
    case "PROCESSING":
    case "IN_PROGRESS":
      return "secondary"
    case "ACCEPTED":
    case "SCHEDULED":
      return "outline"
    case "CANCELLED":
    case "REJECTED":
    case "FAILED":
      return "destructive"
    default:
      return "outline"
  }
}

// ── Skeleton ──

function TableRowSkeleton() {
  return (
    <div className="flex items-center gap-4 border-b border-slate-100 px-4 py-3">
      <div className="h-4 w-16 animate-pulse rounded bg-slate-200" />
      <div className="h-4 w-16 animate-pulse rounded bg-slate-200" />
      <div className="h-4 w-16 animate-pulse rounded bg-slate-200" />
      <div className="h-5 w-20 animate-pulse rounded-full bg-slate-200" />
      <div className="h-4 w-20 animate-pulse rounded bg-slate-200" />
    </div>
  )
}

// ── Component ──

export default function AdminConsultations() {
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadConsultations = async (pageNum: number) => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await api.get<PageResponse>(
        `/admin/consultations?page=${pageNum}`,
      )
      setConsultations(data.content ?? [])
      setTotalPages(data.totalPages ?? 0)
      setTotalElements(data.totalElements ?? 0)
    } catch (err: any) {
      const msg = err?.message ?? "Failed to load consultations"
      setError(msg)
      toast({
        title: "Error loading consultations",
        description: msg,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadConsultations(page)
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
          Consultations
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Monitor all consultations across the platform.
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
              All Consultations
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
                  onClick={() => loadConsultations(page)}
                >
                  Retry
                </Button>
              </div>
            )}

            {/* Empty */}
            {!isLoading && !error && consultations.length === 0 && (
              <p className="py-6 text-center text-sm text-slate-500">
                No data available.
              </p>
            )}

            {/* Table Content */}
            {!isLoading && !error && consultations.length > 0 && (
              <>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase text-slate-500">
                        <th className="px-4 py-3">ID</th>
                        <th className="px-4 py-3">Client ID</th>
                        <th className="px-4 py-3">Expert ID</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {consultations.map((c) => (
                        <tr
                          key={c.id}
                          className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                        >
                          <td className="px-4 py-3 text-xs font-mono text-slate-500">
                            {c.id}
                          </td>
                          <td className="px-4 py-3 text-xs font-mono text-slate-500">
                            {c.clientId}
                          </td>
                          <td className="px-4 py-3 text-xs font-mono text-slate-500">
                            {c.expertId}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={statusBadgeVariant(c.status)}>
                              {c.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                            {formatDate(c.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden space-y-3">
                  {consultations.map((c) => (
                    <div
                      key={c.id}
                      className="rounded-lg border border-slate-200 p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-slate-500">
                          {c.id}
                        </span>
                        <Badge variant={statusBadgeVariant(c.status)}>
                          {c.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                        <div>
                          <span className="text-slate-400">Client</span>
                          <p className="font-mono">{c.clientId}</p>
                        </div>
                        <div>
                          <span className="text-slate-400">Expert</span>
                          <p className="font-mono">{c.expertId}</p>
                        </div>
                      </div>
                      <div className="text-xs text-slate-500">
                        {formatDate(c.createdAt)}
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
