package com.flyhigh.backend.model;

/**
 * Lifecycle of an expert earning:
 * PENDING                → Earning created after session completes; settlement period begins.
 * SETTLEMENT_PROCESSING  → Settlement worker is actively verifying this earning.
 * AVAILABLE              → Settlement passed; earning is ready for payout.
 * DISPUTED               → Client raised a dispute; earning blocked from settlement/payout.
 * PAID                   → Payout completed successfully; funds sent to expert.
 * REFUND_ADJUSTED        → Earning reduced or zeroed due to refund.
 * WITHDRAWN              → Expert has withdrawn the earning. (manual mode)
 */
public enum EarningStatus {
    PENDING,
    SETTLEMENT_PROCESSING,
    AVAILABLE,
    DISPUTED,
    PAID,
    REFUND_ADJUSTED,
    WITHDRAWN
}
