import { ArrowRight, Clock, IndianRupee, Users } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { Reveal } from "./Reveal"
import { SectionLabel } from "./SectionLabel"

const expertStats = [
  { icon: IndianRupee, value: "₹50,000+", label: "Average Monthly Earnings" },
  { icon: Users, value: "500+", label: "Experts" },
  { icon: Clock, value: "10 min", label: "Setup" },
] as const

export function ExpertCtaSection() {
  const [sessions, setSessions] = useState(20)
  const [rate, setRate] = useState(800)
  const estimatedEarnings = sessions * rate

  return (
    <section
      className="bg-[var(--flyhigh-dark)] py-16 text-white md:py-24"
      aria-labelledby="expert-cta-heading"
    >
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 md:px-6 lg:grid-cols-2 lg:gap-16">
        <Reveal direction="left">
          <SectionLabel className="text-indigo-300">For Experts</SectionLabel>
          <h2
            id="expert-cta-heading"
            className="mt-3 text-3xl font-bold tracking-tight md:text-4xl"
          >
            Turn Your Expertise Into Income
          </h2>
          <p className="mt-4 text-slate-300">
            Join hundreds of verified experts earning on their own schedule.
            Share your knowledge and get paid for every consultation.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-4">
            {expertStats.map((stat) => {
              const Icon = stat.icon
              return (
                <div key={stat.label} className="text-center sm:text-left">
                  <Icon
                    className="mx-auto mb-2 size-5 text-[var(--flyhigh-accent)] sm:mx-0"
                    aria-hidden="true"
                  />
                  <p className="text-lg font-bold sm:text-xl">{stat.value}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{stat.label}</p>
                </div>
              )
            })}
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <Button
              size="lg"
              className="h-11 gap-2 bg-[var(--flyhigh-primary)] hover:bg-[var(--flyhigh-primary-hover)]"
            >
              Apply As Expert
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-11 border-slate-500 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              Learn More
            </Button>
          </div>
        </Reveal>

        <Reveal direction="right" delay={150}>
          <Card className="border-slate-600/50 bg-slate-800/80 text-white ring-1 ring-slate-600/30 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Earnings Calculator</CardTitle>
              <CardDescription className="text-slate-400">
                Estimate your monthly income based on sessions and rate.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label
                  htmlFor="sessions-slider"
                  className="mb-2 flex justify-between text-sm"
                >
                  <span className="text-slate-300">Sessions per month</span>
                  <span className="font-bold text-white">{sessions}</span>
                </label>
                <input
                  id="sessions-slider"
                  type="range"
                  min={5}
                  max={60}
                  step={5}
                  value={sessions}
                  onChange={(e) => setSessions(Number(e.target.value))}
                  className="w-full accent-[var(--flyhigh-primary)]"
                />
              </div>
              <div>
                <label
                  htmlFor="rate-slider"
                  className="mb-2 flex justify-between text-sm"
                >
                  <span className="text-slate-300">Rate per hour</span>
                  <span className="font-bold text-white">₹{rate}</span>
                </label>
                <input
                  id="rate-slider"
                  type="range"
                  min={300}
                  max={2000}
                  step={50}
                  value={rate}
                  onChange={(e) => setRate(Number(e.target.value))}
                  className="w-full accent-[var(--flyhigh-primary)]"
                />
              </div>
              <div className="rounded-xl border border-slate-600/50 bg-slate-700/50 p-5 text-center">
                <p className="text-sm text-slate-400">
                  Estimated monthly earnings
                </p>
                <p className="mt-1 text-3xl font-bold text-[var(--flyhigh-accent)]">
                  ₹{estimatedEarnings.toLocaleString("en-IN")}
                </p>
              </div>
            </CardContent>
          </Card>
        </Reveal>
      </div>
    </section>
  )
}
