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
export function HomePage() {
  return (
    <div className="min-h-svh bg-white">
      <Navbar />
      <main>
        <HeroSection />
        <TrustSection />
        <HowItWorksSection />
        <CategoriesSection />
        <TrustBarSection />
        <FeaturedExpertsSection />
        <WhyFlyHighSection />
        <TestimonialsSection />
        <ExpertCtaSection />
        <FinalCtaSection />
      </main>
      <Footer />
    </div>
  )
}

export default HomePage

