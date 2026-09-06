package com.flyhigh.backend.model;

/**
 * Lifecycle of a refund:
 * PENDING_APPROVAL  → Refund requested; awaiting admin approval.
 * APPROVED           → Admin approved; ready to process with provider.
 * PROCESSING         → Refund instruction sent to payment provider.
 * COMPLETED          → Provider confirmed; funds returned to client.
 * FAILED             → Provider rejected; requires manual intervention.
 */
public enum RefundStatus {
    PENDING_APPROVAL,
    APPROVED,
    PROCESSING,
    COMPLETED,
    FAILED
}
