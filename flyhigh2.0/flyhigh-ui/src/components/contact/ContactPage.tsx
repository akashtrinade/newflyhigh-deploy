import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  ArrowRight,
  Clock,
  Mail,
  MapPin,
  Phone,
  Building2,
  Send,
  CheckCircle,
  MessageSquare,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Navbar } from "@/components/layout/Navbar"
import { useAuth } from "@/contexts/AuthContext"
import { api } from "@/api/client"
import { Footer } from "@/components/layout/Footer"
import { Reveal } from "@/components/home/Reveal"
import { SectionLabel } from "@/components/home/SectionLabel"

/* ─── Data ─── */

type ContactInfo = {
  icon: typeof MapPin
  title: string
  detail: string
  link?: string
}

const contactInfo: ContactInfo[] = [
  {
    icon: Building2,
    title: "Office",
    detail: "#06, Green Valley Apartments,\nGorantla, Guntur,\nAndhra Pradesh 522034, India",
  },
  {
    icon: Phone,
    title: "Phone",
    detail: "+91 9490754923",
    link: "tel:+919490754923",
  },
  {
    icon: Mail,
    title: "Email",
    detail: "info@trinade.com",
    link: "mailto:info@trinade.com",
  },
]

const faqs = [
  {
    q: "How quickly can I expect a response?",
    a: "We typically respond within 24 hours during business days. For urgent matters, we recommend booking a consultation with one of our experts directly.",
  },
  {
    q: "Can I request a specific expert?",
    a: "Absolutely! You can browse our expert listings and directly book a session with the expert of your choice based on their availability and expertise.",
  },
  {
    q: "What if I have a technical issue with the platform?",
    a: "If you're experiencing technical difficulties, please describe the issue in detail in your message and our support team will prioritise your query.",
  },
]

