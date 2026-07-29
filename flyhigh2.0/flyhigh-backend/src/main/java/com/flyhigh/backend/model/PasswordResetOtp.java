package com.flyhigh.backend.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * PasswordResetOtp — stores OTP for password reset flow (no email links).
 *
 * FLOW:
 * 1. User enters email on "Forgot Password" page
 * 2. 6-digit OTP is sent to email
 * 3. User enters OTP → verified → allowed to set new password
 * 4. Record deleted after successful reset (single-use)
 *
 * SECURITY:
 * - OTP is BCrypt-hashed, never stored in plaintext
 * - TTL index auto-deletes expired OTPs after 10 minutes
 * - Rate limited to 3 requests per email per hour
 */
@Document(collection = "password_reset_otps")
public class PasswordResetOtp {

    @Id
    private String id;

    @Indexed(unique = true)
    private String email;

    private String otpHash; // BCrypt hashed

    @Indexed(expireAfterSeconds = 0)
    private Instant expiresAt;

    private int requestCount;
    private Instant rateLimitWindowStart;

    public PasswordResetOtp() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getOtpHash() { return otpHash; }
    public void setOtpHash(String otpHash) { this.otpHash = otpHash; }

    public Instant getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }

    public int getRequestCount() { return requestCount; }
    public void setRequestCount(int requestCount) { this.requestCount = requestCount; }

    public Instant getRateLimitWindowStart() { return rateLimitWindowStart; }
    public void setRateLimitWindowStart(Instant rateLimitWindowStart) { this.rateLimitWindowStart = rateLimitWindowStart; }
}
