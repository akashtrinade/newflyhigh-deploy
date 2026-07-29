package com.flyhigh.backend.model;

/**
 * Lifecycle of an expert earning:
 * PENDING   → Earning created after session completes; not yet available for withdrawal.
 * AVAILABLE → Earning moved to expert's available wallet balance. (Phase 4)
 * WITHDRAWN → Expert has withdrawn the earning. (Phase 4)
 */
public enum EarningStatus {
    PENDING,
    AVAILABLE,
    WITHDRAWN
}
