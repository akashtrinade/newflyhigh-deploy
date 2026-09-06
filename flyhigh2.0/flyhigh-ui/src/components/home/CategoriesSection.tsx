import { ArrowRight, ChevronRight } from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useAuth } from "@/contexts/AuthContext"

import { categories as fallbackCategories } from "./data"
import { Reveal } from "./Reveal"
import { SectionLabel } from "./SectionLabel"
import type { CategoryCount } from "@/types/public-stats"

interface CategoriesSectionProps {
  categoryCounts?: CategoryCount[] | null
}

export function CategoriesSection({ categoryCounts }: CategoriesSectionProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [expanded, setExpanded] = useState(false)

  const INITIAL_COUNT = 8 // 2 rows × 4 columns on large screens

  // Merge real counts with static icon/color definitions from data.ts
  const countMap = new Map(categoryCounts?.map((c) => [c.name, c.expertCount]) ?? [])
  const displayCategories = fallbackCategories.map((cat) => ({
    ...cat,
    expertCount: countMap.get(cat.name) ?? cat.expertCount,
  }))

  // Add any DB categories not already in the static list
  if (categoryCounts) {
    for (const cc of categoryCounts) {
      if (!fallbackCategories.some((c) => c.name === cc.name)) {
        displayCategories.push({
          name: cc.name,
          icon: fallbackCategories[0].icon, // default icon
          expertCount: cc.expertCount,
          color: "bg-indigo-50 text-indigo-600",
        })
      }
    }
  }

  const hasMore = displayCategories.length > INITIAL_COUNT
  const visibleCategories = expanded ? displayCategories : displayCategories.slice(0, INITIAL_COUNT)

  const handleBrowseCategory = (categoryName: string) => {
    const base = user ? "/search-experts" : "/login"
    navigate(`${base}?category=${encodeURIComponent(categoryName)}`)
  }

  return (
    <section
      id="categories"
      className="bg-[var(--flyhigh-section)] py-16 md:py-24"
      aria-labelledby="categories-heading"
    >
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <SectionLabel>Explore Expertise</SectionLabel>
          <h2
            id="categories-heading"
            className="mt-3 text-3xl font-bold tracking-tight text-[var(--flyhigh-text)] md:text-4xl"
          >
            Find the Right Expert for You
          </h2>
          <p className="mt-4 text-body">
            Browse specialists across every domain — from legal advice to mental
            wellness.
          </p>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {visibleCategories.map((category, index) => {
            const Icon = category.icon
            return (
              <Reveal key={category.name} delay={index * 60}>
                <Card
                  onClick={() => handleBrowseCategory(category.name)}
                  className="group h-full cursor-pointer border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-500/5"
                >
                  <CardContent className="flex h-full flex-col p-5">
                    <div
                      className={`mb-4 flex size-11 items-center justify-center rounded-xl ${category.color}`}
                    >
                      <Icon className="size-5" aria-hidden="true" />
                    </div>
                    <h3 className="font-bold text-[var(--flyhigh-text)]">
                      {category.name}
                    </h3>
                    <p className="mt-1 text-sm font-medium text-slate-600">
                      {category.expertCount}+ experts
                    </p>
                    <div className="mt-auto flex items-center justify-between pt-4">
                      <span className="text-sm font-semibold text-[var(--flyhigh-primary)]">
                        Browse
                      </span>
                      <ChevronRight className="size-4 text-[var(--flyhigh-primary)] transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </CardContent>
                </Card>
              </Reveal>
            )
          })}
        </div>

        {hasMore && (
          <Reveal delay={500} className="mt-10 text-center">
            <Button
              variant="outline"
              size="lg"
              onClick={() => setExpanded(!expanded)}
              className="h-11 gap-2 border-slate-300 px-8 text-slate-700 hover:bg-white"
            >
              {expanded ? "Show Less" : `View All Categories (${displayCategories.length})`}
              <ArrowRight className={`size-4 transition-transform ${expanded ? "rotate-90" : ""}`} />
            </Button>
          </Reveal>
        )}
      </div>
    </section>
  )
}
