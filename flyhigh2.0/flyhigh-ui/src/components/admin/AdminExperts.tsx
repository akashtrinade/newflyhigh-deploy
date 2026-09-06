import { useEffect, useState } from "react"
import { motion } from "framer-motion"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AdminPagination } from "@/components/admin/AdminPagination"
import { api } from "@/api/client"
import { toast } from "@/hooks/use-toast"

// ── Types ──

interface Expert {
  id: string
  firstName: string
  lastName: string
  email: string
  country: string
  status: string
  createdAt: string
}

interface PageResponse {
  content: Expert[]
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
    case "ACTIVE":
    case "VERIFIED":
      return "default"
    case "PENDING":
    case "INACTIVE":
      return "secondary"
    case "SUSPENDED":
    case "BANNED":
      return "destructive"
    default:
      return "outline"
  }
}

// ── Skeleton ──

function TableRowSkeleton() {
  return (
    <div className="flex items-center gap-4 border-b border-slate-100 px-4 py-3">
      <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
      <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
      <div className="h-4 w-20 animate-pulse rounded bg-slate-200" />
      <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
      <div className="h-5 w-16 animate-pulse rounded-full bg-slate-200" />
    </div>
  )
}

// ── Component ──

export default function AdminExperts() {
  const [experts, setExperts] = useState<Expert[]>([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadExperts = async (pageNum: number) => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await api.get<PageResponse>(
        `/admin/experts?page=${pageNum}`,
      )
      setExperts(data.content ?? [])
      setTotalPages(data.totalPages ?? 0)
      setTotalElements(data.totalElements ?? 0)
    } catch (err: any) {
      const msg = err?.message ?? "Failed to load experts"
      setError(msg)
      toast({
        title: "Error loading experts",
        description: msg,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadExperts(page)
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
          Experts
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Manage all experts registered on the platform.
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
              All Experts
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
                  onClick={() => loadExperts(page)}
                >
                  Retry
                </Button>
              </div>
            )}

            {/* Empty */}
            {!isLoading && !error && experts.length === 0 && (
              <p className="py-6 text-center text-sm text-slate-500">
                No data available.
              </p>
            )}

            {/* Table Content */}
            {!isLoading && !error && experts.length > 0 && (
              <>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase text-slate-500">
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3">Email</th>
                        <th className="px-4 py-3">Country</th>
                        <th className="px-4 py-3">Joined</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {experts.map((expert) => (
                        <tr
                          key={expert.id}
                          className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                        >
                          <td className="px-4 py-3 font-medium text-slate-950">
                            {expert.firstName} {expert.lastName}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {expert.email}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {expert.country || "—"}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                            {formatDate(expert.createdAt)}
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant={statusBadgeVariant(expert.status)}
                            >
                              {expert.status || "Unknown"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden space-y-3">
                  {experts.map((expert) => (
                    <div
                      key={expert.id}
                      className="rounded-lg border border-slate-200 p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-950">
                          {expert.firstName} {expert.lastName}
                        </span>
                        <Badge variant={statusBadgeVariant(expert.status)}>
                          {expert.status || "Unknown"}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500">
                        {expert.email}
                      </p>
                      <div className="text-xs text-slate-500">
                        {expert.country || "—"} · Joined{" "}
                        {formatDate(expert.createdAt)}
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