/* ─── Component ─── */
export default function ContactPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  useEffect(() => window.scrollTo(0, 0), [])

  const handleFindExpert = () => navigate(user ? "/search-experts" : "/login")
  const handleBrowseFaq = () => document.getElementById("faq-section")?.scrollIntoView({ behavior: "smooth" })

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrorMsg("")

    try {
      await api.post("/contact/send", formData)

      setShowSuccess(true)
      setFormData({ name: "", email: "", subject: "", message: "" })
      setTimeout(() => setShowSuccess(false), 5000)
    } catch (error: any) {
      const msg =
        error.message || "Failed to send message. Please try again later."
      setErrorMsg(msg)
      setTimeout(() => setErrorMsg(""), 5000)
    } finally {
      setIsSubmitting(false)
    }
  }

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
              <MessageSquare className="size-3 text-[var(--flyhigh-primary)]" />
              We&apos;d Love to Hear From You
            </Badge>
          </div>

          <h1 className="font-heading text-4xl leading-[1.08] font-bold tracking-tight text-[var(--flyhigh-text)] sm:text-5xl md:text-[3.25rem] lg:text-[3.75rem]">
            <span className="hero-reveal hero-reveal-delay-2 block">
              Get in
            </span>
            <span className="hero-reveal hero-reveal-delay-3 block text-gradient-brand">
              Touch.
            </span>
          </h1>

          <p className="hero-reveal hero-reveal-delay-4 mx-auto mt-6 max-w-xl text-base leading-relaxed text-body md:text-lg">
            Have questions or need assistance? Our team is ready to help you
            with any queries. We typically respond within a few hours.
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════ */}
      {/* CONTACT FORM + INFO */}
      {/* ═══════════════════════════════════ */}
      <section className="-mt-8 pb-16 md:-mt-12 md:pb-24">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="grid gap-10 lg:grid-cols-5 lg:gap-14">
            {/* ─── Left: Info Column ─── */}
            <div className="lg:col-span-2">
              <div className="sticky top-28 space-y-8">
                <Reveal direction="left">
                  <SectionLabel>Contact Information</SectionLabel>
                  <h2 className="mt-3 text-2xl font-bold tracking-tight text-[var(--flyhigh-text)] md:text-3xl">
                    Reach Out to Us
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-body">
                    Whether you have a question about our platform, need help
                    finding an expert, or want to become an expert yourself —
                    we&apos;re here for you.
                  </p>
                </Reveal>

                <div className="space-y-4">
                  {contactInfo.map((info, i) => {
                    const Icon = info.icon
                    return (
                      <Reveal key={info.title} delay={i * 100}>
                        <div className="group flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-indigo-200 hover:shadow-md">
                          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-[var(--flyhigh-primary)]">
                            <Icon className="size-5" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold tracking-[0.15em] text-slate-400 uppercase">
                              {info.title}
                            </p>
                            {info.link ? (
                              <a
                                href={info.link}
                                className="mt-0.5 block text-sm font-semibold text-[var(--flyhigh-text)] transition-colors hover:text-[var(--flyhigh-primary)] whitespace-pre-line"
                              >
                                {info.detail}
                              </a>
                            ) : (
                              <p className="mt-0.5 text-sm font-semibold text-[var(--flyhigh-text)] whitespace-pre-line">
                                {info.detail}
                              </p>
                            )}
                          </div>
                        </div>
                      </Reveal>
                    )
                  })}
                </div>

                {/* Response time badge */}
                <Reveal delay={300}>
                  <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4">
                    <Clock className="size-5 shrink-0 text-emerald-600" />
                    <div>
                      <p className="text-sm font-bold text-emerald-800">
                        Typical response time: 24 hours
                      </p>
                      <p className="text-xs text-emerald-600">
                        We aim to respond within a few hours during business
                        days.
                      </p>
                    </div>
                  </div>
                </Reveal>
              </div>
            </div>

            {/* ─── Right: Form Column ─── */}
            <div className="lg:col-span-3">
              <Reveal direction="right">
                <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  {/* Gradient top bar */}
                  <div className="h-1.5 bg-gradient-to-r from-[var(--flyhigh-primary)] via-purple-500 to-blue-500" />

                  <div className="p-6 md:p-8">
                    {/* Show success or form */}
                    {showSuccess ? (
                      <div className="flex flex-col items-center py-16 text-center">
                        <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
                          <CheckCircle className="size-8 text-white" />
                        </div>
                        <h3 className="mt-6 text-xl font-bold text-[var(--flyhigh-text)]">
                          Message Sent!
                        </h3>
                        <p className="mt-2 max-w-sm text-sm leading-relaxed text-body">
                          Thank you for reaching out. We&apos;ve received your
                          message and will get back to you within 24 hours.
                        </p>
                        <Button
                          size="lg"
                          onClick={() => setShowSuccess(false)}
                          className="mt-8 h-11 bg-[var(--flyhigh-primary)] px-6 hover:bg-[var(--flyhigh-primary-hover)]"
                        >
                          Send Another Message
                          <ArrowRight className="size-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="mb-8">
                          <h3 className="text-xl font-bold text-[var(--flyhigh-text)]">
                            Send Us a Message
                          </h3>
                          <p className="mt-1 text-sm text-body">
                            Fill out the form below and we&apos;ll get back to
                            you as soon as possible.
                          </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                          <div className="grid gap-5 sm:grid-cols-2">
                            <div>
                              <label
                                htmlFor="name"
                                className="mb-1.5 block text-xs font-semibold tracking-[0.1em] text-slate-500 uppercase"
                              >
                                Your Name
                              </label>
                              <input
                                id="name"
                                name="name"
                                type="text"
                                required
                                placeholder="John Doe"
                                value={formData.name}
                                onChange={handleChange}
                                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-[var(--flyhigh-text)] outline-none transition-all placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                              />
                            </div>
                            <div>
                              <label
                                htmlFor="email"
                                className="mb-1.5 block text-xs font-semibold tracking-[0.1em] text-slate-500 uppercase"
                              >
                                Email Address
                              </label>
                              <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                placeholder="john@example.com"
                                value={formData.email}
                                onChange={handleChange}
                                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-[var(--flyhigh-text)] outline-none transition-all placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                              />
                            </div>
                          </div>

                          <div>
                            <label
                              htmlFor="subject"
                              className="mb-1.5 block text-xs font-semibold tracking-[0.1em] text-slate-500 uppercase"
                            >
                              Subject / Topic
                            </label>
                            <input
                              id="subject"
                              name="subject"
                              type="text"
                              required
                              placeholder="How can we help you?"
                              value={formData.subject}
                              onChange={handleChange}
                              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-[var(--flyhigh-text)] outline-none transition-all placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                            />
                          </div>

                          <div>
                            <label
                              htmlFor="message"
                              className="mb-1.5 block text-xs font-semibold tracking-[0.1em] text-slate-500 uppercase"
                            >
                              Message
                            </label>
                            <textarea
                              id="message"
                              name="message"
                              required
                              rows={5}
                              placeholder="Please describe your query in detail..."
                              value={formData.message}
                              onChange={handleChange}
                              className="w-full resize-none rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-[var(--flyhigh-text)] outline-none transition-all placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                            />
                          </div>

                          {/* Error message */}
                          {errorMsg && (
                            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                              {errorMsg}
                            </div>
                          )}

                          <Button
                            type="submit"
                            size="lg"
                            disabled={isSubmitting}
                            className="h-12 w-full gap-2 bg-gradient-to-r from-[var(--flyhigh-primary)] to-[var(--flyhigh-primary-hover)] text-base font-semibold shadow-lg shadow-indigo-500/25 transition-all hover:scale-[1.01] hover:shadow-xl disabled:opacity-60"
                          >
                            {isSubmitting ? (
                              <span className="flex items-center gap-2">
                                <svg
                                  className="size-4 animate-spin"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                >
                                  <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                  />
                                  <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                  />
                                </svg>
                                Sending...
                              </span>
                            ) : (
                              <>
                                <Send className="size-4" />
                                Send Message
                              </>
                            )}
                          </Button>
                        </form>
                      </>
                    )}
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════ */}
      {/* FAQ */}
      {/* ═══════════════════════════════════ */}
      <section className="bg-[var(--flyhigh-section)] py-16 md:py-24">
        <div className="mx-auto max-w-3xl px-4 md:px-6">
          <Reveal className="mx-auto max-w-2xl text-center">
            <SectionLabel>FAQ</SectionLabel>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-[var(--flyhigh-text)] md:text-4xl">
              Quick Answers
            </h2>
            <p className="mt-4 text-body">
              Find answers to common questions before reaching out.
            </p>
          </Reveal>

          <div className="mt-12 space-y-3">
            {faqs.map((faq, i) => (
              <Reveal key={i} delay={i * 80}>
                <details className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:border-slate-300 open:border-indigo-200 open:shadow-md">
                  <summary className="flex cursor-pointer items-center justify-between px-6 py-4 text-sm font-bold text-[var(--flyhigh-text)] [&::-webkit-details-marker]:hidden">
                    {faq.q}
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-all group-open:bg-[var(--flyhigh-primary)] group-open:text-white">
                      <svg
                        className="size-3.5 transition-transform group-open:rotate-45"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </span>
                  </summary>
                  <div className="px-6 pb-4 pt-0">
                    <p className="text-sm leading-relaxed text-body">
                      {faq.a}
                    </p>
                  </div>
                </details>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════ */}
      {/* CTA */}
      {/* ═══════════════════════════════════ */}
      <section className="relative overflow-hidden bg-white py-20 md:py-28">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-0 h-64 w-64 -translate-y-1/2 rounded-full bg-indigo-200/30 blur-3xl"
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
              Prefer to book a consultation?
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-body">
              Get instant expert advice by booking a call with one of our
              verified professionals right now.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button
                size="lg"
                onClick={handleFindExpert}
                className="h-12 gap-2 bg-[var(--flyhigh-primary)] px-8 text-base shadow-lg shadow-indigo-500/25 hover:bg-[var(--flyhigh-primary-hover)]"
              >
                Find an Expert
                <ArrowRight className="size-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={handleBrowseFaq}
                className="h-12 border-slate-300 px-8 text-base text-slate-700 hover:bg-white"
              >
                Browse FAQ
              </Button>
            </div>
          </Reveal>
        </div>
      </section>

      <Footer />
    </div>
  )
}
