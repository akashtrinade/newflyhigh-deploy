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
  status: string
  payoutStatus?: string | null
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

export interface ExpertPayout {
  id: string
  payoutAmount: number
  status: string
  gatewayReferenceId: string | null
  errorMessage: string | null
  earningCount: number
  accountNumber: string | null
  upiId: string | null
  createdAt: string | null
  processedAt: string | null
}

export interface PayoutDetails {
  accountHolderName: string | null
  accountNumber: string | null
  accountNumberLast4: string | null
  ifsc: string | null
  upiId: string | null
  verificationStatus: string | null
  verificationNote: string | null
}

export interface PayoutDetailsInput {
  accountHolderName?: string
  accountNumber?: string
  ifsc?: string
  upiId?: string
}
