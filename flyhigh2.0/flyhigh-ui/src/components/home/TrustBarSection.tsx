import { Clock, CreditCard, ShieldCheck, UserCheck } from "lucide-react"

import { Reveal } from "./Reveal"

const features = [
  {
    icon: UserCheck,
    title: "Verified Experts",
    description: "Background-checked professionals",
  },
  {
    icon: ShieldCheck,
    title: "Secure & Private",
    description: "End-to-end encrypted calls",
  },
  {
    icon: CreditCard,
    title: "Pay Per Call",
    description: "No subscription required",
  },
  {
    icon: Clock,
    title: "Quick Support",
    description: "Connect in under 2 minutes",
  },
] as const

export function TrustBarSection() {
  return (
    <section
      className="bg-[var(--flyhigh-dark)] py-10 md:py-12"
      aria-label="Platform trust features"
    >
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 md:grid-cols-4 md:gap-6 md:px-6">
        {features.map((feature, index) => {
          const Icon = feature.icon
          return (
            <Reveal key={feature.title} delay={index * 100} direction="up">
              <div className="flex flex-col items-center text-center md:flex-row md:items-start md:gap-3 md:text-left">
                <div className="mb-3 flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 md:mb-0">
                  <Icon className="size-5 text-[var(--flyhigh-accent)]" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    {feature.title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">
                    {feature.description}
                  </p>
                </div>
              </div>
            </Reveal>
          )
        })}
      </div>
    </section>
  )
}
