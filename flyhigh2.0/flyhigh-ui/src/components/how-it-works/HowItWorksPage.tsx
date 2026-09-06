import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  ArrowRight,
  CheckCircle,
  Clock,
  DollarSign,
  Edit3,
  Heart,
  MessageSquare,
  Shield,
  Sparkles,
  Star,
  UserPlus,
  Users,
  Video,
  Zap,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/layout/Footer"
import { Reveal } from "@/components/home/Reveal"
import { SectionLabel } from "@/components/home/SectionLabel"
import { useAuth } from "@/contexts/AuthContext"
import { fetchHomePageStats } from "@/lib/public-stats"
import type { HomePageStats } from "@/types/public-stats"

/* ─── Data ─── */

type CustomerStep = {
  number: string
  icon: typeof UserPlus
  title: string
  description: string
  gradient: string
  iconColor: string
  iconBg: string
  nodeColor: string
  barColor: string
}

const customerSteps: CustomerStep[] = [
  {
    number: "01",
    icon: UserPlus,
    title: "Register",
    description:
      "Register FlyHigh as a Customer to unlock access to our trusted network.",
    gradient: "from-indigo-500 to-purple-600",
    iconColor: "text-indigo-600",
    iconBg: "bg-indigo-100",
    nodeColor: "border-indigo-400",
    barColor: "bg-indigo-400",
  },
  {
    number: "02",
    icon: Edit3,
    title: "Describe",
    description:
      "Tell us what you need in a few lines. No forms, no friction — just your situation.",
    gradient: "from-emerald-500 to-teal-600",
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-100",
    nodeColor: "border-emerald-400",
    barColor: "bg-emerald-400",
  },
  {
    number: "03",
    icon: Sparkles,
    title: "Match",
    description:
      "Our system matches you with a verified expert in the relevant field. Credentials checked, quality assured.",
    gradient: "from-amber-500 to-orange-600",
    iconColor: "text-amber-600",
    iconBg: "bg-amber-100",
    nodeColor: "border-amber-400",
    barColor: "bg-amber-400",
  },
  {
    number: "04",
    icon: Video,
    title: "Connect",
    description:
      "Start a session — chat, voice, or video. Whatever feels right for the conversation.",
    gradient: "from-blue-500 to-cyan-600",
    iconColor: "text-blue-600",
    iconBg: "bg-blue-100",
    nodeColor: "border-blue-400",
    barColor: "bg-blue-400",
  },
  {
    number: "05",
    icon: CheckCircle,
    title: "Act",
    description:
      "Walk away with clear next steps you can act on immediately. Rate and improve future matches.",
    gradient: "from-violet-500 to-purple-600",
    iconColor: "text-violet-600",
    iconBg: "bg-violet-100",
    nodeColor: "border-violet-400",
    barColor: "bg-violet-400",
  },
]

type ExpertStep = {
  number: string
  icon: typeof UserPlus
  title: string
  description: string
  gradient: string
}

const expertSteps: ExpertStep[] = [
  {
    number: "01",
    icon: UserPlus,
    title: "Register",
    description:
      "Register FlyHigh as an expert to start sharing your professional knowledge.",
    gradient: "from-indigo-500 to-purple-600",
  },
  {
    number: "02",
    icon: Shield,
    title: "Get Verified",
    description:
      "Build your professional profile with verified credentials in your field.",
    gradient: "from-emerald-500 to-teal-600",
  },
  {
    number: "03",
    icon: Heart,
    title: "Help Real People",
    description:
      "Support individuals facing real problems with real deadlines.",
    gradient: "from-rose-500 to-pink-600",
  },
  {
    number: "04",
    icon: DollarSign,
    title: "Earn On Your Terms",
    description:
      "Monetize your expertise professionally — set your own availability.",
    gradient: "from-amber-500 to-orange-600",
  },
]

/* ─── Component ─── */

