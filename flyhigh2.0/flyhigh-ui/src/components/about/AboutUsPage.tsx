import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowRight, Check, Plane, Star } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/layout/Footer"
import { Reveal } from "@/components/home/Reveal"
import { SectionLabel } from "@/components/home/SectionLabel"
import { useAuth } from "@/contexts/AuthContext"
import { fetchHomePageStats } from "@/lib/public-stats"
import type { HomePageStats } from "@/types/public-stats"

/* ─── Data ─── */
const storyParagraphs = [
  {
    title: "Our Genesis",
    desc: "FlyHigh is an Online Technical Solutions platform dedicated to resolving any kind of technical challenges faced by users. Born from Trinade AI Technologies Pvt Ltd (incorporated December 2020 in Guntur, Andhra Pradesh), FlyHigh launched in 2025 to revolutionize how technical support is delivered across India.",
  },
  {
    title: "Comprehensive Support",
    desc: "Our platform supports a comprehensive range of technical domains including Programming Languages, Assembly Languages, Functional & Performance Testing, DevOps, Databases, AI & ML, Cloud Computing, and much more. We're your one-stop solution for all technical needs.",
  },
  {
    title: "Real-Time Collaboration",
    desc: "What sets us apart is our interactive video conferencing feature that enables real-time collaboration between users and experts. This ensures clear communication and efficient problem-solving, making complex technical issues feel manageable.",
  },
  {
    title: "Integrity & Trust",
    desc: "Our transparent pricing model ensures complete clarity for both users and experts. With detailed quotations based on issue complexity and a secure payment system, we maintain trust and integrity in every transaction.",
  },
]

const milestones = [
  { year: "2020", label: "Founded", desc: "Trinade AI Technologies incorporated in Guntur, Andhra Pradesh" },
  { year: "2022–24", label: "R&D Phase", desc: "Built core AI capabilities and real-time collaboration technology" },
  { year: "2025", label: "FlyHigh Launch", desc: "FlyHigh platform launched — connecting verified experts with users across India" },
  { year: "2025+", label: "Scaling Up", desc: "Growing platform with AI-powered expert matching & insights" },
]

const teamMembers = [
  { name: "Peter", role: "Founder / CMD & CEO", initials: "PE" },
  { name: "Nalini Devi Sale", role: "Director", initials: "NS" },
  { name: "George Gideon", role: "Product & Strategy Lead", initials: "GG" },
  { name: "Renu Kumari", role: "Scrum Master / QA Project Manager", initials: "RK" },
  { name: "Havilah Sale", role: "Business Intelligence Analyst", initials: "HS" },
  { name: "Shubham Sakhare", role: "AI & Full Stack Developer", initials: "SS" },
  { name: "Akash Sakhare", role: "Software Developer", initials: "AS" },
]

/* ─── Inline SVG Icons ─── */
function RocketIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  )
}

function DiamondIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.7 10.3l-1 1.4a1 1 0 0 0 .2 1.4l8 6a1 1 0 0 0 1.2 0l8-6a1 1 0 0 0 .2-1.4l-1-1.4" />
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 7l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  )
}

function ZapIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  )
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}

function TwitterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  )
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

