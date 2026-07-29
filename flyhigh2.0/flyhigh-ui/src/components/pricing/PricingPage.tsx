import { useEffect, useState } from "react"
import {
  ArrowRight,
  Check,
  Minus,
  Plus,
  Star,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/layout/Footer"
import { Reveal } from "@/components/home/Reveal"
import { SectionLabel } from "@/components/home/SectionLabel"

/* ─── Types ─── */
type BillingCycle = "pay-per-call" | "monthly" | "yearly"

type PlanFeature = {
  text: string
  included: boolean
}

type Plan = {
  id: string
  name: string
  tagline: string
  price: number
  period: string
  originalPrice?: number
  description: string
  features: PlanFeature[]
  cta: string
  popular?: boolean
  color: string
  bgGradient: string
  badgeGradient: string
  iconBg: string
}

/* ─── Data ─── */
const plans: Plan[] = [
  {
    id: "pay-per-call",
    name: "Pay Per Call",
    tagline: "Flexible & Fair",
    price: 0,
    period: "one-time",
    description:
      "Perfect for occasional consultations. No commitments, just expert advice when you need it.",
    features: [
      { text: "Pay only when you book a call", included: true },
      { text: "Choose from 500+ verified experts", included: true },
      { text: "HD video consultations", included: true },
      { text: "End-to-end encrypted calls", included: true },
      { text: "Session recordings available", included: false },
      { text: "Priority customer support", included: false },
      { text: "Exclusive expert discounts", included: false },
    ],
    cta: "Find an Expert",
    color: "var(--flyhigh-primary)",
    bgGradient: "from-indigo-50 via-white to-white",
    badgeGradient: "from-indigo-500 to-purple-600",
    iconBg: "bg-indigo-100",
  },
  {
    id: "monthly",
    name: "Monthly Pass",
    tagline: "Best for Regular Users",
    price: 499,
    period: "/month",
    description:
      "For professionals who need expert consultations regularly. Save big with a monthly plan.",
    features: [
      { text: "Pay only when you book a call", included: true },
      { text: "Choose from 500+ verified experts", included: true },
      { text: "HD video consultations", included: true },
      { text: "End-to-end encrypted calls", included: true },
      { text: "Session recordings available", included: true },
      { text: "Priority customer support", included: true },
      { text: "Exclusive expert discounts", included: false },
    ],
    cta: "Subscribe Now",
    popular: true,
    color: "var(--flyhigh-primary)",
    bgGradient: "from-indigo-50 via-white to-purple-50",
    badgeGradient: "from-[var(--flyhigh-primary)] to-[var(--flyhigh-primary-hover)]",
    iconBg: "bg-indigo-100",
  },
  {
    id: "yearly",
    name: "Yearly Pass",
    tagline: "Maximum Savings",
    price: 3999,
    period: "/year",
    originalPrice: 5988,
    description:
      "For power users. Get the best value with 2 months free and exclusive perks.",
    features: [
      { text: "Pay only when you book a call", included: true },
      { text: "Choose from 500+ verified experts", included: true },
      { text: "HD video consultations", included: true },
      { text: "End-to-end encrypted calls", included: true },
      { text: "Session recordings available", included: true },
      { text: "Priority customer support", included: true },
      { text: "Exclusive expert discounts", included: true },
    ],
    cta: "Subscribe Now",
    color: "#f59e0b",
    bgGradient: "from-amber-50 via-white to-orange-50",
    badgeGradient: "from-amber-500 to-orange-600",
    iconBg: "bg-amber-100",
  },
]

const faqs = [
  {
    q: "How does Pay Per Call work?",
    a: "Simply browse experts, select your preferred one, and pay only for the call duration. No subscription needed. Each session is priced transparently by the expert.",
  },
  {
    q: "Can I switch between plans?",
    a: "Absolutely! You can upgrade, downgrade, or cancel your subscription at any time. Changes take effect from the next billing cycle.",
  },
  {
    q: "Are there any hidden fees?",
    a: "None at all. What you see is what you pay. Our transparent pricing ensures complete clarity — no setup fees, no cancellation charges, no surprises.",
  },
  {
    q: "Is there a free trial available?",
    a: "Yes! New users can sign up for free and browse experts. You only pay when you're ready to book your first consultation call.",
  },
]

const planComparison = [
  { feature: "Access to all experts", ppc: true, monthly: true, yearly: true },
  { feature: "HD video calls", ppc: true, monthly: true, yearly: true },
  { feature: "End-to-end encryption", ppc: true, monthly: true, yearly: true },
  { feature: "Session recordings", ppc: false, monthly: true, yearly: true },
  { feature: "Priority support", ppc: false, monthly: true, yearly: true },
  { feature: "Expert discounts", ppc: false, monthly: false, yearly: true },
  { feature: "Cancel anytime", ppc: true, monthly: true, yearly: true },
]

/* ─── Component ─── */
export default function PricingPage() {
  const [billing, setBilling] = useState<BillingCycle>("pay-per-call")
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  useEffect(() => window.scrollTo(0, 0), [])

  const safePlans = billing === "pay-per-call"
    ? plans
    : plans.filter((p) => p.id !== "pay-per-call")

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

        <div className="relative mx-auto max-w-3xl px-4 text-center md:px-6">
          <div className="hero-reveal hero-reveal-delay-1">
            <Badge
              variant="outline"
              className="mb-6 h-7 gap-1.5 border-indigo-200 bg-indigo-50 px-3 font-medium text-[var(--flyhigh-primary)]"
            >
              <Star className="size-3 fill-[var(--flyhigh-accent)] text-[var(--flyhigh-accent)]" />
              Simple & Transparent Pricing
            </Badge>
          </div>

          <h1 className="font-heading text-4xl leading-[1.08] font-bold tracking-tight text-[var(--flyhigh-text)] sm:text-5xl md:text-[3.25rem] lg:text-[3.75rem]">
            <span className="hero-reveal hero-reveal-delay-2 block">
              Choose Your Plan
            </span>
            <span className="hero-reveal hero-reveal-delay-3 block text-gradient-brand">
              Pay Only for What You Need.
            </span>
          </h1>

          <p className="hero-reveal hero-reveal-delay-4 mx-auto mt-6 max-w-xl text-base leading-relaxed text-body md:text-lg">
            From flexible pay-per-call options to unlimited subscription plans —
            we have a pricing model that fits every need.
          </p>

          {/* Toggle */}
          <div className="hero-reveal hero-reveal-delay-5 mx-auto mt-10 inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            {(["pay-per-call", "monthly", "yearly"] as const).map((cycle) => (
              <button
                key={cycle}
                onClick={() => setBilling(cycle)}
                className={`relative rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                  billing === cycle
                    ? "bg-[var(--flyhigh-primary)] text-white shadow-sm"
                    : "text-slate-600 hover:text-[var(--flyhigh-text)]"
                }`}
              >
                {cycle === "pay-per-call"
                  ? "Pay Per Call"
                  : cycle === "monthly"
                  ? "Monthly"
                  : "Yearly"}
                {cycle === "yearly" && (
                  <span
                    className={`absolute -top-2 -right-2 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                      billing === "yearly"
                        ? "bg-white text-[var(--flyhigh-primary)]"
                        : "bg-[var(--flyhigh-accent)] text-white"
                    }`}
                  >
                    Save 33%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════ */}
      {/* PRICING CARDS */}
      {/* ═══════════════════════════════════ */}
      <section className="-mt-8 pb-16 md:-mt-12 md:pb-24">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div
            className={`grid gap-8 ${
              safePlans.length === 1
                ? "mx-auto max-w-sm"
                : safePlans.length === 2
                ? "md:grid-cols-2 md:mx-auto md:max-w-3xl"
                : "md:grid-cols-3"
            }`}
          >
            {safePlans.map((plan, i) => (
              <Reveal
                key={plan.id}
                delay={i * 120}
                direction={i === 1 ? "up" : i === 2 ? "right" : "left"}
              >
                <div className="group relative h-full">
                  {/* Popular badge */}
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2">
                      <span
                        className="inline-block rounded-full bg-gradient-to-r from-[var(--flyhigh-primary)] to-[var(--flyhigh-primary-hover)] px-4 py-1 text-[11px] font-bold tracking-wide text-white shadow-lg shadow-indigo-500/20"
                      >
                        MOST POPULAR
                      </span>
                    </div>
                  )}

                  <Card
                    className={`relative h-full overflow-hidden border bg-white shadow-sm transition-all duration-300 hover:shadow-xl ${
                      plan.popular
                        ? "scale-[1.02] border-indigo-200 ring-2 ring-[var(--flyhigh-primary)]/20 md:scale-105"
                        : "border-slate-200 hover:border-indigo-200 hover:-translate-y-1"
                    }`}
                  >
                    {/* Top gradient decoration */}
                    <div
                      className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${plan.badgeGradient}`}
                    />

                    <CardContent className="flex h-full flex-col p-0">
                      {/* Header */}
                      <div className={`bg-gradient-to-br ${plan.bgGradient} px-6 pt-8 pb-6`}>
                        <div
                          className={`inline-flex size-10 items-center justify-center rounded-xl ${plan.iconBg}`}
                        >
                          {plan.id === "pay-per-call" ? (
                            <ArrowRight className="size-5 text-[var(--flyhigh-primary)]" />
                          ) : plan.id === "monthly" ? (
                            <svg
                              className="size-5 text-[var(--flyhigh-primary)]"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                              <line x1="16" y1="2" x2="16" y2="6" />
                              <line x1="8" y1="2" x2="8" y2="6" />
                              <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                          ) : (
                            <svg
                              className="size-5 text-amber-600"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>
                        <p className="mt-3 text-xs font-semibold tracking-[0.2em] text-[var(--flyhigh-primary)] uppercase">
                          {plan.tagline}
                        </p>
                        <h3 className="mt-1 text-2xl font-bold text-[var(--flyhigh-text)]">
                          {plan.name}
                        </h3>

                        <div className="mt-4 flex items-baseline gap-1">
                          <span className="text-4xl font-extrabold tracking-tight text-[var(--flyhigh-text)]">
                            {plan.id === "pay-per-call" ? (
                              "Free"
                            ) : (
                              <>₹{plan.price.toLocaleString("en-IN")}</>
                            )}
                          </span>
                          {plan.period && (
                            <span className="text-sm font-medium text-slate-500">
                              {plan.period}
                            </span>
                          )}
                          {plan.originalPrice && (
                            <span className="ml-2 text-sm font-medium text-slate-400 line-through">
                              ₹{plan.originalPrice.toLocaleString("en-IN")}
                            </span>
                          )}
                        </div>

                        <p className="mt-3 text-sm leading-relaxed text-body">
                          {plan.description}
                        </p>
                      </div>

                      {/* Features */}
                      <div className="flex-1 px-6 pt-6 pb-4">
                        <p className="text-xs font-semibold tracking-[0.15em] text-slate-400 uppercase">
                          What&apos;s Included
                        </p>
                        <ul className="mt-4 space-y-3">
                          {plan.features.map((feature) => (
                            <li key={feature.text} className="flex items-start gap-3">
                              <span
                                className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full ${
                                  feature.included
                                    ? "bg-indigo-100"
                                    : "bg-slate-100"
                                }`}
                              >
                                {feature.included ? (
                                  <Check className="size-3 text-[var(--flyhigh-primary)]" />
                                ) : (
                                  <Minus className="size-3 text-slate-300" />
                                )}
                              </span>
                              <span
                                className={`text-sm ${
                                  feature.included
                                    ? "font-medium text-[var(--flyhigh-text)]"
                                    : "text-slate-400"
                                }`}
                              >
                                {feature.text}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* CTA */}
                      <div className="px-6 pb-6 pt-2">
                        <Button
                          size="lg"
                          className={`h-12 w-full gap-2 text-base font-semibold shadow-lg ${
                            plan.popular
                              ? "bg-[var(--flyhigh-primary)] text-white shadow-indigo-500/25 hover:bg-[var(--flyhigh-primary-hover)]"
                              : plan.id === "yearly"
                              ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-amber-500/25 hover:from-amber-600 hover:to-orange-700"
                              : "border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50"
                          }`}
                          variant={plan.popular || plan.id === "yearly" ? "default" : "outline"}
                        >
                          {plan.cta}
                          <ArrowRight className="size-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════ */}
      {/* COMPARISON TABLE */}
      {/* ═══════════════════════════════════ */}
      <section className="bg-[var(--flyhigh-section)] py-16 md:py-24">
        <div className="mx-auto max-w-4xl px-4 md:px-6">
          <Reveal className="mx-auto max-w-2xl text-center">
            <SectionLabel>Compare Plans</SectionLabel>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-[var(--flyhigh-text)] md:text-4xl">
              Side by Side
            </h2>
            <p className="mt-4 text-body">
              See exactly what each plan includes to make the right choice.
            </p>
          </Reveal>

          <Reveal delay={150} className="mt-12 overflow-x-auto">
            <table className="w-full min-w-[600px] border-collapse">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="py-4 pr-6 text-left text-sm font-bold text-[var(--flyhigh-text)]">
                    Features
                  </th>
                  <th className="py-4 px-4 text-center text-sm font-bold text-[var(--flyhigh-text)]">
                    Pay Per Call
                  </th>
                  <th className="py-4 px-4 text-center text-sm font-bold text-[var(--flyhigh-primary)]">
                    Monthly
                  </th>
                  <th className="py-4 pl-4 text-center text-sm font-bold text-amber-600">
                    Yearly
                  </th>
                </tr>
              </thead>
              <tbody>
                {planComparison.map((row) => (
                  <tr
                    key={row.feature}
                    className="border-b border-slate-100 transition-colors hover:bg-white"
                  >
                    <td className="py-4 pr-6 text-sm font-medium text-[var(--flyhigh-text)]">
                      {row.feature}
                    </td>
                    {[row.ppc, row.monthly, row.yearly].map((included, idx) => (
                      <td
                        key={idx}
                        className={`py-4 px-4 text-center ${
                          included ? "text-emerald-600" : "text-slate-300"
                        }`}
                      >
                        {included ? (
                          <Check className="mx-auto size-5" />
                        ) : (
                          <Minus className="mx-auto size-5" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════════════════════ */}
      {/* FAQ */}
      {/* ═══════════════════════════════════ */}
      <section className="bg-white py-16 md:py-24">
        <div className="mx-auto max-w-3xl px-4 md:px-6">
          <Reveal className="mx-auto max-w-2xl text-center">
            <SectionLabel>FAQ</SectionLabel>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-[var(--flyhigh-text)] md:text-4xl">
              Frequently Asked Questions
            </h2>
            <p className="mt-4 text-body">
              Everything you need to know about our pricing plans.
            </p>
          </Reveal>

          <div className="mt-12 space-y-3">
            {faqs.map((faq, i) => (
              <Reveal key={i} delay={i * 80}>
                <div
                  className={`overflow-hidden rounded-xl border transition-all ${
                    openFaq === i
                      ? "border-indigo-200 bg-indigo-50/50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="flex w-full items-center justify-between px-6 py-4 text-left"
                  >
                    <span className="text-sm font-bold text-[var(--flyhigh-text)]">
                      {faq.q}
                    </span>
                    <span
                      className={`flex size-7 shrink-0 items-center justify-center rounded-full transition-all ${
                        openFaq === i
                          ? "bg-[var(--flyhigh-primary)] text-white"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {openFaq === i ? (
                        <Minus className="size-3.5" />
                      ) : (
                        <Plus className="size-3.5" />
                      )}
                    </span>
                  </button>
                  <div
                    className={`overflow-hidden transition-all duration-300 ${
                      openFaq === i ? "max-h-96" : "max-h-0"
                    }`}
                  >
                    <div className="px-6 pb-4 pt-0">
                      <p className="text-sm leading-relaxed text-body">{faq.a}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════ */}
      {/* CTA */}
      {/* ═══════════════════════════════════ */}
      <section className="relative overflow-hidden bg-[var(--flyhigh-section)] py-20 md:py-28">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-0 h-64 w-64 -translate-y-1/2 rounded-full bg-indigo-200/40 blur-3xl"
        />

        <div className="relative mx-auto max-w-3xl px-4 text-center md:px-6">
          <Reveal>
            <h2 className="text-3xl font-bold tracking-tight text-[var(--flyhigh-text)] md:text-4xl lg:text-5xl">
              Still have questions?
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-body">
              Our team is here to help you choose the perfect plan for your
              needs. Reach out anytime.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button
                size="lg"
                className="h-12 gap-2 bg-[var(--flyhigh-primary)] px-8 text-base shadow-lg shadow-indigo-500/25 hover:bg-[var(--flyhigh-primary-hover)]"
              >
                Contact Sales
                <ArrowRight className="size-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 border-slate-300 px-8 text-base text-slate-700 hover:bg-white"
              >
                View FAQ
              </Button>
            </div>
          </Reveal>
        </div>
      </section>

      <Footer />
    </div>
  )
}
