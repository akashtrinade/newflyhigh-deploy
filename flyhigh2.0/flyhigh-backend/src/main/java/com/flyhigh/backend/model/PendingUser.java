package com.flyhigh.backend.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * PendingUser — stores unverified signup data BEFORE email OTP verification.
 * Only after OTP verification is a User created in the "users" collection.
 * If OTP expires, no account is ever created (automatic cleanup via TTL).
 */
@Document(collection = "pending_users")
public class PendingUser {

    @Id
    private String id;

    @Indexed(unique = true)
    private String email;

    private String password; // BCrypt hashed

    private String firstName;
    private String lastName;

    private String role; // CLIENT or EXPERT

    private String googleId; // For Google Sign-In users

    private String otpHash; // BCrypt hashed
    private Instant otpExpiresAt;

    private int otpRequestCount;
    private Instant rateLimitWindowStart;

    @Indexed(expireAfterSeconds = 0)
    private Instant createdAt;

    private Instant updatedAt;

    public PendingUser() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }

    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getGoogleId() { return googleId; }
    public void setGoogleId(String googleId) { this.googleId = googleId; }

    public String getOtpHash() { return otpHash; }
    public void setOtpHash(String otpHash) { this.otpHash = otpHash; }

    public Instant getOtpExpiresAt() { return otpExpiresAt; }
    public void setOtpExpiresAt(Instant otpExpiresAt) { this.otpExpiresAt = otpExpiresAt; }

    public int getOtpRequestCount() { return otpRequestCount; }
    public void setOtpRequestCount(int otpRequestCount) { this.otpRequestCount = otpRequestCount; }

    public Instant getRateLimitWindowStart() { return rateLimitWindowStart; }
    public void setRateLimitWindowStart(Instant rateLimitWindowStart) { this.rateLimitWindowStart = rateLimitWindowStart; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