/* ─── Page Component ─── */
export default function AboutUsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [stats, setStats] = useState<HomePageStats | null>(null)

  useEffect(() => { window.scrollTo(0, 0) }, [])

  useEffect(() => {
    fetchHomePageStats().then(setStats).catch(() => {})
  }, [])

  const expertCount = stats?.verifiedExperts
    ? stats.verifiedExperts >= 1000
      ? `${(stats.verifiedExperts / 1000).toFixed(1).replace(/\.0$/, "")}K+`
      : `${stats.verifiedExperts}+`
    : "5,000+"
  const ratingDisplay = stats?.averageRating
    ? `${(stats.averageRating * 100 / 5).toFixed(0)}%`
    : "98%"

  const handleGetStarted = () => navigate(user ? "/search-experts" : "/signup")
  const handleContactUs = () => navigate("/contact")
  const handleJoinToday = () => navigate(user ? "/search-experts" : "/signup")

  return (
    <div className="min-h-svh bg-white">
      <Navbar />

      {/* ═══════════════════════════════════ */}
      {/* HERO */}
      {/* ═══════════════════════════════════ */}
      <section className="relative overflow-hidden pt-28 pb-16 md:pt-36 md:pb-24">
        {/* Background (matching homepage hero) */}
        <div aria-hidden="true" className="hero-bg pointer-events-none absolute inset-0">
          <div className="hero-bg-base absolute inset-0" />
          <div className="hero-bg-mesh absolute inset-0" />
          <div className="hero-bg-grid absolute inset-0" />
          <div className="hero-bg-shine absolute inset-0" />
          <div className="hero-bg-fade absolute inset-x-0 bottom-0 h-40" />
        </div>

        <div className="relative mx-auto max-w-5xl px-4 text-center md:px-6">
          <div className="hero-reveal hero-reveal-delay-1">
            <Badge
              variant="outline"
              className="mb-6 h-7 gap-1.5 border-indigo-200 bg-indigo-50 px-3 font-medium text-[var(--flyhigh-primary)]"
            >
              <Star className="size-3 fill-[var(--flyhigh-accent)] text-[var(--flyhigh-accent)]" />
              Global Technical Network
            </Badge>
          </div>

          <h1 className="font-heading text-4xl leading-[1.08] font-bold tracking-tight text-[var(--flyhigh-text)] sm:text-5xl md:text-[3.25rem] lg:text-[3.75rem]">
            <span className="hero-reveal hero-reveal-delay-2 block">
              Empowering
            </span>
            <span className="hero-reveal hero-reveal-delay-3 block text-gradient-brand">
              Excellence Together.
            </span>
          </h1>

          <p className="hero-reveal hero-reveal-delay-4 mx-auto mt-6 max-w-2xl text-base leading-relaxed text-body md:text-lg">
            We are revolutionizing the way technical support is delivered across
            the globe, providing innovative solutions and expert collaboration at
            scale.
          </p>

          <div className="hero-reveal hero-reveal-delay-5 mt-8 flex flex-wrap justify-center gap-3">
            <Button
              size="lg"
              onClick={handleGetStarted}
              className="h-12 gap-2 bg-[var(--flyhigh-primary)] px-7 text-base shadow-lg shadow-indigo-500/25 hover:bg-[var(--flyhigh-primary-hover)]"
            >
              Get Started
              <ArrowRight className="size-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={handleContactUs}
              className="h-12 border-slate-300 px-7 text-base text-slate-700 hover:bg-slate-50"
            >
              Contact Us
            </Button>
          </div>

          {/* Stats Row */}
          <div className="hero-reveal hero-reveal-delay-6 mt-10 grid grid-cols-3 divide-x divide-slate-200 rounded-2xl border border-slate-200 bg-white/70 px-4 py-5 shadow-sm backdrop-blur-sm md:mx-auto md:max-w-lg">
            {[
              { val: expertCount, label: "Experts" },
              { val: ratingDisplay, label: "Satisfaction" },
              { val: "24/7", label: "Support" },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col items-center px-2 text-center">
                <span className="text-xl font-bold tracking-tight text-[var(--flyhigh-text)] md:text-2xl">
                  {stat.val}
                </span>
                <span className="mt-0.5 text-xs font-medium text-slate-500">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════ */}
      {/* STORY */}
      {/* ═══════════════════════════════════ */}
      <section className="bg-white py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <Reveal className="mx-auto max-w-2xl text-center">
            <SectionLabel>Our Story</SectionLabel>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-[var(--flyhigh-text)] md:text-4xl">
              The FlyHigh Story
            </h2>
            <p className="mt-4 text-body">
              From a bold idea to a global platform — our journey of connecting
              experts with those who need them.
            </p>
          </Reveal>

          <div className="mt-14 grid gap-8 md:grid-cols-2">
            {/* Visual illustration (left) */}
            <Reveal direction="left">
              <div className="sticky top-28 overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-indigo-50 via-white to-purple-50 shadow-sm">
                <div className="aspect-[4/3] p-6 md:p-8">
                  <div className="grid h-full grid-cols-5 grid-rows-5 gap-2">
                    {Array.from({ length: 25 }).map((_, i) => {
                      const colors = [
                        "bg-indigo-100", "bg-purple-100", "bg-blue-100",
                        "bg-indigo-200", "bg-violet-100",
                      ]
                      const sizeClasses = [
                        "col-span-2 row-span-2 rounded-xl",
                        "col-span-1 row-span-1 rounded-lg",
                        "col-span-3 row-span-1 rounded-lg",
                        "col-span-1 row-span-2 rounded-lg",
                        "col-span-2 row-span-1 rounded-lg",
                      ]
                      return (
                        <div
                          key={i}
                          className={`${colors[i % colors.length]} ${sizeClasses[i % sizeClasses.length]} flex items-center justify-center text-[10px] font-bold text-slate-400/30`}
                        >
                          {i + 1}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </Reveal>

            {/* Story paragraphs (right) */}
            <div className="space-y-8">
              {storyParagraphs.map((p, i) => (
                <Reveal key={p.title} delay={i * 100} direction="right">
                  <div className="group relative rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-indigo-200 hover:shadow-md">
                    <div className="absolute -left-3 top-6 flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-50 to-purple-50 shadow-sm ring-1 ring-indigo-100">
                      <Check className="size-4 text-[var(--flyhigh-primary)]" />
                    </div>
                    <div className="ml-6">
                      <h4 className="font-bold text-[var(--flyhigh-text)]">
                        {p.title}
                      </h4>
                      <p className="mt-2 text-sm leading-relaxed text-body">
                        {p.desc}
                      </p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════ */}
      {/* PRINCIPLES (Bento Grid) */}
      {/* ═══════════════════════════════════ */}
      <section className="bg-[var(--flyhigh-section)] py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <Reveal className="mx-auto max-w-2xl text-center">
            <SectionLabel>Core Principles</SectionLabel>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-[var(--flyhigh-text)] md:text-4xl">
              What We Stand For
            </h2>
            <p className="mt-4 text-body">
              The values that drive everything we do at FlyHigh.
            </p>
          </Reveal>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {/* Featured (large) */}
            <Reveal delay={100} className="md:col-span-2 md:row-span-2">
              <div className="group relative h-full overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-8 shadow-sm transition-all hover:shadow-lg md:p-10">
                <div className="pointer-events-none absolute -right-20 -top-20 size-60 rounded-full bg-indigo-500/5 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-20 -left-20 size-60 rounded-full bg-purple-500/5 blur-3xl" />
                <RocketIcon className="size-10 text-[var(--flyhigh-primary)]" />
                <h3 className="mt-5 text-2xl font-bold text-[var(--flyhigh-text)]">
                  Expert Excellence
                </h3>
                <p className="mt-3 max-w-lg text-sm leading-relaxed text-body">
                  We connect you with certified technical experts across diverse
                  domains, ensuring top-tier solutions for every challenge you
                  face, no matter how complex.
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {["Certified Experts", "50+ Domains", "Quality Assured"].map(
                    (tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-indigo-200 bg-white/60 px-3 py-1 text-xs font-medium text-[var(--flyhigh-primary)] backdrop-blur-sm"
                      >
                        {tag}
                      </span>
                    )
                  )}
                </div>
              </div>
            </Reveal>

            {/* Small card 1 */}
            <Reveal delay={200}>
              <div className="group h-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition-all hover:border-amber-200 hover:shadow-lg">
                <DiamondIcon className="size-8 text-amber-500" />
                <h3 className="mt-5 text-xl font-bold text-[var(--flyhigh-text)]">
                  Complete Transparency
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-body">
                  Clear pricing, open communication, and honest processes build
                  the foundation of every interaction.
                </p>
              </div>
            </Reveal>

            {/* Small card 2 */}
            <Reveal delay={300}>
              <div className="group h-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition-all hover:border-blue-200 hover:shadow-lg">
                <ZapIcon className="size-8 text-blue-500" />
                <h3 className="mt-5 text-xl font-bold text-[var(--flyhigh-text)]">
                  Rapid Resolution
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-body">
                  We prioritize efficiency with most technical problems resolved
                  within 24 hours, minimizing downtime.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════ */}
      {/* MILESTONE TIMELINE */}
      {/* ═══════════════════════════════════ */}
      <section className="relative overflow-hidden bg-white py-16 md:py-24">
        {/* Subtle background pattern */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.03]">
          <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #4f46e5 1px, transparent 0)", backgroundSize: "40px 40px" }} />
        </div>

        <div className="relative mx-auto max-w-4xl px-4 md:px-6">
          <Reveal className="mx-auto max-w-2xl text-center">
            <SectionLabel>Our Journey</SectionLabel>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-[var(--flyhigh-text)] md:text-4xl">
              Key Milestones
            </h2>
            <p className="mt-4 text-body">
              From inception to innovation — the moments that shaped FlyHigh.
            </p>
          </Reveal>

          {/* ── Vertical Timeline ── */}
          <div className="relative mt-16">
            {/* Central timeline spine */}
            <div
              aria-hidden="true"
              className="absolute left-4 top-0 hidden h-full w-0.5 bg-gradient-to-b from-indigo-400 via-purple-400 to-blue-400 md:block md:left-1/2 md:-translate-x-px"
            />

            <div className="space-y-12 md:space-y-16">
              {[
                {
                  year: "2020",
                  title: "Founded",
                  desc: "Trinade AI Technologies incorporated in Guntur, Andhra Pradesh — laying the foundation for intelligent technical solutions.",
                  icon: (
                    <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
                    </svg>
                  ),
                  gradient: "from-indigo-500 to-purple-600",
                  accent: "indigo",
                },
                {
                  year: "2022–24",
                  title: "R&D Phase",
                  desc: "Built core AI capabilities and real-time collaboration technology — years of intensive research and development.",
                  icon: (
                    <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  ),
                  gradient: "from-amber-500 to-orange-600",
                  accent: "amber",
                },
                {
                  year: "2025",
                  title: "FlyHigh Launch",
                  desc: "FlyHigh platform launched — connecting verified experts with users across India through secure video consultations.",
                  icon: (
                    <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                    </svg>
                  ),
                  gradient: "from-emerald-500 to-teal-600",
                  accent: "emerald",
                },
                {
                  year: "2025+",
                  title: "Scaling Up",
                  desc: "Growing the platform with AI-powered expert matching, intelligent insights, and an expanding network of verified professionals.",
                  icon: (
                    <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                    </svg>
                  ),
                  gradient: "from-violet-500 to-fuchsia-600",
                  accent: "violet",
                },
              ].map((milestone, i) => {
                const isLeft = i % 2 === 0
                // Static class resolution for Tailwind JIT
                const accentColorMap: Record<string, { text: string; shadow: string }> = {
                  indigo: { text: "text-indigo-600", shadow: "shadow-indigo-500/25" },
                  amber: { text: "text-amber-600", shadow: "shadow-amber-500/25" },
                  emerald: { text: "text-emerald-600", shadow: "shadow-emerald-500/25" },
                  violet: { text: "text-violet-600", shadow: "shadow-violet-500/25" },
                }
                const accent = accentColorMap[milestone.accent]
                return (
                  <Reveal key={milestone.year} delay={i * 120} direction={isLeft ? "left" : "right"}>
                    <div className={`relative flex items-center md:gap-0 ${isLeft ? "md:flex-row" : "md:flex-row-reverse"}`}>
                      {/* Content card */}
                      <div className={`ml-12 flex-1 md:ml-0 ${isLeft ? "md:pr-16 md:text-right" : "md:pl-16 md:text-left"}`}>
                        <div className={`group relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 ${isLeft ? "md:rounded-r-none" : "md:rounded-l-none"}`}>
                          {/* Gradient accent stripe */}
                          <div
                            aria-hidden="true"
                            className={`absolute top-0 ${isLeft ? "right-0 rounded-r-2xl" : "left-0 rounded-l-2xl"} h-full w-1 bg-gradient-to-b ${milestone.gradient}`}
                          />
                          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1">
                            <span className={`text-xs font-bold tracking-wider ${accent.text}`}>
                              {milestone.year}
                            </span>
                          </div>
                          <h3 className="text-xl font-bold text-[var(--flyhigh-text)]">
                            {milestone.title}
                          </h3>
                          <p className="mt-2 text-sm leading-relaxed text-body">
                            {milestone.desc}
                          </p>
                        </div>
                      </div>

                      {/* Timeline node (center) */}
                      <div className="absolute left-4 top-6 z-10 md:static md:top-auto">
                        <div className={`flex size-10 items-center justify-center rounded-full bg-gradient-to-br ${milestone.gradient} text-white shadow-lg ${accent.shadow} ring-4 ring-white`}>
                          {milestone.icon}
                        </div>
                      </div>

                      {/* Spacer for the other side */}
                      <div className="hidden flex-1 md:block" />
                    </div>
                  </Reveal>
                )
              })}
            </div>

            {/* End dot */}
            <div aria-hidden="true" className="relative mt-8 flex justify-center">
              <div className="flex size-4 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-blue-500 shadow-md ring-4 ring-white">
                <div className="size-1.5 rounded-full bg-white" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════ */}
      {/* TEAM */}
      {/* ═══════════════════════════════════ */}
      <section className="bg-[var(--flyhigh-section)] py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <Reveal className="mx-auto max-w-2xl text-center">
            <SectionLabel>Our Team</SectionLabel>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-[var(--flyhigh-text)] md:text-4xl">
              The People Behind the Intelligence
            </h2>
            <p className="mt-4 text-body">
              Engineers, researchers, designers, and strategists — united by a
              shared obsession with building AI that works in the real world.
            </p>
          </Reveal>

          {/* ── Featured Leaders Row ── */}
          <div className="mt-14 grid gap-6 md:grid-cols-2">
            {/* Peter — Founder / CMD & CEO */}
            <Reveal direction="left">
              <div className="group relative overflow-hidden rounded-2xl border border-indigo-200 bg-gradient-to-br from-white via-indigo-50/40 to-purple-50/40 p-8 shadow-lg shadow-indigo-500/5 transition-all duration-500 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/10">
                {/* Decorative corner gradient */}
                <div aria-hidden="true" className="pointer-events-none absolute -top-20 -right-20 size-48 rounded-full bg-gradient-to-br from-indigo-400/15 to-purple-500/15 blur-2xl" />
                <div aria-hidden="true" className="pointer-events-none absolute -bottom-16 -left-16 size-40 rounded-full bg-gradient-to-tr from-blue-400/10 to-cyan-400/10 blur-2xl" />
                <div className="relative flex flex-col sm:flex-row sm:items-center gap-6">
                  <div className="relative shrink-0">
                    <div aria-hidden="true" className="absolute -inset-2 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 blur-md opacity-40" />
                    <Avatar size="lg" className="relative size-20 ring-4 ring-white/80">
                      <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-2xl font-bold text-white">
                        PE
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="min-w-0">
                    <div className="mb-1 inline-flex rounded-full bg-gradient-to-r from-indigo-500/10 to-purple-500/10 px-3 py-0.5">
                      <span className="text-xs font-semibold tracking-wide text-indigo-600">Founder / CMD & CEO</span>
                    </div>
                    <h3 className="mt-1 text-2xl font-bold text-[var(--flyhigh-text)]">Peter</h3>
                    <p className="mt-2 text-sm leading-relaxed text-body">
                      Builds responsibly — combining human judgment with intelligent systems to drive the company&apos;s vision forward.
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>

            {/* Nalini Devi Sale — Director */}
            <Reveal direction="right">
              <div className="group relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-white via-emerald-50/40 to-teal-50/40 p-8 shadow-lg shadow-emerald-500/5 transition-all duration-500 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-500/10">
                <div aria-hidden="true" className="pointer-events-none absolute -top-20 -right-20 size-48 rounded-full bg-gradient-to-br from-emerald-400/15 to-teal-500/15 blur-2xl" />
                <div aria-hidden="true" className="pointer-events-none absolute -bottom-16 -left-16 size-40 rounded-full bg-gradient-to-tr from-green-400/10 to-emerald-400/10 blur-2xl" />
                <div className="relative flex flex-col sm:flex-row sm:items-center gap-6">
                  <div className="relative shrink-0">
                    <div aria-hidden="true" className="absolute -inset-2 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 blur-md opacity-40" />
                    <Avatar size="lg" className="relative size-20 ring-4 ring-white/80">
                      <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-2xl font-bold text-white">
                        NS
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="min-w-0">
                    <div className="mb-1 inline-flex rounded-full bg-gradient-to-r from-emerald-500/10 to-teal-500/10 px-3 py-0.5">
                      <span className="text-xs font-semibold tracking-wide text-emerald-600">Director</span>
                    </div>
                    <h3 className="mt-1 text-2xl font-bold text-[var(--flyhigh-text)]">Nalini Devi Sale</h3>
                    <p className="mt-2 text-sm leading-relaxed text-body">
                      Guides the company with clarity, governance, and lasting purpose — ensuring every decision aligns with our mission.
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>

          {/* ── Team Grid ── */}
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {[
              { name: "George Gideon", role: "Product & Strategy Lead", initials: "GG", gradient: "from-amber-500 to-orange-600", roleColor: "text-amber-600", badgeBg: "bg-amber-50", desc: "Shapes clear roadmaps and turns ideas into launch-ready products." },
              { name: "Renu Kumari", role: "Scrum Master / QA PM", initials: "RK", gradient: "from-rose-500 to-pink-600", roleColor: "text-rose-600", badgeBg: "bg-rose-50", desc: "Leads delivery and quality with strong execution discipline." },
              { name: "Havilah Sale", role: "Business Intelligence", initials: "HS", gradient: "from-sky-500 to-blue-600", roleColor: "text-sky-600", badgeBg: "bg-sky-50", desc: "Converts data into dashboards, decisions, and measurable impact." },
              { name: "Shubham Sakhare", role: "AI & Full Stack Dev", initials: "SS", gradient: "from-violet-500 to-purple-600", roleColor: "text-violet-600", badgeBg: "bg-violet-50", desc: "Builds AI-enhanced applications that scale cleanly from concept to production." },
              { name: "Akash Sakhare", role: "Software Developer", initials: "AS", gradient: "from-cyan-500 to-blue-600", roleColor: "text-cyan-600", badgeBg: "bg-cyan-50", desc: "Builds clean, scalable web applications with a user-first mindset." },
            ].map((member, i) => (
              <Reveal key={member.name} delay={i * 80}>
                <div className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg">
                  {/* Top accent bar */}
                  <div aria-hidden="true" className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${member.gradient}`} />
                  <div className="flex flex-col items-center text-center pt-3">
                    <Avatar size="default" className="size-14">
                      <AvatarFallback className={`bg-gradient-to-br ${member.gradient} text-base font-bold text-white`}>
                        {member.initials}
                      </AvatarFallback>
                    </Avatar>
                    <h4 className="mt-3 font-bold text-[var(--flyhigh-text)] leading-tight">
                      {member.name}
                    </h4>
                    <span className={`mt-1 inline-flex items-center rounded-full ${member.badgeBg} px-2.5 py-0.5 text-xs font-semibold tracking-wide ${member.roleColor}`}>
                      {member.role}
                    </span>
                    <p className="mt-2 text-xs leading-relaxed text-slate-500 line-clamp-3">
                      {member.desc}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════ */}
      {/* SOCIAL CTA */}
      {/* ═══════════════════════════════════ */}
      <section className="bg-white py-16 md:py-20">
        <div className="mx-auto max-w-2xl px-4 text-center md:px-6">
          <Reveal>
            <div
              aria-hidden="true"
              className="mx-auto mb-6 flex size-14 items-center justify-center rounded-2xl bg-indigo-100"
            >
              <Plane className="size-7 text-[var(--flyhigh-primary)]" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-[var(--flyhigh-text)] md:text-4xl">
              Stay Connected
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-body">
              Follow us on social media for the latest updates, expert insights,
              and success stories.
            </p>

            <div className="mt-8 flex justify-center gap-4">
              {[
                { icon: <FacebookIcon className="size-5" />, label: "Facebook" },
                { icon: <TwitterIcon className="size-5" />, label: "Twitter" },
                { icon: <LinkedInIcon className="size-5" />, label: "LinkedIn" },
                { icon: <InstagramIcon className="size-5" />, label: "Instagram" },
              ].map((s) => (
                <a
                  key={s.label}
                  href="#"
                  aria-label={s.label}
                  className="flex size-11 items-center justify-center rounded-xl border border-slate-200 text-slate-400 shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-50 hover:text-[var(--flyhigh-primary)] hover:shadow-md"
                >
                  {s.icon}
                </a>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button
                size="lg"
                onClick={handleJoinToday}
                className="h-12 gap-2 bg-[var(--flyhigh-primary)] px-8 shadow-lg shadow-indigo-500/25 hover:bg-[var(--flyhigh-primary-hover)]"
              >
                Join FlyHigh Today
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </Reveal>
        </div>
      </section>

      <Footer />
    </div>
  )
}
