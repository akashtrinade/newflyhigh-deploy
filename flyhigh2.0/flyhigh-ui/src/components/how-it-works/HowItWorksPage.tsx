import { useEffect } from "react"
import {
  ArrowRight,
  Check,
  Search,
  Calendar,
  Video,
  User,
  Lock,
  Clock,
  CreditCard,
  Star,
  MessageSquare,
  Shield,
  Zap,
  Users,
  Globe,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/layout/Footer"
import { Reveal } from "@/components/home/Reveal"
import { SectionLabel } from "@/components/home/SectionLabel"

/* ─── Data ─── */

type Feature = {
  icon: typeof Search
  title: string
  description: string
  color: string
  bgColor: string
}

const coreFeatures: Feature[] = [
  {
    icon: User,
    title: "Smart Account Management",
    description:
      "Seamless account creation, login, and signup for both Experts and End-users with intelligent profile management.",
    color: "text-indigo-600",
    bgColor: "bg-indigo-100",
  },
  {
    icon: Lock,
    title: "Expert Privacy Protection",
    description:
      "Technical experts create profiles that remain securely hidden from End-users until connection is established.",
    color: "text-purple-600",
    bgColor: "bg-purple-100",
  },
  {
    icon: Search,
    title: "Advanced Expert Search",
    description:
      "Intelligently categorized search system to find the perfect technical experts for your specific needs.",
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  {
    icon: Zap,
    title: "Lightning Fast Resolution",
    description:
      "Connect with experts instantly and get most technical issues resolved within 24 hours.",
    color: "text-amber-600",
    bgColor: "bg-amber-100",
  },
  {
    icon: CreditCard,
    title: "Secure Payment Integration",
    description:
      "End-to-end encrypted payments via Razorpay, ensuring smooth and secure financial transactions.",
    color: "text-emerald-600",
    bgColor: "bg-emerald-100",
  },
  {
    icon: Star,
    title: "Rating & Review System",
    description:
      "Comprehensive feedback system allowing both users and experts to leave ratings and detailed reviews.",
    color: "text-rose-600",
    bgColor: "bg-rose-100",
  },
  {
    icon: MessageSquare,
    title: "Advanced Communication",
    description:
      "Chat, voice, and video call support with one week of secure, monitored data storage.",
    color: "text-cyan-600",
    bgColor: "bg-cyan-100",
  },
]

const steps = [
  {
    step: 1,
    icon: Search,
    title: "Find Expert",
    description:
      "Browse verified experts by category, rating, and availability.",
    color: "from-indigo-500 to-purple-600",
    lightBg: "bg-indigo-50",
    borderColor: "border-indigo-200",
  },
  {
    step: 2,
    icon: Calendar,
    title: "Book Consultation",
    description:
      "Choose a time slot and pay securely — no subscription required.",
    color: "from-emerald-500 to-teal-600",
    lightBg: "bg-emerald-50",
    borderColor: "border-emerald-200",
  },
  {
    step: 3,
    icon: Video,
    title: "Video Call & Resolution",
    description:
      "Connect via HD video, get expert advice, and resolve your issue.",
    color: "from-blue-500 to-cyan-600",
    lightBg: "bg-blue-50",
    borderColor: "border-blue-200",
  },
]

const stats = [
  { number: "24/7", label: "Support Available", icon: Clock },
  { number: "5,000+", label: "Active Experts", icon: Users },
  { number: "98%", label: "Satisfaction Rate", icon: Star },
  { number: "<24h", label: "Avg. Resolution", icon: Zap },
]

const workflowSteps = [
  {
    step: 1,
    title: "User Submits Query",
    description:
      "Users submit technical queries through our intuitive platform interface. Our AI-powered system analyzes the request and categorizes it for optimal expert matching.",
    icon: MessageSquare,
    color: "text-indigo-600",
    bgColor: "bg-indigo-100",
  },
  {
    step: 2,
    title: "AI Matches Expert",
    description:
      "Our intelligent matching engine connects your query with the most qualified technical experts from our verified pool of 5,000+ professionals across all domains.",
    icon: Zap,
    color: "text-purple-600",
    bgColor: "bg-purple-100",
  },
  {
    step: 3,
    title: "Expert Reviews & Connects",
    description:
      "The matched expert reviews your requirements, and once accepted, a secure connection is established. Expert profiles remain hidden until this point for privacy.",
    icon: Lock,
    color: "text-amber-600",
    bgColor: "bg-amber-100",
  },
  {
    step: 4,
    title: "Real-Time Collaboration",
    description:
      "Engage in interactive video conferencing, chat, or voice calls with your expert. TRINADE manages the entire workflow ensuring smooth communication.",
    icon: Video,
    color: "text-emerald-600",
    bgColor: "bg-emerald-100",
  },
  {
    step: 5,
    title: "Secure Payment & Resolution",
    description:
      "Transparent pricing based on issue complexity. Payments are processed securely via Razorpay. Most issues are resolved within 24 hours.",
    icon: CreditCard,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  {
    step: 6,
    title: "Rate & Review",
    description:
      "Both users and experts can leave ratings and detailed reviews. Feedback helps maintain quality and builds trust within the FlyHigh community.",
    icon: Star,
    color: "text-rose-600",
    bgColor: "bg-rose-100",
  },
]

const guarantees = [
  { text: "30-day money-back guarantee", icon: Shield },
  { text: "24/7 customer support", icon: Clock },
  { text: "No hidden fees", icon: CreditCard },
  { text: "Enterprise-ready", icon: Globe },
]

/* ─── Component ─── */
export default function HowItWorksPage() {
  useEffect(() => window.scrollTo(0, 0), [])

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
              From Query to Solution
            </span>
            <span className="hero-reveal hero-reveal-delay-3 block text-gradient-brand">
              In Three Simple Steps.
            </span>
          </h1>

          <p className="hero-reveal hero-reveal-delay-4 mx-auto mt-6 max-w-2xl text-base leading-relaxed text-body md:text-lg">
            FlyHigh Platform serves as an intelligent bridge between technical
            experts and end-users. TRINADE manages the entire workflow, from
            initial connection to secure payments.
          </p>

          {/* Stats row */}
          <div className="hero-reveal hero-reveal-delay-5 mt-10 grid grid-cols-2 divide-x divide-slate-200 rounded-2xl border border-slate-200 bg-white/70 px-4 py-4 shadow-sm backdrop-blur-sm md:mx-auto md:max-w-2xl md:grid-cols-4">
            {stats.map((stat) => {
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
              className="h-12 gap-2 bg-[var(--flyhigh-primary)] px-7 text-base shadow-lg shadow-indigo-500/25 hover:bg-[var(--flyhigh-primary-hover)]"
            >
              Find an Expert
              <ArrowRight className="size-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 border-slate-300 px-7 text-base text-slate-700 hover:bg-slate-50"
            >
              Become an Expert
            </Button>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════ */}
      {/* 3 SIMPLE STEPS (Visual Flow) */}
      {/* ═══════════════════════════════════ */}
      <section className="bg-white pb-16 md:pb-24">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <Reveal className="mx-auto max-w-2xl text-center">
            <SectionLabel>Simple Process</SectionLabel>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-[var(--flyhigh-text)] md:text-4xl">
              3 Steps to Your Expert Session
            </h2>
            <p className="mt-4 text-body">
              Get expert help in three simple steps — no subscriptions, no
              hassle.
            </p>
          </Reveal>

          <div className="relative mt-14 grid gap-8 md:grid-cols-3">
            {/* Connecting line */}
            <div
              aria-hidden="true"
              className="absolute top-12 left-[15%] hidden h-px w-[70%] bg-gradient-to-r from-indigo-300 via-purple-300 to-blue-300 md:block"
            />

            {steps.map((step, index) => {
              const Icon = step.icon
              return (
                <Reveal key={step.step} delay={index * 120}>
                  <div className="relative flex flex-col items-center text-center">
                    {/* Step circle */}
                    <div
                      className={`relative mb-6 flex size-24 items-center justify-center rounded-2xl border-2 ${step.borderColor} ${step.lightBg} shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1`}
                    >
                      <span
                        className={`absolute -top-3 -right-3 flex size-7 items-center justify-center rounded-full bg-gradient-to-r ${step.color} text-[10px] font-bold text-white shadow-md`}
                      >
                        0{step.step}
                      </span>
                      <Icon
                        className="size-10 text-[var(--flyhigh-primary)]"
                        aria-hidden="true"
                      />
                    </div>

                    <h3 className="text-xl font-bold text-[var(--flyhigh-text)]">
                      {step.title}
                    </h3>
                    <p className="mt-2 max-w-xs text-sm leading-relaxed text-body">
                      {step.description}
                    </p>

                    {index < steps.length - 1 && (
                      <div
                        aria-hidden="true"
                        className="absolute top-10 -right-4 hidden md:block"
                      >
                        <ArrowRight className="size-6 text-indigo-300" />
                      </div>
                    )}
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════ */}
      {/* PLATFORM OVERVIEW */}
      {/* ═══════════════════════════════════ */}
      <section className="bg-[var(--flyhigh-section)] py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <Reveal direction="left">
              <SectionLabel>Platform Overview</SectionLabel>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-[var(--flyhigh-text)] md:text-4xl">
                Your Premier Technical Solution Platform
              </h2>
              <p className="mt-4 text-body leading-relaxed">
                FlyHigh Platform serves as an intelligent bridge between
                technical experts and end-users. Users can submit technical
                queries, and our AI-powered system matches them with the most
                qualified experts. TRINADE manages the entire workflow, from
                initial connection to secure payments through our transparent
                pricing model.
              </p>

              <div className="mt-8 space-y-4">
                {[
                  {
                    icon: Check,
                    text: "Intelligent AI-powered expert matching",
                    color: "text-emerald-600",
                    bg: "bg-emerald-100",
                  },
                  {
                    icon: Check,
                    text: "End-to-end workflow management by TRINADE",
                    color: "text-blue-600",
                    bg: "bg-blue-100",
                  },
                  {
                    icon: Check,
                    text: "Transparent pricing with no hidden fees",
                    color: "text-purple-600",
                    bg: "bg-purple-100",
                  },
                ].map((item) => {
                  const Icon = item.icon
                  return (
                    <div key={item.text} className="flex items-center gap-3">
                      <span
                        className={`flex size-7 shrink-0 items-center justify-center rounded-full ${item.bg}`}
                      >
                        <Icon className={`size-4 ${item.color}`} />
                      </span>
                      <span className="font-medium text-[var(--flyhigh-text)]">
                        {item.text}
                      </span>
                    </div>
                  )
                })}
              </div>

              <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2">
                <Check className="size-4 text-[var(--flyhigh-primary)]" />
                <span className="text-sm font-semibold text-[var(--flyhigh-primary)]">
                  Trusted by 5,000+ Experts & Users Worldwide
                </span>
              </div>
            </Reveal>

            <Reveal direction="right" delay={150}>
              <div className="relative">
                {/* Decorative blobs */}
                <div
                  aria-hidden="true"
                  className="absolute -inset-4 rounded-[2.5rem] bg-gradient-to-br from-indigo-300/20 to-purple-200/10 blur-2xl"
                />
                <div className="relative grid grid-cols-2 gap-4">
                  {[
                    {
                      icon: Users,
                      label: "5,000+",
                      sub: "Active Experts",
                      gradient: "from-indigo-500 to-purple-600",
                    },
                    {
                      icon: Globe,
                      label: "15+",
                      sub: "Countries",
                      gradient: "from-emerald-500 to-teal-600",
                    },
                    {
                      icon: Star,
                      label: "98%",
                      sub: "Satisfaction",
                      gradient: "from-amber-500 to-orange-600",
                    },
                    {
                      icon: Zap,
                      label: "50K+",
                      sub: "Resolved",
                      gradient: "from-blue-500 to-cyan-600",
                    },
                  ].map((item) => {
                    const Icon = item.icon
                    return (
                      <div
                        key={item.label}
                        className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white/80 p-6 text-center shadow-sm backdrop-blur-sm transition-all hover:shadow-lg hover:-translate-y-1"
                      >
                        <div
                          className={`flex size-11 items-center justify-center rounded-xl bg-gradient-to-br ${item.gradient} text-white shadow-sm`}
                        >
                          <Icon className="size-5" />
                        </div>
                        <span className="mt-3 text-xl font-bold text-[var(--flyhigh-text)]">
                          {item.label}
                        </span>
                        <span className="mt-0.5 text-xs font-medium text-slate-500">
                          {item.sub}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════ */}
      {/* DETAILED WORKFLOW */}
      {/* ═══════════════════════════════════ */}
      <section className="bg-white py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <Reveal className="mx-auto max-w-2xl text-center">
            <SectionLabel>Detailed Workflow</SectionLabel>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-[var(--flyhigh-text)] md:text-4xl">
              End-to-End Process
            </h2>
            <p className="mt-4 text-body">
              From submitting your query to getting it resolved — here&apos;s how
              the entire FlyHigh workflow works.
            </p>
          </Reveal>

          <div className="relative mt-14">
            {/* Vertical timeline line */}
            <div
              aria-hidden="true"
              className="absolute left-8 top-0 hidden h-full w-px bg-gradient-to-b from-indigo-300 via-purple-300 to-blue-300 md:block"
            />

            <div className="space-y-8">
              {workflowSteps.map((wf, i) => {
                const Icon = wf.icon
                return (
                  <Reveal key={wf.step} delay={i * 100}>
                    <div className="relative group">
                      {/* Timeline dot */}
                      <div
                        aria-hidden="true"
                        className="absolute left-6 top-8 hidden size-4 rounded-full border-2 border-indigo-400 bg-white shadow-sm md:block"
                      />

                      <div className="md:pl-20">
                        <Card
                          className={`overflow-hidden border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:shadow-lg ${
                            i % 2 === 0 ? "" : "md:-translate-y-1"
                          }`}
                        >
                          <CardContent className="flex items-start gap-5 p-6 md:p-8">
                            <div
                              className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${wf.bgColor} shadow-sm`}
                            >
                              <Icon className={`size-6 ${wf.color}`} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-3">
                                <span
                                  className={`inline-flex size-6 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-[10px] font-bold text-white`}
                                >
                                  {wf.step}
                                </span>
                                <h3 className="text-lg font-bold text-[var(--flyhigh-text)]">
                                  {wf.title}
                                </h3>
                              </div>
                              <p className="mt-2 text-sm leading-relaxed text-body">
                                {wf.description}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </Reveal>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════ */}
      {/* CORE FEATURES (Grid) */}
      {/* ═══════════════════════════════════ */}
      <section className="bg-[var(--flyhigh-section)] py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <Reveal className="mx-auto max-w-2xl text-center">
            <SectionLabel>Core Features</SectionLabel>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-[var(--flyhigh-text)] md:text-4xl">
              Everything You Need
            </h2>
            <p className="mt-4 text-body">
              FlyHigh comes packed with powerful features designed to make
              expert consultations seamless and secure.
            </p>
          </Reveal>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {coreFeatures.map((feature, i) => {
              const Icon = feature.icon
              return (
                <Reveal key={feature.title} delay={i * 80}>
                  <Card className="group h-full border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg">
                    <CardContent className="flex h-full flex-col p-6">
                      <div
                        className={`flex size-11 items-center justify-center rounded-xl ${feature.bgColor} ${feature.color}`}
                      >
                        <Icon className="size-5" />
                      </div>
                      <h3 className="mt-4 font-bold text-[var(--flyhigh-text)]">
                        {feature.title}
                      </h3>
                      <p className="mt-2 flex-1 text-sm leading-relaxed text-body">
                        {feature.description}
                      </p>
                    </CardContent>
                  </Card>
                </Reveal>
              )
            })}
          </div>
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
              <Zap className="size-7 text-white" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-[var(--flyhigh-text)] md:text-4xl lg:text-5xl">
              Ready to Get Started?
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-body">
              Join thousands of satisfied users who trust FlyHigh for their
              technical solutions. Start your journey today with our risk-free
              trial.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button
                size="lg"
                className="h-12 gap-2 bg-[var(--flyhigh-primary)] px-8 text-base shadow-lg shadow-indigo-500/25 hover:bg-[var(--flyhigh-primary-hover)]"
              >
                Get Started Now
                <ArrowRight className="size-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 border-slate-300 px-8 text-base text-slate-700 hover:bg-white"
              >
                Explore All Features
              </Button>
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-3">
              {guarantees.map((g) => {
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
