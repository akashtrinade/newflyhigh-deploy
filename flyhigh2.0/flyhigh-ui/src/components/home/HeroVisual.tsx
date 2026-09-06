import {
  BadgeCheck,
  Calendar,
  Mic,
  Scale,
  Star,
  TrendingUp,
  Video,
} from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import type { FeaturedExpert } from "@/types/public-stats"

const fallbackLiveExperts = [
  { initials: "PS", name: "Priya", role: "Legal", color: "from-indigo-500 to-violet-600" },
  { initials: "AM", name: "Arjun", role: "Finance", color: "from-emerald-500 to-teal-600" },
  { initials: "NK", name: "Neha", role: "Medical", color: "from-rose-500 to-pink-600" },
] as const

const fallbackActivityFeed = [
  { text: "Rahul booked Legal consult", time: "2m ago", dot: "bg-emerald-500" },
  { text: "Issue resolved — Tax filing", time: "5m ago", dot: "bg-sky-500" },
  { text: "⭐ 5.0 session completed", time: "8m ago", dot: "bg-amber-500" },
] as const

interface HeroVisualProps {
  heroExpert?: FeaturedExpert | null
  liveExperts?: { initials: string; name: string; role: string; color: string }[] | null
  onlineCount?: number | null
}

export function HeroVisual({ heroExpert, liveExperts, onlineCount }: HeroVisualProps) {
  const expertName = heroExpert?.name ?? "Dr. Priya Sharma"
  const expertInitials = heroExpert?.initials ?? "PS"
  const expertCategory = heroExpert?.category ?? "Legal Expert"
  const expertRate = heroExpert?.hourlyRate ?? 800
  const expertRating = heroExpert?.rating ?? 4.9
  const expertSessions = heroExpert?.reviewCount ?? 500
  const displayLiveExperts = liveExperts ?? fallbackLiveExperts
  const displayOnlineCount = onlineCount ?? 12
  return (
    <div className="hero-reveal hero-reveal-delay-4 relative mx-auto w-full max-w-[420px] lg:mx-0 lg:ml-auto">
      {/* Glow behind composition */}
      <div
        aria-hidden="true"
        className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-indigo-400/20 via-violet-300/10 to-transparent blur-2xl"
      />

      <div className="relative">
        {/* Main bento frame */}
        <div className="overflow-hidden rounded-3xl border border-white/80 bg-white/70 p-3 shadow-2xl shadow-indigo-500/15 ring-1 ring-indigo-100/80 backdrop-blur-md">
          <div className="grid grid-cols-12 gap-2.5">
            {/* Video session panel */}
            <div className="relative col-span-12 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-4 sm:col-span-7">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/20 px-2.5 py-1 text-[10px] font-bold tracking-wide text-red-300 uppercase">
                  <span className="size-1.5 animate-pulse rounded-full bg-red-400" />
                  Live Session
                </span>
                <span className="text-[10px] font-medium text-slate-400">
                  12:34
                </span>
              </div>

              <div className="mt-4 flex flex-col items-center">
                <div className="relative">
                  <div
                    aria-hidden="true"
                    className="absolute -inset-2 rounded-full bg-indigo-500/30 blur-md"
                  />
                  <Avatar className="relative size-16 border-2 border-white/20">
                    <AvatarFallback className="bg-gradient-to-br from-indigo-400 to-violet-600 text-lg font-bold text-white">
                      {expertInitials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute -right-0.5 -bottom-0.5 flex size-5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-slate-900">
                    <Video className="size-2.5 text-white" />
                  </span>
                </div>
                <p className="mt-3 text-sm font-bold text-white">
                  {expertName}
                </p>
                <p className="text-xs text-indigo-300">{expertCategory}</p>

                {/* Audio waveform */}
                <div className="mt-4 flex h-8 items-end justify-center gap-1">
                  {[3, 5, 8, 6, 9, 5, 7, 4, 8, 6, 5, 3].map((h, i) => (
                    <div
                      key={i}
                      className="waveform-bar w-1 rounded-full bg-indigo-400/80"
                      style={{
                        height: `${h * 3}px`,
                        animationDelay: `${i * 0.08}s`,
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="mt-3 flex items-center justify-center gap-2">
                <button
                  type="button"
                  aria-label="Mute"
                  className="flex size-8 items-center justify-center rounded-full bg-white/10 text-white/80"
                >
                  <Mic className="size-3.5" />
                </button>
                <button
                  type="button"
                  className="flex h-8 items-center gap-1.5 rounded-full bg-[var(--flyhigh-primary)] px-4 text-xs font-semibold text-white"
                >
                  <Video className="size-3.5" />
                  Join Call
                </button>
              </div>
            </div>

            {/* Side stack */}
            <div className="col-span-12 flex flex-col gap-2.5 sm:col-span-5">
              {/* Price chip */}
              <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-3.5">
                <p className="text-[10px] font-semibold tracking-wide text-indigo-500 uppercase">
                  Per hour
                </p>
                <p className="mt-0.5 text-2xl font-bold text-[var(--flyhigh-text)]">
                  ₹{expertRate}
                </p>
                <div className="mt-2 flex items-center gap-1 text-xs font-medium text-slate-600">
                  <Star className="size-3 fill-amber-400 text-amber-400" />
                  {expertRating} · {expertSessions}+ sessions
                </div>
              </div>

              {/* Verified badge */}
              <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-100 bg-emerald-50/80 px-3.5 py-3">
                <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-100">
                  <BadgeCheck className="size-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-emerald-800">
                    Verified Expert
                  </p>
                  <p className="text-[10px] text-emerald-600">
                    Background checked
                  </p>
                </div>
              </div>
            </div>

            {/* Activity feed */}
            <div className="col-span-12 rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
              <p className="mb-2.5 text-[10px] font-bold tracking-wide text-slate-500 uppercase">
                Live Activity
              </p>
              <div className="space-y-2">
                {fallbackActivityFeed.map((item) => (
                  <div
                    key={item.text}
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className={cn("size-1.5 shrink-0 rounded-full", item.dot)}
                      />
                      <p className="truncate text-xs font-medium text-slate-700">
                        {item.text}
                      </p>
                    </div>
                    <span className="shrink-0 text-[10px] text-slate-400">
                      {item.time}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Expert avatars row */}
            <div className="col-span-12 flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-3.5 py-2.5">
              <div className="flex -space-x-2">
                {displayLiveExperts.map((expert) => (
                  <Avatar
                    key={expert.initials}
                    className="size-8 ring-2 ring-white"
                  >
                    <AvatarFallback
                      className={cn(
                        "bg-gradient-to-br text-[10px] font-bold text-white",
                        expert.color
                      )}
                    >
                      {expert.initials}
                    </AvatarFallback>
                  </Avatar>
                ))}
                <div className="flex size-8 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500 ring-2 ring-white">
                  +{displayOnlineCount}
                </div>
              </div>
              <p className="text-xs font-semibold text-slate-600">
                Experts online now
              </p>
            </div>
          </div>
        </div>

        {/* Floating category pills */}
        <div
          aria-hidden="true"
          className="absolute -top-3 -left-2 flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-lg md:-left-6"
        >
          <Scale className="size-3.5 text-indigo-500" />
          <span className="text-xs font-semibold text-slate-700">Legal</span>
        </div>

        <div
          aria-hidden="true"
          className="absolute -right-2 top-1/4 flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-lg md:-right-6"
        >
          <TrendingUp className="size-3.5 text-emerald-500" />
          <span className="text-xs font-semibold text-slate-700">Finance</span>
        </div>

        <div
          aria-hidden="true"
          className="absolute -bottom-2 left-4 flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 shadow-lg md:left-0"
        >
          <Calendar className="size-3.5 text-emerald-600" />
          <span className="text-xs font-semibold text-emerald-700">
            Booked just now
          </span>
        </div>
      </div>
    </div>
  )
}
