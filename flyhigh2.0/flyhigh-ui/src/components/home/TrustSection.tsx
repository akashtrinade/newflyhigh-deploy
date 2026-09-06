import { Phone, Star, UserCheck, Users } from "lucide-react"

import { AnimatedStat } from "./AnimatedStat"
import { Reveal } from "./Reveal"
import { trustStats as fallbackTrustStats } from "./data"

const statIcons = [Users, UserCheck, Phone, Star]

interface TrustSectionProps {
  totalUsers?: number | null
  verifiedExperts?: number | null
  totalConsultations?: number | null
  averageRating?: number | null
}

export function TrustSection({
  totalUsers,
  verifiedExperts,
  totalConsultations,
  averageRating,
}: TrustSectionProps) {
  const trustStats = [
    {
      value: totalUsers ? `${totalUsers.toLocaleString("en-IN")}+` : fallbackTrustStats[0].value,
      label: fallbackTrustStats[0].label,
      numeric: totalUsers ?? fallbackTrustStats[0].numeric,
      suffix: "+",
    },
    {
      value: verifiedExperts ? `${verifiedExperts.toLocaleString("en-IN")}+` : fallbackTrustStats[1].value,
      label: fallbackTrustStats[1].label,
      numeric: verifiedExperts ?? fallbackTrustStats[1].numeric,
      suffix: "+",
    },
    {
      value: totalConsultations ? `${totalConsultations.toLocaleString("en-IN")}+` : fallbackTrustStats[2].value,
      label: fallbackTrustStats[2].label,
      numeric: totalConsultations ?? fallbackTrustStats[2].numeric,
      suffix: "+",
    },
    {
      value: averageRating ? `${averageRating.toFixed(1)}/5` : fallbackTrustStats[3].value,
      label: fallbackTrustStats[3].label,
      numeric: averageRating ?? fallbackTrustStats[3].numeric,
      suffix: "/5",
      decimals: 1,
    },
  ] as const
  return (
    <section
      id="trust"
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

      </div>
    </section>
  )
}
