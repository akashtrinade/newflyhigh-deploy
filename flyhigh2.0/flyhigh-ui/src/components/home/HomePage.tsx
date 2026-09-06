import { useEffect, useState } from "react"
import { CategoriesSection } from "./CategoriesSection"
import { ExpertCtaSection } from "./ExpertCtaSection"
import { FeaturedExpertsSection } from "./FeaturedExpertsSection"
import { FinalCtaSection } from "./FinalCtaSection"
import { HeroSection } from "./HeroSection"
import { HowItWorksSection } from "./HowItWorksSection"
import { TestimonialsSection } from "./TestimonialsSection"
import { TrustBarSection } from "./TrustBarSection"
import { TrustSection } from "./TrustSection"
import { WhyFlyHighSection } from "./WhyFlyHighSection"
import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/layout/Footer"
import { fetchHomePageStats } from "@/lib/public-stats"
import type { HomePageStats } from "@/types/public-stats"

export function HomePage() {
  const [stats, setStats] = useState<HomePageStats | null>(null)

  useEffect(() => {
    fetchHomePageStats()
      .then(setStats)
      .catch(() => {
        // Silently use fallback dummy data — stats stays null
      })
  }, [])

  return (
    <div className="min-h-svh bg-white">
      <Navbar />
      <main>
        <HeroSection
          totalUsers={stats?.totalUsers ?? null}
          averageRating={stats?.averageRating ?? null}
          featuredExperts={stats?.featuredExperts ?? null}
          verifiedExperts={stats?.verifiedExperts ?? null}
        />
        <TrustSection
          totalUsers={stats?.totalUsers ?? null}
          verifiedExperts={stats?.verifiedExperts ?? null}
          totalConsultations={stats?.totalConsultations ?? null}
          averageRating={stats?.averageRating ?? null}
        />
        <HowItWorksSection />
        <CategoriesSection categoryCounts={stats?.categoryCounts ?? null} />
        <TrustBarSection />
        <FeaturedExpertsSection experts={stats?.featuredExperts ?? null} />
        <WhyFlyHighSection />
        <TestimonialsSection reviews={stats?.recentReviews ?? null} />
        <ExpertCtaSection verifiedExperts={stats?.verifiedExperts ?? null} />
        <FinalCtaSection />
      </main>
      <Footer />
    </div>
  )
}

export default HomePage
