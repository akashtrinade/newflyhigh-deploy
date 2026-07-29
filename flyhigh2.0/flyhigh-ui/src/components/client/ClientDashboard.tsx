import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { ArrowRight, CalendarCheck, Clock, MessageSquareText, Search, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/contexts/AuthContext"
import { ExpertCard } from "./ExpertCard"
import {
  fetchExpertFilters,
  searchExperts,
  type DropdownField,
  type ExpertSummary,
} from "@/lib/expert-search"
import { fetchCallHistory, type CallHistoryItem } from "@/lib/call-requests"
import { api } from "@/api/client"

export default function ClientDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [onlineExperts, setOnlineExperts] = useState<ExpertSummary[]>([])
  const [topRatedExperts, setTopRatedExperts] = useState<ExpertSummary[]>([])
  const [categories, setCategories] = useState<DropdownField | null>(null)
  const [isLoadingExperts, setIsLoadingExperts] = useState(true)
  const [sessions, setSessions] = useState<CallHistoryItem[]>([])
  const [isLoadingSessions, setIsLoadingSessions] = useState(true)
  const [pendingFeedback, setPendingFeedback] = useState<CallHistoryItem[]>([])

  // Fetch online experts and top-rated experts on mount
  useEffect(() => {
    const loadExperts = async () => {
      try {
        const [onlineResult, topRatedResult, filtersData] = await Promise.all([
          searchExperts({ availability: "Online", size: 4 }),
          searchExperts({ sort: "Highest Rated", size: 4 }),
          fetchExpertFilters(),
        ])
        setOnlineExperts(onlineResult.experts)
        setTopRatedExperts(topRatedResult.experts)
        setCategories(
          filtersData.fields.find((f) => f.key === "category") ?? null
        )
      } catch {
        // Dashboard expert sections will be empty; core dashboard still works
      } finally {
        setIsLoadingExperts(false)
      }
    }
    loadExperts()
  }, [])

  // Fetch real call history for the client
  useEffect(() => {
    const loadSessions = async () => {
      try {
        const history = await fetchCallHistory()
        setSessions(history)
      } catch {
        // Keep sessions empty on error
      } finally {
        setIsLoadingSessions(false)
      }
    }
    loadSessions()
  }, [])

  // Fetch pending feedback
  useEffect(() => {
    if (!user?.email) return
    const loadPendingFeedback = async () => {
      try {
        const data = await api.get<CallHistoryItem[]>(
          `/video-call/pending-feedback/${encodeURIComponent(user.email)}`,
        )
        setPendingFeedback(Array.isArray(data) ? data : [])
      } catch {
        setPendingFeedback([])
      }
    }
    loadPendingFeedback()
  }, [user])

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const query = String(formData.get("query") || "").trim()
    navigate(query ? `/search-experts?q=${encodeURIComponent(query)}` : "/search-experts")
  }

  // Memoized derived data
  const categoryCards = useMemo(() => {
    const icons = [Sparkles, ArrowRight, Clock, Search, CalendarCheck, Sparkles, ArrowRight, Clock]
    const colors = [
      "bg-sky-50 text-sky-700 ring-sky-100",
      "bg-emerald-50 text-emerald-700 ring-emerald-100",
      "bg-indigo-50 text-indigo-700 ring-indigo-100",
      "bg-cyan-50 text-cyan-700 ring-cyan-100",
      "bg-amber-50 text-amber-700 ring-amber-100",
      "bg-rose-50 text-rose-700 ring-rose-100",
      "bg-violet-50 text-violet-700 ring-violet-100",
      "bg-teal-50 text-teal-700 ring-teal-100",
    ]
    return (categories?.options ?? []).slice(0, 8).map((option, index) => ({
      name: option.label,
      icon: icons[index % icons.length],
      color: colors[index % colors.length],
    }))
  }, [categories])

  return (
      <div className="space-y-6">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-6"
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
                <Sparkles className="size-3.5" />
                Client Dashboard
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">
                Welcome back, {user?.firstName || "there"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Find the right expert, track your calls, and keep your learning momentum moving.
              </p>
            </div>
            <form onSubmit={handleSearch} className="w-full max-w-xl">
              <div className="flex overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-1 shadow-sm focus-within:border-slate-400">
                <div className="flex flex-1 items-center gap-2 px-3">
                  <Search className="size-4 text-slate-400" />
                  <input
                    name="query"
                    placeholder="Search by skill, category, or expert"
                    className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                  />
                </div>
                <Button className="h-11 rounded-md bg-slate-950 px-5 hover:bg-slate-800">
                  Search
                </Button>
              </div>
            </form>
          </div>
        </motion.section>

        {/* Pending feedback reminder */}
        {pendingFeedback.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {pendingFeedback.map((item) => (
              <Card
                key={item.id}
                className="border-amber-200 bg-amber-50 shadow-sm"
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                      <MessageSquareText className="size-5" />
                    </span>
                    <div>
                      <p className="font-semibold text-amber-900">
                        You have 1 consultation awaiting your feedback
                      </p>
                      <p className="text-sm text-amber-700">
                        {item.expertName
                          ? `How was your session with ${item.expertName}?`
                          : "Share your experience to help the expert improve."}
                      </p>
                    </div>
                  </div>
                  <Button
                    className="shrink-0 bg-amber-600 hover:bg-amber-700"
                    onClick={() =>
                      navigate(
                        `/call-completed?callRequestId=${encodeURIComponent(item.id || "")}&peerName=${encodeURIComponent(item.expertName || "Expert")}&duration=0&amount=0&dateTime=${encodeURIComponent(item.createdAt || "")}`,
                      )
                    }
                  >
                    Leave Feedback
                  </Button>
                </CardContent>
              </Card>
            ))}
          </motion.section>
        )}

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-950">Browse Categories</h2>
            <Button asChild variant="ghost" className="gap-2">
              <Link to="/search-experts">
                Browse All
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {categoryCards.map((category) => {
              const Icon = category.icon
              return (
                <Link
                  key={category.name}
                  to={`/search-experts?category=${encodeURIComponent(category.name)}`}
                  className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className={`mb-4 flex size-10 items-center justify-center rounded-lg ring-1 ${category.color}`}>
                    <Icon className="size-5" />
                  </div>
                  <h3 className="font-semibold text-slate-950">{category.name}</h3>
                  <p className="mt-1 text-sm text-slate-500">Browse experts</p>
                </Link>
              )
            })}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-6">
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-950">Online Experts</h2>
                <Link to="/search-experts?availability=Online" className="text-sm font-semibold text-slate-700 hover:text-slate-950">
                  View online
                </Link>
              </div>
              {isLoadingExperts ? (
                <div className="flex items-center justify-center py-8">
                  <div className="size-6 animate-spin rounded-full border-3 border-slate-200 border-t-[#2563EB]" />
                </div>
              ) : onlineExperts.length > 0 ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  {onlineExperts.slice(0, 2).map((expert) => (
                    <ExpertCard key={expert.id} expert={expert} />
                  ))}
                </div>
              ) : (
                <p className="py-6 text-center text-sm text-slate-500">
                  No online experts right now. Check back soon.
                </p>
              )}
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-950">Top Rated Experts</h2>
                <Link to="/search-experts?sort=Highest%20Rated" className="text-sm font-semibold text-slate-700 hover:text-slate-950">
                  See ranking
                </Link>
              </div>
              {isLoadingExperts ? (
                <div className="flex items-center justify-center py-8">
                  <div className="size-6 animate-spin rounded-full border-3 border-slate-200 border-t-[#2563EB]" />
                </div>
              ) : topRatedExperts.length > 0 ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  {topRatedExperts.slice(0, 2).map((expert) => (
                    <ExpertCard key={expert.id} expert={expert} />
                  ))}
                </div>
              ) : (
                <p className="py-6 text-center text-sm text-slate-500">
                  No experts available yet.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <Card className="rounded-lg border-slate-200 shadow-sm">
              <CardHeader className="p-4 pb-0">
                <CardTitle className="text-base">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-4">
                {isLoadingSessions ? (
                  <p className="py-4 text-center text-sm text-slate-500">Loading activity...</p>
                ) : sessions.length > 0 ? (
                  sessions.slice(0, 5).map((session) => (
                    <div key={session.id} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                      <p className="text-sm font-semibold text-slate-950">
                        {session.status === "COMPLETED" ? "Completed session" : session.status === "PENDING" ? "Requested session" : session.status === "ACCEPTED" ? "Accepted session" : "Session update"}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {session.expertName ? `With ${session.expertName}` : "Session activity"}
                        {session.topic ? ` — ${session.topic}` : ""}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {session.createdAt ? new Date(session.createdAt).toLocaleString() : ""}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="py-4 text-center text-sm text-slate-500">No recent activity.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
  )
}
