// ── Payment Types ──

export interface CreateOrderRequest {
  interactionId: string
  durationMinutes: number  // 15, 30, 45, 60
  type?: "INITIAL" | "EXTENSION"
}

export interface CreateOrderResponse {
  orderId: string
  amount: string       // Amount in paise
  currency: string     // INR
  keyId: string        // Razorpay key_id
}

export interface PaymentVerifyRequest {
  interactionId: string
  razorpayPaymentId: string
  razorpayOrderId: string
  razorpaySignature: string
}

export interface SessionStateResponse {
  interactionId: string
  phase: "FREE_SESSION" | "PAYMENT_PENDING" | "PAID_SESSION" | "COMPLETED" | "FREE_SESSION_EXPIRED"
  freeTrialRemainingSec: number
  paidSessionRemainingSec: number
  totalPaidDurationMin: number
  elapsedPaidSeconds: number
  recommendedDurationMin: number | null
  paymentStatus: "UNPAID" | "HELD" | "PAID"
  totalPaidAmount: number | null
  expertAmount: number | null       // Expert's base earning for this session
  commissionAmount: number | null   // Platform commission for this session
  commissionPercent: number | null  // Commission percentage used
  showExtendPrompt: boolean
  expertHourlyRate: number          // Expert's base earning rate
  clientHourlyRate: number          // Client-facing rate (expert rate + commission)
}

export interface DurationRecommendationRequest {
  interactionId: string
  recommendedDurationMinutes: number
}

export interface RazorpayCheckoutOptions {
  key: string
  amount: string        // In paise
  currency: string
  name: string
  description: string
  order_id: string
  handler: (response: RazorpayPaymentResponse) => void
  prefill: {
    name: string
    email: string
    contact?: string
  }
  theme: {
    color: string
  }
  modal: {
    ondismiss: () => void
    escape: boolean
    animation: boolean
    backdropclose: boolean
    confirm_close: boolean
  }
}

export interface RazorpayPaymentResponse {
  razorpay_payment_id: string
  razorpay_order_id: string
  razorpay_signature: string
}

export interface SessionTimerState {
  phase: SessionStateResponse["phase"]
  freeTrialRemainingSec: number
  paidSessionRemainingSec: number
  totalPaidDurationMin: number
  elapsedPaidSeconds: number
  recommendedDurationMin: number | null
  isPaid: boolean
  showExtendPrompt: boolean
  expertHourlyRate: number
  clientHourlyRate: number
  totalPaidAmount: number | null
  expertAmount: number | null
  commissionAmount: number | null
  commissionPercent: number | null
}

// Global type for window.Razorpay
declare global {
  interface Window {
    Razorpay: new (options: RazorpayCheckoutOptions) => {
      open: () => void
      close: () => void
      on: (event: string, callback: (data: unknown) => void) => void
    }
  }
}

export {}