export default function HowItWorksPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [stats, setStats] = useState<HomePageStats | null>(null)

  useEffect(() => { window.scrollTo(0, 0) }, [])

  useEffect(() => {
    fetchHomePageStats().then(setStats).catch(() => {})
  }, [])

  const expertCountFormatted = stats?.verifiedExperts
    ? stats.verifiedExperts >= 1000
      ? `${(stats.verifiedExperts / 1000).toFixed(1).replace(/\.0$/, "")}K+`
      : `${stats.verifiedExperts}+`
    : "5,000+"
  const satisfactionRate = stats?.averageRating
    ? `${(stats.averageRating * 100 / 5).toFixed(0)}%`
    : "98%"

  const statsDisplay = [
    { number: "24/7", label: "Support Available", icon: Clock },
    { number: expertCountFormatted, label: "Active Experts", icon: Users },
    { number: satisfactionRate, label: "Satisfaction Rate", icon: Star },
    { number: "<24h", label: "Avg. Resolution", icon: Zap },
  ]

  const handleFindExpert = () => navigate(user ? "/search-experts" : "/login")
  const handleBecomeExpert = () => navigate(user ? "/expert/profile" : "/signup?role=expert")
  const handleGetStarted = () => navigate(user ? "/search-experts" : "/signup")

  return (
    <div className="min-h-svh bg-white">
      <Navbar />

      {/* ═══════════════════════════════════ */}
      {/* HERO */}
      {/* ═══════════════════════════════════ */}
      <section className="relative overflow-hidden pt-28 pb-16 md:pt-36 md:pb-24">
        <div aria-hidden="true" className="hero-bg pointer-events-none absolute inset-0">
          <div className="hero-bg-base absolute inset-0" />
          <div className="hero-bg-mesh absolute inset-0" />
          <div className="hero-bg-grid absolute inset-0" />
          <div className="hero-bg-shine absolute inset-0" />
          <div className="hero-bg-fade absolute inset-x-0 bottom-0 h-40" />
        </div>

        <div className="relative mx-auto max-w-4xl px-4 text-center md:px-6">
          <div className="hero-reveal hero-reveal-delay-1">
            <Badge
              variant="outline"
              className="mb-6 h-7 gap-1.5 border-indigo-200 bg-indigo-50 px-3 font-medium text-[var(--flyhigh-primary)]"
            >
              <Zap className="size-3 fill-[var(--flyhigh-accent)] text-[var(--flyhigh-accent)]" />
              How FlyHigh Works
            </Badge>
          </div>

          <h1 className="font-heading text-4xl leading-[1.08] font-bold tracking-tight text-[var(--flyhigh-text)] sm:text-5xl md:text-[3.25rem] lg:text-[3.75rem]">
            <span className="hero-reveal hero-reveal-delay-2 block">
              From Question to Clarity
            </span>
            <span className="hero-reveal hero-reveal-delay-3 block text-gradient-brand">
              In Five Simple Steps.
            </span>
          </h1>

          <p className="hero-reveal hero-reveal-delay-4 mx-auto mt-6 max-w-2xl text-base leading-relaxed text-body md:text-lg">
            FlyHigh connects you with verified experts through a seamless,
            secure process. No subscriptions, no hidden fees — just real help
            when you need it.
          </p>

          {/* Stats row */}
          <div className="hero-reveal hero-reveal-delay-5 mt-10 grid grid-cols-2 divide-x divide-slate-200 rounded-2xl border border-slate-200 bg-white/70 px-4 py-4 shadow-sm backdrop-blur-sm md:mx-auto md:max-w-2xl md:grid-cols-4">
            {statsDisplay.map((stat) => {
              const Icon = stat.icon
              return (
                <div
                  key={stat.label}
                  className="flex flex-col items-center px-2 py-1 text-center"
                >
                  <Icon className="mb-1 size-4 text-[var(--flyhigh-primary)]" />
                  <span className="text-lg font-bold tracking-tight text-[var(--flyhigh-text)] md:text-xl">
                    {stat.number}
                  </span>
                  <span className="mt-0.5 text-[10px] font-medium text-slate-500 md:text-xs">
                    {stat.label}
                  </span>
                </div>
              )
            })}
          </div>

          <div className="hero-reveal hero-reveal-delay-6 mt-8 flex flex-wrap justify-center gap-3">
            <Button
              size="lg"
              onClick={handleFindExpert}
              className="h-12 gap-2 bg-[var(--flyhigh-primary)] px-7 text-base shadow-lg shadow-indigo-500/25 hover:bg-[var(--flyhigh-primary-hover)]"
            >
              Find an Expert
              <ArrowRight className="size-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={handleBecomeExpert}
              className="h-12 border-slate-300 px-7 text-base text-slate-700 hover:bg-slate-50"
            >
              Become an Expert
            </Button>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════ */}
      {/* FOR CUSTOMERS — 5-Step Alternating Timeline */}
      {/* ═══════════════════════════════════ */}
      <section className="bg-white py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <Reveal className="mx-auto max-w-2xl text-center">
            <SectionLabel>For Customers</SectionLabel>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-[var(--flyhigh-text)] md:text-4xl">
              From Question to Clarity in Five Steps
            </h2>
            <p className="mt-4 text-body">
              Get expert guidance on your terms — simple, transparent, and
              designed around your needs.
            </p>
          </Reveal>

          {/* Vertical timeline with alternating cards */}
          <div className="relative mt-16">
            {/* Central gradient spine */}
            <div
              aria-hidden="true"
              className="absolute left-8 top-0 hidden h-full w-0.5 bg-gradient-to-b from-indigo-400 via-purple-400 to-violet-400 md:left-1/2 md:block md:-translate-x-px"
            />

            <div className="space-y-12 md:space-y-20">
              {customerSteps.map((step, i) => {
                const Icon = step.icon
                const isLeft = i % 2 === 0

                return (
                  <Reveal key={step.number} delay={i * 100}>
                    <div className="relative flex items-start gap-5 md:gap-0">
                      {/* Timeline node (desktop only) */}
                      <div
                        aria-hidden="true"
                        className={`absolute left-8 top-0 z-10 hidden size-14 -translate-x-1/2 items-center justify-center rounded-2xl bg-gradient-to-br ${step.gradient} shadow-lg md:flex md:left-1/2`}
                      >
                        <span className="text-sm font-bold text-white">
                          {step.number}
                        </span>
                      </div>

                      {/* Card — alternates left/right on desktop */}
                      <div
                        className={`ml-16 w-full md:ml-0 md:w-[calc(50%-2.75rem)] ${
                          isLeft ? "md:mr-auto" : "md:ml-auto"
                        }`}
                      >
                        {/* Mobile step number */}
                        <div className="mb-3 flex items-center gap-3 md:hidden">
                          <span
                            className={`inline-flex size-10 items-center justify-center rounded-xl bg-gradient-to-br ${step.gradient} text-sm font-bold text-white shadow-md`}
                          >
                            {step.number}
                          </span>
                          <span className="text-sm font-semibold tracking-wider text-slate-400 uppercase">
                            Step {i + 1}
                          </span>
                        </div>

                        <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg md:p-8">
                          {/* Top accent bar */}
                          <div
                            className={`absolute top-0 left-0 h-1 w-full bg-gradient-to-r ${step.gradient}`}
                          />

                          {/* Desktop step number badge */}
                          <div className="mb-4 hidden items-center gap-3 md:flex">
                            <span
                              className={`inline-flex size-10 items-center justify-center rounded-xl bg-gradient-to-br ${step.gradient} text-sm font-bold text-white shadow-md`}
                            >
                              {step.number}
                            </span>
                            <span className="text-xs font-semibold tracking-[0.15em] text-slate-400 uppercase">
                              Step {i + 1}
                            </span>
                          </div>

                          <div className="flex items-start gap-4">
                            <div
                              className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${step.iconBg} ${step.iconColor}`}
                            >
                              <Icon className="size-5" />
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-[var(--flyhigh-text)]">
                                {step.title}
                              </h3>
                              <p className="mt-2 text-sm leading-relaxed text-body">
                                {step.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Reveal>
                )
              })}
            </div>

            {/* End dot */}
            <div
              aria-hidden="true"
              className="absolute -bottom-4 left-8 hidden size-3 -translate-x-1/2 rounded-full border-2 border-violet-300 bg-white md:left-1/2 md:block"
            />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════ */}
      {/* FOR EXPERTS — 4-Step Grid */}
      {/* ═══════════════════════════════════ */}
      <section className="relative overflow-hidden bg-[var(--flyhigh-section)] py-16 md:py-24">
        {/* Ambient background blobs */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 right-0 h-96 w-96 -translate-y-1/4 translate-x-1/4 rounded-full bg-amber-200/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-0 h-80 w-80 translate-y-1/4 -translate-x-1/4 rounded-full bg-indigo-200/20 blur-3xl"
        />

        <div className="relative mx-auto max-w-6xl px-4 md:px-6">
          <Reveal className="mx-auto max-w-2xl text-center">
            <SectionLabel>For Experts</SectionLabel>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-[var(--flyhigh-text)] md:text-4xl">
              Let Your Skill Pay You Back
            </h2>
            <p className="mt-4 text-body">
              Share what you already know — professionally, on your schedule,
              with people who genuinely need your guidance.
            </p>
          </Reveal>

          {/* 4-step card grid with connectors */}
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {expertSteps.map((step, i) => {
              const Icon = step.icon
              return (
                <Reveal key={step.number} delay={i * 120}>
                  <div className="group relative flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-slate-300 hover:shadow-xl">
                    {/* Step number badge row */}
                    <div className="mb-5 flex items-center gap-3">
                      <div
                        className={`flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${step.gradient} text-white shadow-md`}
                      >
                        <span className="text-sm font-bold">{step.number}</span>
                      </div>
                      {/* Horizontal connector to next card */}
                      {i < expertSteps.length - 1 && (
                        <div
                          aria-hidden="true"
                          className="hidden h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent lg:block"
                        />
                      )}
                    </div>

                    {/* Icon */}
                    <div
                      className={`mb-4 flex size-12 items-center justify-center rounded-xl bg-gradient-to-br ${step.gradient} shadow-md`}
                    >
                      <Icon className="size-6 text-white" />
                    </div>

                    <h3 className="text-lg font-bold text-[var(--flyhigh-text)]">
                      {step.title}
                    </h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-body">
                      {step.description}
                    </p>
                  </div>
                </Reveal>
              )
            })}
          </div>

          {/* Expert CTA pill + button */}
          <Reveal delay={500}>
            <div className="mt-14 text-center">
              <div className="inline-flex items-center gap-3 rounded-full border border-amber-200 bg-amber-50 px-5 py-2.5">
                <Star className="size-4 text-amber-500" />
                <span className="text-sm font-semibold text-amber-800">
                  Join {expertCountFormatted} experts already earning on FlyHigh
                </span>
              </div>
              <div className="mt-5">
                <Button
                  size="lg"
                  onClick={handleBecomeExpert}
                  className="h-12 gap-2 bg-gradient-to-r from-amber-500 to-orange-600 px-8 text-base font-semibold text-white shadow-lg shadow-amber-500/25 transition-all hover:scale-[1.02] hover:shadow-xl"
                >
                  Start Earning Today
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════════════════════ */}
      {/* CTA */}
      {/* ═══════════════════════════════════ */}
      <section className="relative overflow-hidden bg-white py-20 md:py-28">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-0 h-72 w-72 -translate-y-1/2 rounded-full bg-indigo-200/30 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-0 h-64 w-64 -translate-y-1/2 rounded-full bg-purple-200/30 blur-3xl"
        />

        <div className="relative mx-auto max-w-3xl px-4 text-center md:px-6">
          <Reveal>
            <div
              aria-hidden="true"
              className="mx-auto mb-6 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--flyhigh-primary)] to-[var(--flyhigh-primary-hover)] shadow-lg shadow-indigo-500/20"
            >
              <MessageSquare className="size-7 text-white" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-[var(--flyhigh-text)] md:text-4xl lg:text-5xl">
              Ready to Get Started?
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-body">
              Join thousands of users who trust FlyHigh for expert guidance.
              Your first step toward clarity is just a click away.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button
                size="lg"
                onClick={handleGetStarted}
                className="h-12 gap-2 bg-[var(--flyhigh-primary)] px-8 text-base shadow-lg shadow-indigo-500/25 hover:bg-[var(--flyhigh-primary-hover)]"
              >
                Get Started Now
                <ArrowRight className="size-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={handleBecomeExpert}
                className="h-12 border-slate-300 px-8 text-base text-slate-700 hover:bg-white"
              >
                Become an Expert
              </Button>
            </div>

            {/* Guarantees row */}
            <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-3">
              {[
                { text: "Verified Experts Only", icon: Shield },
                { text: "24/7 Support", icon: Clock },
                { text: "No Hidden Fees", icon: DollarSign },
                { text: "Pay-Per-Session", icon: CheckCircle },
              ].map((g) => {
                const GIcon = g.icon
                return (
                  <span
                    key={g.text}
                    className="flex items-center gap-2 text-sm font-medium text-slate-600"
                  >
                    <GIcon className="size-4 text-[var(--flyhigh-primary)]" />
                    {g.text}
                  </span>
                )
              })}
            </div>
          </Reveal>
        </div>
      </section>

      <Footer />
    </div>
  )
}
