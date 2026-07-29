import { Phone, Star, UserCheck, Users } from "lucide-react"

import { AnimatedStat } from "./AnimatedStat"
import { Reveal } from "./Reveal"
import { trustedCompanies, trustStats } from "./data"

const statIcons = [Users, UserCheck, Phone, Star]

export function TrustSection() {
  return (
    <section
      id="pricing"
      className="border-y border-slate-200 bg-white py-12 md:py-14"
      aria-label="Trust and statistics"
    >
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="grid grid-cols-2 divide-x-0 divide-y divide-slate-200 md:grid-cols-4 md:divide-x md:divide-y-0">
          {trustStats.map((stat, index) => {
            const Icon = statIcons[index]
            return (
              <Reveal key={stat.label} delay={index * 80} className="px-4 py-4 md:py-0">
                <div className="flex flex-col items-center text-center md:px-6">
                  <Icon
                    className="mb-2 size-5 text-[var(--flyhigh-primary)]"
                    aria-hidden="true"
                  />
                  <p className="text-2xl font-bold tracking-tight text-[var(--flyhigh-text)] md:text-3xl">
                    <AnimatedStat
                      numeric={stat.numeric}
                      suffix={stat.suffix}
                      decimals={"decimals" in stat ? stat.decimals : 0}
                    />
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-600">
                    {stat.label}
                  </p>
                </div>
              </Reveal>
            )
          })}
        </div>

        <Reveal delay={200} className="mt-14 text-center">
          <p className="mb-6 text-xs font-semibold tracking-[0.2em] text-slate-500 uppercase">
            Trusted by teams at
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 md:gap-x-14">
            {trustedCompanies.map((company) => (
              <span
                key={company}
                className="text-base font-bold tracking-tight text-slate-400 select-none md:text-lg"
                aria-label={company}
              >
                {company}
              </span>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
