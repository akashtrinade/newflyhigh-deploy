import { api, axiosInstance } from "@/api/client"
import type {
  CreateOrderRequest,
  CreateOrderResponse,
  PaymentVerifyRequest,
  SessionStateResponse,
  DurationRecommendationRequest,
  PaymentHistoryPage,
} from "@/types/payment"
import {
  CreateOrderResponseSchema,
  SessionStateResponseSchema,
  MessageResponseSchema,
} from "@/lib/validation"

// ── Idempotency key generator ─────────────────────────────────

let idempotencyCounter = 0

/** Generates a unique idempotency key per request to prevent duplicate charges. */
function generateIdempotencyKey(): string {
  idempotencyCounter++
  return `${crypto.randomUUID()}-${idempotencyCounter}`
}

// ── Payment API ───────────────────────────────────────────────

/**
 * Create a Razorpay order for the selected duration.
 * Sends X-Idempotency-Key to prevent duplicate orders from double-clicks.
 */
export async function createOrder(
  data: CreateOrderRequest,
): Promise<CreateOrderResponse> {
  const idempotencyKey = generateIdempotencyKey()
  return api.post<CreateOrderResponse>("/payments/create-order", data, {
    schema: CreateOrderResponseSchema,
    headers: { "X-Idempotency-Key": idempotencyKey },
  })
}

/**
 * Verify a Razorpay payment signature after checkout.
 */
export async function verifyPayment(
  data: PaymentVerifyRequest,
): Promise<SessionStateResponse> {
  return api.post<SessionStateResponse>("/payments/verify", data, {
    schema: SessionStateResponseSchema,
  })
}

/**
 * Poll the current session state (timer, phase, payment status).
 * Called every 2 seconds by both client and expert.
 * No schema validation on polling to avoid console noise.
 */
export async function getSessionState(
  interactionId: string,
): Promise<SessionStateResponse> {
  return api.get<SessionStateResponse>(
    `/payments/session-state/${interactionId}`,
  )
}

/**
 * Expert recommends a consultation duration.
 */
export async function recommendDuration(
  data: DurationRecommendationRequest,
): Promise<SessionStateResponse> {
  return api.post<SessionStateResponse>("/payments/recommend", data, {
    schema: SessionStateResponseSchema,
  })
}

/**
 * Create an extension order for additional time.
 */
export async function extendSession(
  data: CreateOrderRequest,
): Promise<CreateOrderResponse> {
  const idempotencyKey = generateIdempotencyKey()
  return api.post<CreateOrderResponse>("/payments/extend", {
    ...data,
    type: "EXTENSION",
  }, {
    schema: CreateOrderResponseSchema,
    headers: { "X-Idempotency-Key": idempotencyKey },
  })
}

/**
 * Verify an extension payment.
 */
export async function verifyExtension(
  data: PaymentVerifyRequest,
): Promise<SessionStateResponse> {
  return api.post<SessionStateResponse>("/payments/extend-verify", data, {
    schema: SessionStateResponseSchema,
  })
}

/**
 * Get interaction ID from a call request ID.
 */
export async function getSessionByCallRequest(
  callRequestId: string,
): Promise<{ success: boolean; interactionId: string; callRequestId: string; status: string }> {
  return api.get(`/video-call/session/${callRequestId}`)
}

/**
 * Fetch paginated payment history for the authenticated client.
 */
export async function fetchPaymentHistory(
  page = 0,
  size = 10,
): Promise<PaymentHistoryPage> {
  return api.get<PaymentHistoryPage>(
    `/payments/history?page=${page}&size=${size}`,
  )
}
