package com.flyhigh.backend.model;

/**
 * Lifecycle of a client dispute:
 * OPEN           → Client submitted dispute; earning blocked; awaiting admin review.
 * UNDER_REVIEW   → Admin is actively reviewing evidence.
 * ACCEPTED       → Admin accepts client's claim; triggers refund flow.
 * REJECTED       → Admin rejects dispute; earning can proceed to settlement/payout.
 * INFO_REQUESTED → Admin needs more evidence from client or expert.
 * ESCALATED      → Requires higher-level review.
 * RESOLVED       → Final state; dispute closed.
 */
public enum DisputeStatus {
    OPEN,
    UNDER_REVIEW,
    ACCEPTED,
    REJECTED,
    INFO_REQUESTED,
    ESCALATED,
    RESOLVED
}
