package com.flyhigh.backend.model;

/**
 * Payout lifecycle:
 * NOT_ELIGIBLE  → Expert hasn't met payout requirements (KYC, threshold, etc.).
 * ELIGIBLE      → Earning is AVAILABLE and all checks pass; ready to pay.
 * PROCESSING    → Payout instruction sent to provider; awaiting confirmation.
 * SUCCESS       → Provider confirmed; funds transferred to expert.
 * FAILED        → Provider rejected; expert must fix details or system retries.
 * RETRYING      → System is retrying a previously failed payout.
 */
public enum PayoutStatus {
    NOT_ELIGIBLE,
    ELIGIBLE,
    PROCESSING,
    SUCCESS,        // was PROCESSED
    FAILED,
    RETRYING
}
