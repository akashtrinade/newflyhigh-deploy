import { Check, CreditCard, MessageSquare, Shield, Video } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

import { whyFlyHighFeatures } from "./data"
import { Reveal } from "./Reveal"
import { SectionLabel } from "./SectionLabel"

export function WhyFlyHighSection() {
  return (
    <section
      id="about"
      className="bg-[var(--flyhigh-section)] py-16 md:py-24"
      aria-labelledby="why-flyhigh-heading"
    >
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 md:px-6 lg:grid-cols-2 lg:gap-16">
        <Reveal direction="left">
          <SectionLabel>Why FlyHigh</SectionLabel>
          <h2
            id="why-flyhigh-heading"
            className="mt-3 text-3xl font-bold tracking-tight text-[var(--flyhigh-text)] md:text-4xl"
          >
            Enterprise-grade consultations, built for speed
          </h2>
          <p className="mt-4 text-body">
            Designed for professionals who need verified answers fast — with
            security and quality at every step.
          </p>

          <ul className="mt-8 space-y-4">
            {whyFlyHighFeatures.map((feature) => (
              <li key={feature} className="flex items-center gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-indigo-100">
                  <Check
                    className="size-4 text-[var(--flyhigh-primary)]"
                    aria-hidden="true"
                  />
                </span>
                <span className="font-semibold text-[var(--flyhigh-text)]">
                  {feature}
                </span>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal direction="right" delay={150}>
          <div className="flex justify-center lg:justify-end">
            <div className="relative w-full max-w-[280px]">
              <div
                aria-hidden="true"
                className="absolute -inset-4 rounded-[2.5rem] bg-gradient-to-br from-indigo-300/30 to-violet-200/20 blur-2xl"
              />
              <Card className="relative overflow-hidden rounded-[2rem] border-4 border-slate-800 bg-slate-800 shadow-2xl">
                <div className="flex items-center justify-center gap-1 bg-slate-800 py-2">
                  <div className="h-1 w-16 rounded-full bg-white/30" />
                </div>
                <CardContent className="space-y-3 bg-white p-4">
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                    <div className="flex size-8 items-center justify-center rounded-full bg-indigo-100">
                      <MessageSquare
                        className="size-4 text-[var(--flyhigh-primary)]"
                        aria-hidden="true"
                      />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        Dr. Priya Sharma
                      </p>
                      <p className="text-[10px] font-medium text-slate-500">
                        Legal Expert · Online
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-[var(--flyhigh-primary)] px-3 py-2 text-[11px] font-medium text-white">
                      I need help reviewing a startup agreement.
                    </div>
                    <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-slate-100 px-3 py-2 text-[11px] font-medium text-slate-700">
                      I can walk you through the key clauses. Let&apos;s start a
                      video call.
                    </div>
                  </div>

                  <div className="relative overflow-hidden rounded-xl bg-slate-800 p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Video
                          className="size-4 text-white"
                          aria-hidden="true"
                        />
                        <span className="text-[10px] font-semibold text-white">
                          Video Call
                        </span>
                      </div>
                      <span className="rounded bg-red-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                        LIVE
                      </span>
                    </div>
                    <div className="mt-2 flex h-16 items-center justify-center rounded-lg bg-white/10">
                      <div className="flex size-10 items-center justify-center rounded-full bg-indigo-500/40">
                        <Video
                          className="size-5 text-white"
                          aria-hidden="true"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                    <div className="flex items-center gap-2">
                      <CreditCard
                        className="size-3.5 text-slate-500"
                        aria-hidden="true"
                      />
                      <div>
                        <p className="text-[10px] font-medium text-slate-500">
                          Payment
                        </p>
                        <p className="text-xs font-bold text-slate-800">₹800</p>
                      </div>
                    </div>
                    <Shield
                      className="size-3.5 text-emerald-600"
                      aria-hidden="true"
                    />
                  </div>

                  <Badge className="w-full justify-center border border-emerald-200 bg-emerald-50 font-semibold text-emerald-700 hover:bg-emerald-50">
                    ✓ Issue Resolved
                  </Badge>
                </CardContent>
              </Card>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
