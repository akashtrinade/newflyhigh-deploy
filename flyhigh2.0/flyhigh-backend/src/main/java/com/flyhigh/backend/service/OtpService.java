package com.flyhigh.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;

/**
 * OTP generation & verification utility.
 * Actual storage is managed by the caller (PendingUser or PasswordResetOtp).
 */
@Service
public class OtpService {

    private final BCryptPasswordEncoder passwordEncoder;

    @Value("${otp.length:6}")
    private int otpLength;

    public OtpService(BCryptPasswordEncoder passwordEncoder) {
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * Generates a cryptographically secure 6-digit OTP.
     */
    public String generateOtp() {
        SecureRandom random = new SecureRandom();
        StringBuilder sb = new StringBuilder(otpLength);
        for (int i = 0; i < otpLength; i++) {
            sb.append(random.nextInt(10));
        }
        return sb.toString();
    }

    /**
     * Hashes the OTP using BCrypt for secure storage.
     */
    public String hashOtp(String otp) {
        return passwordEncoder.encode(otp);
    }

    /**
     * Verifies a plaintext OTP against a BCrypt hash.
     */
    public boolean verifyOtp(String otp, String otpHash) {
        return passwordEncoder.matches(otp, otpHash);
    }
}
