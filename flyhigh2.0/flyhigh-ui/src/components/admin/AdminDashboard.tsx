import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import {
  Users,
  UserCheck,
  CalendarCheck,
  DollarSign,
  TrendingUp,
  Wallet,
  CheckCircle,
  Clock,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/AuthContext"
import { StatCard } from "@/shared/components/molecules/StatCard"
import { api } from "@/api/client"
import { toast } from "@/hooks/use-toast"

// ── Types ──

interface DashboardStats {
  totalUsers: number
  totalExperts: number
  totalClients: number
  activeConsultations: number
  todayRevenue: number
  platformRevenue: number
  pendingPayouts: number
  completedConsultations: number
}

interface RecentUser {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
  createdAt: string
}

interface RecentExpert {
  id: string
  firstName: string
  lastName: string
  email: string
  country: string
  status: string
  createdAt: string
}

interface RecentConsultation {
  id: string
  clientId: string
  expertId: string
  status: string
  createdAt: string
}

interface RecentPayment {
  id: string
  amount: number
  currency: string
  status: string
  createdAt: string
}

interface PageResponse<T> {
  content: T[]
  totalPages: number
  totalElements: number
  page: number
}

// ── Helpers ──

const INR_FORMAT = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
})

function formatINR(amount: number): string {
  return INR_FORMAT.format(amount)
}

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
    case "ACTIVE":
      return "default"
    case "PENDING":
    case "PROCESSING":
      return "secondary"
    case "CANCELLED":
    case "REJECTED":
      return "destructive"
    default:
      return "outline"
  }
}

// ── Skeleton ──

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-1">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 border-b border-slate-100 px-4 py-3"
        >
          <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-20 animate-pulse rounded bg-slate-200" />
          <div className="h-5 w-16 animate-pulse rounded-full bg-slate-200" />
        </div>
      ))}
    </div>
  )
}

// ── Component ──

