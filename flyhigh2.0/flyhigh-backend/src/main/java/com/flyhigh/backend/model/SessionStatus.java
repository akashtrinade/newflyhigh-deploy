package com.flyhigh.backend.model;

public enum SessionStatus {
    CREATED,              // Booked & paid, waiting to start
    ACTIVE,               // Call is currently ongoing (legacy)
    FREE_SESSION,         // 5-minute free consultation in progress
    PAYMENT_PENDING,      // Expert recommended duration, awaiting payment
    PAYMENT_VERIFIED,     // Payment verified, transitioning to paid session
    PAID_SESSION,         // Paid consultation in progress
    COMPLETED,            // Call finished successfully
    CANCELLED,            // Expert did not join/User cancelled before start
    FREE_SESSION_EXPIRED, // Free trial ended without payment
    REFUNDED              // Payment refunded
}
