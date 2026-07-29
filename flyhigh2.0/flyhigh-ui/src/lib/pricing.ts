/**
 * Centralised frontend pricing utility.
 *
 * Mirrors the backend PricingService formula:
 *   clientPrice = expertRate × (1 + commissionPercent / 100)
 *
 * This is the SINGLE source of truth for all client-facing price displays.
 * Every component that shows a price to the client must use getClientPrice()
 * or getClientHourlyRate() from this module.
 *
 * Commission percent is fetched dynamically from the backend and cached.
 * Falls back to 20% if not yet fetched.
 */

let commissionPercent = 20

/**
 * Set the commission percent from backend config.
 * Call this once on app startup after fetching from API.
 */
export function setCommissionPercent(percent: number): void {
  if (percent > 0 && percent <= 100) {
    commissionPercent = percent
  }
}

/**
 * Returns the current commission percent (for display/debug).
 */
export function getCommissionPercent(): number {
  return commissionPercent
}

/**
 * Returns the client-facing hourly rate (expert's base rate + platform commission).
 * Use this everywhere the client sees an hourly rate.
 *
 * @example getClientHourlyRate(1000) → 1200
 */
export function getClientHourlyRate(expertHourlyRate: number): number {
  if (expertHourlyRate <= 0) return 0
  return expertHourlyRate * (1 + commissionPercent / 100)
}

/**
 * Returns the full client price for a session of the given duration.
 *
 * @example getClientPrice(1000, 30) → { expertAmount: 500, commission: 100, clientTotal: 600 }
 */
export function getClientPrice(
  expertHourlyRate: number,
  durationMinutes: number,
): PriceBreakdown {
  const expertAmount = expertHourlyRate * (durationMinutes / 60)
  const commissionAmount = expertAmount * (commissionPercent / 100)
  const clientTotal = expertAmount + commissionAmount
  return { expertAmount, commissionAmount, clientTotal, commissionPercent }
}

export interface PriceBreakdown {
  expertAmount: number
  commissionAmount: number
  clientTotal: number
  commissionPercent: number
}

/**
 * Format a number as INR currency (₹ symbol, no decimals by default).
 */
export function formatINR(amount: number, decimals = 0): string {
  return `₹${amount.toFixed(decimals)}`
}
