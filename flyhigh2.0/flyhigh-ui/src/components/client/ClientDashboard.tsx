import { useEffect, useMemo, useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { motion, useInView } from "framer-motion"
import {
  ArrowRight,
  BookOpen,
  CalendarCheck,
  Clock,
  MessageSquareText,
  Phone,
  Search,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react"

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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
} as const

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 260, damping: 24 },
  },
} as const

const scaleVariants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 300, damping: 22 },
  },
} as const

function FloatingOrb({
  className,
  delay = 0,
}: {
  className?: string
  delay?: number
}) {
  return (
    <motion.div
      className={className}
      animate={{
        y: [0, -18, 0],
        x: [0, 8, 0],
        scale: [1, 1.05, 1],
      }}
      transition={{
        duration: 7,
        repeat: Infinity,
        ease: "easeInOut",
        delay,
      }}
    />
  )
}

function AnimatedCounter({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <p className="text-2xl font-bold tracking-tight text-white md:text-3xl">{value}</p>
      <p className="mt-0.5 text-xs font-medium text-white/70">{label}</p>
    </div>
  )
}

function SectionHeader({
  title,
  actionLabel,
  actionTo,
}: {
  title: string
  actionLabel?: string
  actionTo?: string
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-lg font-bold tracking-tight text-slate-900 md:text-xl">{title}</h2>
      {actionLabel && actionTo && (
        <Button asChild variant="ghost" className="gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900">
          <Link to={actionTo}>
            {actionLabel}
            <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      )}
    </div>
  )
}

