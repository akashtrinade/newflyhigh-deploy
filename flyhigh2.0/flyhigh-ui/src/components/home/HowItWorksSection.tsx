import { ArrowRight } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useAuth } from "@/contexts/AuthContext"

import { howItWorksSteps } from "./data"
import { Reveal } from "./Reveal"
import { SectionLabel } from "./SectionLabel"

export function HowItWorksSection() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const handleStartNow = () => {
    if (user) {
      navigate("/search-experts")
    } else {
      navigate("/signup")
    }
  }
  return (
    <section
      id="how-it-works"
      className="bg-white py-16 md:py-24"
      aria-labelledby="how-it-works-heading"
    >
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <SectionLabel>How It Works</SectionLabel>
          <h2
            id="how-it-works-heading"
            className="mt-3 text-3xl font-bold tracking-tight text-[var(--flyhigh-text)] md:text-4xl"
          >
            5 Steps to Your Expert Session
          </h2>
          <p className="mt-4 text-body">
            Get expert help in five simple steps — no subscriptions, no hassle.
          </p>
        </Reveal>

        <div className="relative mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {howItWorksSteps.map((step, index) => {
            const Icon = step.icon
            return (
              <Reveal key={step.step} delay={index * 120}>
                <div className="relative flex flex-col items-center text-center">
                  <div className="relative mb-5 flex size-16 items-center justify-center rounded-2xl border-2 border-indigo-100 bg-indigo-50">
                    <span className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full bg-[var(--flyhigh-primary)] text-[10px] font-bold text-white">
                      0{step.step}
                    </span>
                    <Icon
                      className="size-7 text-[var(--flyhigh-primary)]"
                      aria-hidden="true"
                    />
                  </div>
                  <h3 className="text-lg font-bold text-[var(--flyhigh-text)]">
                    {step.title}
                  </h3>
                  <p className="mt-2 max-w-xs text-sm leading-relaxed text-body">
                    {step.description}
                  </p>

                  {index < howItWorksSteps.length - 1 && (
                    <div
                      aria-hidden="true"
                      className="absolute top-8 -right-4 hidden xl:block"
                    >
                      <ArrowRight className="size-5 text-indigo-300" />
                    </div>
                  )}
                </div>
              </Reveal>
            )
          })}
        </div>

        <Reveal delay={400} className="mt-14">
          <Card className="overflow-hidden border-0 bg-gradient-to-r from-[var(--flyhigh-primary)] to-[var(--flyhigh-primary-hover)] shadow-xl shadow-indigo-500/20">
            <CardContent className="flex flex-col items-center justify-between gap-4 p-6 sm:flex-row sm:px-8">
              <p className="text-center text-base font-semibold text-white sm:text-left">
                Ready to get started? Join thousands of professionals on FlyHigh.
              </p>
              <Button
                size="lg"
                onClick={handleStartNow}
                className="h-11 shrink-0 gap-2 bg-white px-6 text-[var(--flyhigh-primary)] hover:bg-white/90"
              >
                Start Now — It&apos;s Free to Join
                <ArrowRight className="size-4" />
              </Button>
            </CardContent>
          </Card>
        </Reveal>
      </div>
    </section>
  )
}
