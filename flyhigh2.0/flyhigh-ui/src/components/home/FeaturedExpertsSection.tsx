import { BadgeCheck, Star, Video } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card"

import { featuredExperts } from "./data"
import { Reveal } from "./Reveal"
import { SectionLabel } from "./SectionLabel"
import { getClientHourlyRate } from "@/lib/pricing"

export function FeaturedExpertsSection() {
  return (
    <section
      id="experts"
      className="bg-white py-16 md:py-24"
      aria-labelledby="experts-heading"
    >
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <SectionLabel>Featured</SectionLabel>
          <h2
            id="experts-heading"
            className="mt-3 text-3xl font-bold tracking-tight text-[var(--flyhigh-text)] md:text-4xl"
          >
            Top Experts This Week
          </h2>
          <p className="mt-4 text-body">
            Hand-picked professionals with outstanding ratings and proven track
            records.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {featuredExperts.map((expert, index) => (
            <Reveal key={expert.id} delay={index * 100}>
              <Card className="h-full border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:scale-[1.02] hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/10">
                <CardHeader className="items-center text-center">
                  <div className="relative">
                    <Avatar size="lg" className="size-16">
                      <AvatarFallback className="bg-gradient-to-br from-[var(--flyhigh-primary)] to-[var(--flyhigh-primary-hover)] text-lg font-bold text-white">
                        {expert.avatar}
                      </AvatarFallback>
                    </Avatar>
                    {expert.online && (
                      <span className="absolute right-0 bottom-0 size-3.5 rounded-full border-2 border-white bg-emerald-500" />
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-center gap-1.5">
                    <h3 className="font-bold text-[var(--flyhigh-text)]">
                      {expert.name}
                    </h3>
                    <BadgeCheck
                      className="size-4 text-[var(--flyhigh-primary)]"
                      aria-label="Verified expert"
                    />
                  </div>
                  <span className="mt-1 inline-flex rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-[var(--flyhigh-primary)]">
                    {expert.category}
                  </span>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="flex items-center justify-center gap-3 text-sm">
                    <span className="flex items-center gap-1 font-semibold text-[var(--flyhigh-text)]">
                      <Star
                        className="size-3.5 fill-[var(--flyhigh-accent)] text-[var(--flyhigh-accent)]"
                        aria-hidden="true"
                      />
                      {expert.rating}
                    </span>
                    <span className="text-slate-600">
                      {expert.sessions} sessions
                    </span>
                  </div>
                  <p className="mt-3 text-xl font-bold text-[var(--flyhigh-text)]">
                    ₹{getClientHourlyRate(expert.price).toFixed(0)}
                    <span className="text-sm font-medium text-slate-500">
                      /hr
                    </span>
                  </p>
                </CardContent>
                <CardFooter className="flex gap-2 border-t border-slate-100 bg-slate-50/50">
                  <Button
                    size="sm"
                    className="flex-1 gap-1.5 bg-[var(--flyhigh-primary)] hover:bg-[var(--flyhigh-primary-hover)]"
                  >
                    <Video className="size-3.5" aria-hidden="true" />
                    Start Call
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 border-slate-300 text-slate-700"
                  >
                    View Profile
                  </Button>
                </CardFooter>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
