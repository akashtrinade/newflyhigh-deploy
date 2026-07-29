import { ArrowRight, Check, Plane } from "lucide-react"

import { Button } from "@/components/ui/button"

import { Reveal } from "./Reveal"

const trustItems = ["Free to Join", "Pay Per Call", "Verified Experts"] as const

export function FinalCtaSection() {
  return (
    <section
      className="relative overflow-hidden bg-[var(--flyhigh-section)] py-20 md:py-28"
      aria-labelledby="final-cta-heading"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-0 h-64 w-64 -translate-y-1/2 rounded-full bg-indigo-200/40 blur-3xl"
      />

      <div className="relative mx-auto max-w-3xl px-4 text-center md:px-6">
        <Reveal>
          <div
            aria-hidden="true"
            className="mx-auto mb-6 flex size-14 items-center justify-center rounded-2xl bg-indigo-100"
          >
            <Plane className="size-7 text-[var(--flyhigh-primary)]" />
          </div>
          <h2
            id="final-cta-heading"
            className="text-3xl font-bold tracking-tight text-[var(--flyhigh-text)] md:text-4xl lg:text-5xl"
          >
            Ready to get expert advice?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-body">
            Join thousands of professionals who trust FlyHigh for instant,
            verified expert consultations.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button
              size="lg"
              className="h-12 gap-2 bg-[var(--flyhigh-primary)] px-8 shadow-lg shadow-indigo-500/25 hover:bg-[var(--flyhigh-primary-hover)]"
            >
              Find an Expert
              <ArrowRight className="size-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 border-slate-300 px-8 text-slate-700 hover:bg-white"
            >
              Create Account
            </Button>
          </div>

          <ul className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2">
            {trustItems.map((item) => (
              <li
                key={item}
                className="flex items-center gap-2 text-sm font-medium text-slate-600"
              >
                <Check
                  className="size-4 text-[var(--flyhigh-primary)]"
                  aria-hidden="true"
                />
                {item}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  )
}