export default function AdminDashboard() {
  const { user } = useAuth()

  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoadingStats, setIsLoadingStats] = useState(true)

  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(true)

  const [recentExperts, setRecentExperts] = useState<RecentExpert[]>([])
  const [isLoadingExperts, setIsLoadingExperts] = useState(true)

  const [recentConsultations, setRecentConsultations] = useState<
    RecentConsultation[]
  >([])
  const [isLoadingConsultations, setIsLoadingConsultations] = useState(true)

  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([])
  const [isLoadingPayments, setIsLoadingPayments] = useState(true)

  // ── Data fetching ──

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await api.get<DashboardStats>("/admin/dashboard")
        setStats(data)
      } catch (err: any) {
        toast({
          title: "Failed to load dashboard stats",
          description: err?.message ?? "An unexpected error occurred",
          variant: "destructive",
        })
      } finally {
        setIsLoadingStats(false)
      }
    }
    loadStats()
  }, [])

  useEffect(() => {
    const loadRecentUsers = async () => {
      try {
        const data = await api.get<RecentUser[]>(
          "/admin/users/recent?limit=5",
        )
        setRecentUsers(Array.isArray(data) ? data : [])
      } catch {
        // Keep empty on error
      } finally {
        setIsLoadingUsers(false)
      }
    }
    loadRecentUsers()
  }, [])

  useEffect(() => {
    const loadRecentExperts = async () => {
      try {
        const data = await api.get<PageResponse<RecentExpert>>(
          "/admin/experts?page=0",
        )
        setRecentExperts(data?.content?.slice(0, 5) ?? [])
      } catch {
        // Keep empty on error
      } finally {
        setIsLoadingExperts(false)
      }
    }
    loadRecentExperts()
  }, [])

  useEffect(() => {
    const loadRecentConsultations = async () => {
      try {
        const data = await api.get<PageResponse<RecentConsultation>>(
          "/admin/consultations?page=0",
        )
        setRecentConsultations(data?.content?.slice(0, 5) ?? [])
      } catch {
        // Keep empty on error
      } finally {
        setIsLoadingConsultations(false)
      }
    }
    loadRecentConsultations()
  }, [])

  useEffect(() => {
    const loadRecentPayments = async () => {
      try {
        const data = await api.get<PageResponse<RecentPayment>>(
          "/admin/payments?page=0",
        )
        setRecentPayments(data?.content?.slice(0, 5) ?? [])
      } catch {
        // Keep empty on error
      } finally {
        setIsLoadingPayments(false)
      }
    }
    loadRecentPayments()
  }, [])

  // ── Render ──

  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
      >
        <h2 className="text-2xl font-bold tracking-tight text-slate-950">
          Welcome back, {user?.firstName || "Admin"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Monitor platform activity, manage users, and track revenue.
        </p>
      </motion.section>

      {/* Stat Cards */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {isLoadingStats ? (
          Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="h-3 w-20 animate-pulse rounded bg-slate-200" />
                    <div className="h-7 w-24 animate-pulse rounded bg-slate-200" />
                  </div>
                  <div className="size-10 animate-pulse rounded-xl bg-slate-200" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : stats ? (
          <>
            <StatCard
              label="Total Users"
              value={String(stats.totalUsers)}
              icon={Users}
              color="bg-blue-50 text-blue-600"
            />
            <StatCard
              label="Total Experts"
              value={String(stats.totalExperts)}
              icon={UserCheck}
              color="bg-green-50 text-green-600"
            />
            <StatCard
              label="Total Clients"
              value={String(stats.totalClients)}
              icon={Users}
              color="bg-purple-50 text-purple-600"
            />
            <StatCard
              label="Active Consultations"
              value={String(stats.activeConsultations)}
              icon={CalendarCheck}
              color="bg-indigo-50 text-indigo-600"
            />
            <StatCard
              label="Today's Revenue"
              value={formatINR(stats.todayRevenue)}
              icon={TrendingUp}
              color="bg-emerald-50 text-emerald-600"
            />
            <StatCard
              label="Platform Revenue"
              value={formatINR(stats.platformRevenue)}
              icon={DollarSign}
              color="bg-amber-50 text-amber-600"
            />
            <StatCard
              label="Pending Payouts"
              value={formatINR(stats.pendingPayouts)}
              icon={Wallet}
              color="bg-rose-50 text-rose-600"
            />
            <StatCard
              label="Completed Consultations"
              value={String(stats.completedConsultations)}
              icon={CheckCircle}
              color="bg-cyan-50 text-cyan-600"
            />
          </>
        ) : (
          <div className="col-span-full">
            <p className="py-6 text-center text-sm text-slate-500">
              Unable to load statistics.
            </p>
          </div>
        )}
      </motion.section>

      {/* Data Tables Grid */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid gap-5 lg:grid-cols-2"
      >
        {/* Latest Users */}
        <Card>
          <CardHeader className="p-4 pb-0">
            <CardTitle className="text-base">Latest Users</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-3">
            {isLoadingUsers ? (
              <TableSkeleton rows={5} />
            ) : recentUsers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase text-slate-500">
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Email</th>
                      <th className="px-3 py-2">Role</th>
                      <th className="px-3 py-2">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentUsers.map((u) => (
                      <tr
                        key={u.id}
                        className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="px-3 py-2.5 font-medium text-slate-950">
                          {u.firstName} {u.lastName}
                        </td>
                        <td className="px-3 py-2.5 text-slate-600">
                          {u.email}
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge variant="outline">{u.role}</Badge>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-slate-500">
                          {formatDate(u.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-slate-500">
                No data available.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Latest Experts */}
        <Card>
          <CardHeader className="p-4 pb-0">
            <CardTitle className="text-base">Latest Experts</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-3">
            {isLoadingExperts ? (
              <TableSkeleton rows={5} />
            ) : recentExperts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase text-slate-500">
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Email</th>
                      <th className="px-3 py-2">Country</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentExperts.map((expert) => (
                      <tr
                        key={expert.id}
                        className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="px-3 py-2.5 font-medium text-slate-950">
                          {expert.firstName} {expert.lastName}
                        </td>
                        <td className="px-3 py-2.5 text-slate-600">
                          {expert.email}
                        </td>
                        <td className="px-3 py-2.5 text-slate-600">
                          {expert.country || "—"}
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge variant={statusBadgeVariant(expert.status)}>
                            {expert.status || "Unknown"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-slate-500">
                No data available.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Latest Consultations */}
        <Card>
          <CardHeader className="p-4 pb-0">
            <CardTitle className="text-base">
              Latest Consultations
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-3">
            {isLoadingConsultations ? (
              <TableSkeleton rows={5} />
            ) : recentConsultations.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase text-slate-500">
                      <th className="px-3 py-2">ID</th>
                      <th className="px-3 py-2">Client ID</th>
                      <th className="px-3 py-2">Expert ID</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentConsultations.map((c) => (
                      <tr
                        key={c.id}
                        className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="px-3 py-2.5 text-xs font-mono text-slate-500">
                          {c.id?.slice(-8)}
                        </td>
                        <td className="px-3 py-2.5 text-xs font-mono text-slate-500">
                          {c.clientId?.slice(-8)}
                        </td>
                        <td className="px-3 py-2.5 text-xs font-mono text-slate-500">
                          {c.expertId?.slice(-8)}
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge variant={statusBadgeVariant(c.status)}>
                            {c.status}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-slate-500">
                          {formatDate(c.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-slate-500">
                No data available.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Latest Payments */}
        <Card>
          <CardHeader className="p-4 pb-0">
            <CardTitle className="text-base">Latest Payments</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-3">
            {isLoadingPayments ? (
              <TableSkeleton rows={5} />
            ) : recentPayments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase text-slate-500">
                      <th className="px-3 py-2">ID</th>
                      <th className="px-3 py-2">Amount</th>
                      <th className="px-3 py-2">Currency</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentPayments.map((p) => (
                      <tr
                        key={p.id}
                        className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="px-3 py-2.5 text-xs font-mono text-slate-500">
                          {p.id?.slice(-8)}
                        </td>
                        <td className="px-3 py-2.5 font-semibold text-emerald-600">
                          {formatINR(p.amount)}
                        </td>
                        <td className="px-3 py-2.5 text-slate-600">
                          {p.currency || "INR"}
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge variant={statusBadgeVariant(p.status)}>
                            {p.status}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-slate-500">
                          {formatDate(p.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-slate-500">
                No data available.
              </p>
            )}
          </CardContent>
        </Card>
      </motion.section>
    </div>
  )
}
