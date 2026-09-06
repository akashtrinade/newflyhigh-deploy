// ── Home page stats types — matching backend HomePageStatsResponse ──

export interface FeaturedExpert {
  id: string
  name: string
  category: string
  rating: number
  reviewCount: number
  hourlyRate: number
  isOnline: boolean
  initials: string
}

export interface CategoryCount {
  name: string
  expertCount: number
}

export interface ReviewItem {
  clientName: string
  rating: number
  feedback: string
  createdAt: string
}

export interface HomePageStats {
  totalUsers: number
  verifiedExperts: number
  totalConsultations: number
  averageRating: number
  featuredExperts: FeaturedExpert[]
  categoryCounts: CategoryCount[]
  recentReviews: ReviewItem[]
}
