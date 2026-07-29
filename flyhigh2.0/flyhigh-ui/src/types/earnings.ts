export interface EarningsSummary {
  availableBalance: number
  pendingBalance: number
  lifetimeEarnings: number
  platformCommission: number
  totalSessions: number
  averageRating: number
}

export interface ExpertEarning {
  id: string
  sessionDate: string
  clientName: string
  duration: number
  clientPaid: number
  platformFee: number
  expertEarning: number
  status: "PENDING" | "AVAILABLE" | "WITHDRAWN"
}

export interface EarningsPage {
  earnings: ExpertEarning[]
  totalElements: number
  totalPages: number
  currentPage: number
  pageSize: number
}

export interface EarningsFilters {
  page?: number
  size?: number
  status?: string
  fromDate?: string
  toDate?: string
  search?: string
}
