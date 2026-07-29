package com.flyhigh.backend.model;

public enum PaymentStatus {
    UNPAID, // No payment made yet
    HELD,   // Payment received by platform, held pending session completion
    PAID    // Processed and transferred to the expert by the payout cron job
}
