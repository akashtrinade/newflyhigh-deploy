/**
 * Runtime validation schemas for API responses.
 *
 * Uses Zod to validate API response shapes at runtime. This catches:
 * - Backend schema changes that break the frontend
 * - Malformed responses from intermediaries/proxies
 * - Data corruption in transit
 *
 * All payment/financial payloads are validated to ensure amounts,
 * currencies, and IDs match expected types before rendering in the UI.
 */
import { z } from 'zod';

// ── Primitive validators ──────────────────────────────────────

/** INR amount: non-negative number with up to 2 decimal places */
const inrAmount = z.number().nonnegative().finite();

/** Razorpay order/payment ID format */
const razorpayId = z.string().min(1).max(50);

/** ISO currency code */
const currencyCode = z.string().length(3).regex(/^[A-Z]{3}$/);

/** MongoDB ObjectID-like string */
const objectId = z.string().min(24).max(24).regex(/^[a-f0-9]{24}$/i);

/** Session status enum */
const sessionPhase = z.enum([
  'FREE_SESSION', 'PAYMENT_PENDING', 'PAYMENT_VERIFIED',
  'PAID_SESSION', 'COMPLETED', 'FREE_SESSION_EXPIRED', 'CANCELLED',
]);

// ── API response schemas ──────────────────────────────────────

/** POST /api/payments/create-order response */
export const CreateOrderResponseSchema = z.object({
  orderId: razorpayId,
  amount: z.string().regex(/^\d+$/), // paise as string from backend
  currency: currencyCode,
  keyId: z.string().min(1),
});

/** POST /api/payments/verify response */
export const SessionStateResponseSchema = z.object({
  interactionId: z.string().min(1),
  phase: sessionPhase,
  freeTrialRemainingSec: z.number().int().nonnegative(),
  paidSessionRemainingSec: z.number().int().nonnegative(),
  totalPaidDurationMin: z.number().int().nonnegative().nullable(),
  elapsedPaidSeconds: z.number().int().nonnegative(),
  recommendedDurationMin: z.number().int().nonnegative().nullable(),
  paymentStatus: z.string(),
  totalPaidAmount: z.number().nonnegative().nullable(),
  expertAmount: z.number().nonnegative().nullable(),
  commissionAmount: z.number().nonnegative().nullable(),
  commissionPercent: z.number().nonnegative(),
  showExtendPrompt: z.boolean(),
  expertHourlyRate: z.number().nonnegative(),
  clientHourlyRate: z.number().nonnegative(),
});

/** Generic API message response */
export const MessageResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

/** Auth response */
export const AuthResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  id: z.string().optional(),
  email: z.string().email().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  fullName: z.string().optional(),
  role: z.string().optional(),
  profileCompleted: z.boolean().optional(),
  country: z.string().optional(),
  redirectUrl: z.string().optional(),
  status: z.string().optional(),
  isOnline: z.boolean().optional(),
});

/** Expert search page response */
export const ExpertSearchPageSchema = z.object({
  experts: z.array(z.object({
    id: z.string(),
    userId: z.string(),
    name: z.string(),
    professionalTitle: z.string().optional(),
    category: z.string().optional(),
    subCategory: z.string().optional(),
    experience: z.number().int().optional(),
    languages: z.string().optional(),
    country: z.string().optional(),
    rating: z.number().optional(),
    reviewCount: z.number().int().optional(),
    sessionPrice: z.number().optional(),
    expertHourlyRate: z.number().optional(),
    availability: z.string().optional(),
    isOnline: z.boolean().optional(),
    status: z.string().optional(),
  })),
  totalElements: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  currentPage: z.number().int().nonnegative(),
  pageSize: z.number().int().positive(),
});

// ── Validation helpers ────────────────────────────────────────

/**
 * Validates and parses an API response against a Zod schema.
 * Returns the parsed data on success, or logs an error and returns null on failure.
 *
 * In production, silently returns null rather than crashing the app.
 * In development, logs a detailed error to the console.
 */
export function validateResponse<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  endpoint: string,
): T | null {
  const result = schema.safeParse(data);

  if (!result.success) {
    if (import.meta.env.DEV) {
      console.error(
        `[Validation] Schema mismatch for ${endpoint}:`,
        result.error.flatten(),
        '\nReceived:', data,
      );
    } else {
      console.warn(`[Validation] Schema mismatch for ${endpoint}`);
    }
    return null;
  }

  return result.data;
}

/**
 * Wraps an API call with response validation.
 * Automatically validates the response against the given schema.
 */
export async function fetchWithValidation<T>(
  schema: z.ZodSchema<T>,
  endpoint: string,
  fetcher: () => Promise<Response>,
): Promise<T> {
  const response = await fetcher();

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new ApiValidationError(
      response.status,
      errorBody.message || `Request failed with status ${response.status}`,
    );
  }

  const json = await response.json();
  const validated = validateResponse(schema, json, endpoint);

  if (validated === null) {
    throw new ApiValidationError(
      0,
      `Response validation failed for ${endpoint}`,
    );
  }

  return validated;
}

export class ApiValidationError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiValidationError';
  }
}