function ExpertSection({ children }: { children: React.ReactNode }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-60px" })
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={containerVariants}
    >
      {children}
    </motion.div>
  )
}

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
        setCategories(filtersData.fields.find((f) => f.key === "category") ?? null)
      } catch {
        // Dashboard expert sections will be empty; core dashboard still works
      } finally {
        setIsLoadingExperts(false)
      }
    }
    loadExperts()
  }, [])

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

  const categoryCards = useMemo(() => {
    const icons = [Sparkles, Zap, Clock, Search, CalendarCheck, BookOpen, Users, TrendingUp]
    const gradients = [
      "from-sky-400 to-blue-600",
      "from-emerald-400 to-teal-600",
      "from-violet-400 to-purple-600",
      "from-cyan-400 to-sky-600",
      "from-amber-400 to-orange-600",
      "from-rose-400 to-pink-600",
      "from-indigo-400 to-blue-700",
      "from-teal-400 to-emerald-600",
    ]
    return (categories?.options ?? []).slice(0, 8).map((option, index) => ({
      name: option.label,
      icon: icons[index % icons.length],
      gradient: gradients[index % gradients.length],
    }))
  }, [categories])

  const quickActions = [
    { icon: Phone, label: "Connect Now", desc: "Talk to an online expert", to: "/search-experts?availability=Online", gradient: "from-emerald-500 to-teal-600" },
    { icon: Search, label: "Browse Experts", desc: "Find the right match", to: "/search-experts", gradient: "from-blue-500 to-indigo-600" },
    { icon: CalendarCheck, label: "My Sessions", desc: "View past & upcoming", to: "/my-sessions", gradient: "from-violet-500 to-purple-600" },
    { icon: Star, label: "Top Rated", desc: "See best experts", to: "/search-experts?sort=Highest%20Rated", gradient: "from-amber-500 to-orange-600" },
  ]

  const recentCount = sessions.length
  const completedCount = sessions.filter((s) => s.status === "COMPLETED").length

  return (
    <div className="space-y-8">
      {/* ── Hero Section (self-contained dark background) ── */}
      <motion.section
        variants={scaleVariants}
        initial="hidden"
        animate="visible"
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 shadow-2xl md:p-8"
      >
        {/* Mesh overlay inside the hero only */}
        <div className="pointer-events-none absolute inset-0 hero-bg-mesh opacity-60" />
        <div className="pointer-events-none absolute inset-0 hero-bg-grid opacity-30" />

        {/* Floating orbs inside hero */}
        <FloatingOrb
          className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-gradient-to-br from-indigo-400/20 to-purple-500/10 blur-3xl"
          delay={0}
        />
        <FloatingOrb
          className="pointer-events-none absolute -bottom-12 -left-12 size-52 rounded-full bg-gradient-to-tr from-cyan-400/15 to-blue-500/10 blur-3xl"
          delay={2}
        />

        {/* Dot pattern */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        {/* Diagonal shine */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.04] via-transparent to-transparent" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl space-y-4">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
              className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-500/15 px-4 py-1.5 text-xs font-semibold text-emerald-300"
            >
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
              </span>
              Client Dashboard
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="max-w-lg text-base leading-relaxed text-white/60 md:text-lg"
            >
              Find the right expert, track your calls, and keep your learning momentum moving.
            </motion.p>
          </div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7, type: "spring" }}
            className="flex shrink-0 gap-6 rounded-xl border border-white/10 bg-white/[0.06] px-6 py-4 backdrop-blur-sm md:gap-8"
          >
            <AnimatedCounter value={String(recentCount)} label="Total Sessions" />
            <div className="w-px bg-white/15" />
            <AnimatedCounter value={String(completedCount)} label="Completed" />
            <div className="w-px bg-white/15" />
            <AnimatedCounter value={String(onlineExperts.length)} label="Online Now" />
          </motion.div>
        </div>

        {/* Waveform decoration */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 flex h-8 items-end gap-[3px] px-4 opacity-25">
          {Array.from({ length: 60 }).map((_, i) => (
            <div
              key={i}
              className="waveform-bar w-1 rounded-t-full bg-gradient-to-t from-indigo-400 to-purple-400"
              style={{
                height: `${12 + Math.sin(i * 0.5) * 10 + Math.random() * 8}px`,
                animationDelay: `${i * 0.06}s`,
              }}
            />
          ))}
        </div>
      </motion.section>

      {/* ── Everything below sits on the normal white page background ── */}
      <motion.div
        className="space-y-8"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* ── Pending Feedback ── */}
        {pendingFeedback.length > 0 && (
          <motion.section variants={itemVariants}>
            {pendingFeedback.map((item) => (
              <Card
                key={item.id}
                className="overflow-hidden border-amber-200/60 bg-gradient-to-r from-amber-50 to-orange-50 shadow-sm"
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md shadow-amber-200">
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
                    className="shrink-0 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-200 hover:from-amber-600 hover:to-orange-600"
                    onClick={() =>
                      navigate(
                        `/call-completed?callRequestId=${encodeURIComponent(item.id || "")}&interactionId=${encodeURIComponent(item.interactionId || "")}&peerName=${encodeURIComponent(item.expertName || "Expert")}&duration=0&amount=0&dateTime=${encodeURIComponent(item.createdAt || "")}`,
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

        {/* ── Quick Actions ── */}
        <motion.section variants={containerVariants}>
          <SectionHeader title="Quick Actions" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <motion.div key={action.label} variants={itemVariants}>
                  <Link
                    to={action.to}
                    className="group relative flex flex-col items-center gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg"
                  >
                    <div className={`flex size-12 items-center justify-center rounded-xl bg-gradient-to-br ${action.gradient} text-white shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                      <Icon className="size-5" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-slate-900">{action.label}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{action.desc}</p>
                    </div>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        </motion.section>

        {/* ── Browse Categories ── */}
        {categoryCards.length > 0 && (
          <motion.section variants={containerVariants}>
            <SectionHeader title="Browse Categories" actionLabel="Browse All" actionTo="/search-experts" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {categoryCards.map((category) => {
                const Icon = category.icon
                return (
                  <motion.div key={category.name} variants={itemVariants}>
                    <Link
                      to={`/search-experts?category=${encodeURIComponent(category.name)}`}
                      className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                    >
                      <div className={`flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${category.gradient} text-white shadow-md transition-transform duration-300 group-hover:scale-110`}>
                        <Icon className="size-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate font-bold text-slate-900">{category.name}</h3>
                        <p className="text-xs text-slate-500">Browse experts</p>
                      </div>
                      <ArrowRight className="ml-auto size-4 shrink-0 text-slate-300 transition-all duration-300 group-hover:translate-x-1 group-hover:text-slate-600" />
                    </Link>
                  </motion.div>
                )
              })}
            </div>
          </motion.section>
        )}

        {/* ── Experts & Activity Grid ── */}
        <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-8">
            {/* Online Experts */}
            <ExpertSection>
              <motion.div variants={itemVariants}>
                <SectionHeader title="Online Experts" actionLabel="View online" actionTo="/search-experts?availability=Online" />
                {isLoadingExperts ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="relative">
                      <div className="size-8 animate-spin rounded-full border-[3px] border-slate-200 border-t-indigo-500" />
                      <div className="absolute inset-0 size-8 animate-spin rounded-full border-[3px] border-transparent border-b-purple-400 [animation-direction:reverse] [animation-duration:1.5s]" />
                    </div>
                  </div>
                ) : onlineExperts.length > 0 ? (
                  <div className="grid gap-4 lg:grid-cols-2">
                    {onlineExperts.slice(0, 2).map((expert) => (
                      <ExpertCard key={expert.id} expert={expert} />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center">
                    <div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                      <Users className="size-6" />
                    </div>
                    <p className="text-sm font-medium text-slate-500">No online experts right now</p>
                    <p className="text-xs text-slate-400">Check back soon</p>
                  </div>
                )}
              </motion.div>
            </ExpertSection>

            {/* Top Rated Experts */}
            <ExpertSection>
              <motion.div variants={itemVariants}>
                <SectionHeader title="Top Rated Experts" actionLabel="See ranking" actionTo="/search-experts?sort=Highest%20Rated" />
                {isLoadingExperts ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="relative">
                      <div className="size-8 animate-spin rounded-full border-[3px] border-slate-200 border-t-indigo-500" />
                      <div className="absolute inset-0 size-8 animate-spin rounded-full border-[3px] border-transparent border-b-purple-400 [animation-direction:reverse] [animation-duration:1.5s]" />
                    </div>
                  </div>
                ) : topRatedExperts.length > 0 ? (
                  <div className="grid gap-4 lg:grid-cols-2">
                    {topRatedExperts.slice(0, 2).map((expert) => (
                      <ExpertCard key={expert.id} expert={expert} />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center">
                    <div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                      <Star className="size-6" />
                    </div>
                    <p className="text-sm font-medium text-slate-500">No experts available yet</p>
                    <p className="text-xs text-slate-400">We are onboarding experts</p>
                  </div>
                )}
              </motion.div>
            </ExpertSection>
          </div>

          {/* Recent Activity Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
          >
            <Card className="overflow-hidden rounded-2xl border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white p-4 pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                    <Clock className="size-3.5" />
                  </div>
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 p-4">
                {isLoadingSessions ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="size-6 animate-spin rounded-full border-[3px] border-slate-200 border-t-indigo-500" />
                  </div>
                ) : sessions.length > 0 ? (
                  sessions.slice(0, 5).map((session, i) => (
                    <motion.div
                      key={session.id}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + i * 0.07 }}
                      className="group rounded-xl border border-transparent p-3 transition-colors hover:border-slate-100 hover:bg-slate-50"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white ${
                          session.status === "COMPLETED"
                            ? "bg-gradient-to-br from-emerald-400 to-teal-500"
                            : session.status === "PENDING"
                              ? "bg-gradient-to-br from-amber-400 to-orange-500"
                              : session.status === "ACCEPTED"
                                ? "bg-gradient-to-br from-blue-400 to-indigo-500"
                                : "bg-gradient-to-br from-slate-400 to-slate-500"
                        }`}>
                          {session.status === "COMPLETED" ? "✓" : session.status === "PENDING" ? "⏳" : session.status === "ACCEPTED" ? "→" : "•"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-900">
                            {session.status === "COMPLETED"
                              ? "Completed session"
                              : session.status === "PENDING"
                                ? "Requested session"
                                : session.status === "ACCEPTED"
                                  ? "Accepted session"
                                  : "Session update"}
                          </p>
                          <p className="mt-0.5 truncate text-sm text-slate-600">
                            {session.expertName ? `With ${session.expertName}` : "Session activity"}
                            {session.topic ? ` — ${session.topic}` : ""}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {session.createdAt
                              ? new Date(session.createdAt).toLocaleString()
                              : ""}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="flex flex-col items-center py-8 text-center">
                    <div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                      <TrendingUp className="size-6" />
                    </div>
                    <p className="text-sm font-medium text-slate-500">No recent activity</p>
                    <p className="text-xs text-slate-400">Your sessions will appear here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </section>
      </motion.div>
    </div>
  )
}
