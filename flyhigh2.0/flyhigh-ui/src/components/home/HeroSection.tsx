import { ArrowRight, Check, Star } from "lucide-react"

import { Avatar, AvatarFallback, AvatarGroup } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import { HeroVisual } from "./HeroVisual"

const socialAvatars = ["AK", "RS", "PM", "DV", "SK"]

export function HeroSection() {
  return (
    <section
      id="home"
      className="relative overflow-hidden pt-28 pb-16 md:pt-36 md:pb-24"
    >
      <div aria-hidden="true" className="hero-bg pointer-events-none absolute inset-0">
        <div className="hero-bg-base absolute inset-0" />
        <div className="hero-bg-mesh absolute inset-0" />
        <div className="hero-bg-grid absolute inset-0" />
        <div className="hero-bg-shine absolute inset-0" />
        <div className="hero-bg-fade absolute inset-x-0 bottom-0 h-40" />
      </div>

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 md:px-6 lg:grid-cols-2 lg:gap-16">
        <div>
          <Badge
            variant="outline"
            className="hero-reveal hero-reveal-delay-1 mb-6 h-7 gap-1.5 border-indigo-200 bg-indigo-50 px-3 font-medium text-[var(--flyhigh-primary)]"
          >
            <Star className="size-3 fill-[var(--flyhigh-accent)] text-[var(--flyhigh-accent)]" />
            Trusted by 10,000+ users across India
          </Badge>

          <h1 className="font-heading text-4xl leading-[1.08] font-bold tracking-tight text-[var(--flyhigh-text)] sm:text-5xl md:text-[3.25rem] lg:text-[3.75rem]">
            <span className="hero-reveal hero-reveal-delay-2 block">
              Get Expert Advice
            </span>
            <span className="hero-reveal hero-reveal-delay-3 block text-gradient-brand">
              Anytime, Anywhere.
            </span>
          </h1>

          <p className="hero-reveal hero-reveal-delay-4 mt-6 max-w-lg text-base leading-relaxed text-body md:text-lg">
            Connect with verified experts across Legal, Finance, Medical,
            Technology, Career and Business — through secure video consultations.
          </p>

          <div className="hero-reveal hero-reveal-delay-5 mt-8 flex flex-wrap gap-3">
            <Button
              size="lg"
              className="h-12 gap-2 bg-[var(--flyhigh-primary)] px-7 text-base shadow-lg shadow-indigo-500/25 hover:bg-[var(--flyhigh-primary-hover)]"
            >
              Find an Expert
              <ArrowRight className="size-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 border-slate-300 px-7 text-base text-slate-700 hover:bg-slate-50"
            >
              Become an Expert
            </Button>
          </div>

          <ul className="hero-reveal hero-reveal-delay-5 mt-8 flex flex-wrap gap-x-6 gap-y-2">
            {["No subscription", "Pay per call only", "Secure & private"].map(
              (item) => (
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
              )
            )}
          </ul>

          <div className="hero-reveal hero-reveal-delay-6 mt-8 flex items-center gap-4">
            <AvatarGroup>
              {socialAvatars.map((initials) => (
                <Avatar key={initials} size="sm">
                  <AvatarFallback className="bg-indigo-100 text-xs font-semibold text-[var(--flyhigh-primary)]">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              ))}
            </AvatarGroup>
            <div className="text-sm">
              <p className="font-semibold text-[var(--flyhigh-text)]">
                Join 10,000+ professionals already on FlyHigh
              </p>
              <div className="mt-0.5 flex items-center gap-1 text-muted-fh">
                <Star
                  className="size-3.5 fill-[var(--flyhigh-accent)] text-[var(--flyhigh-accent)]"
                  aria-hidden="true"
                />
                4.9/5 average rating
              </div>
            </div>
          </div>
        </div>

        <HeroVisual />
      </div>
    </section>
  )
}
