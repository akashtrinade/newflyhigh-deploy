package com.flyhigh.backend.service;

import com.flyhigh.backend.dto.*;
import com.flyhigh.backend.model.ExpertProfile;
import com.flyhigh.backend.model.Interaction;
import com.flyhigh.backend.model.PasswordResetOtp;
import com.flyhigh.backend.model.PendingUser;
import com.flyhigh.backend.model.SessionStatus;
import com.flyhigh.backend.model.User;
import com.flyhigh.backend.repository.ExpertProfileRepository;
import com.flyhigh.backend.repository.InteractionRepository;
import com.flyhigh.backend.repository.PasswordResetOtpRepository;
import com.flyhigh.backend.repository.PendingUserRepository;
import com.flyhigh.backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

/**
 * Authentication Service.
 *
 * FEATURES:
 * 1. Signup → PendingUser (unverified) → OTP → Verify → User (verified)
 * 2. Login → Check verified → JWT tokens
 * 3. Forgot Password → OTP-based (no email links) → Reset password
 * 4. Profile check for experts
 */
@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final PendingUserRepository pendingUserRepository;
    private final UserRepository userRepository;
    private final PasswordResetOtpRepository passwordResetOtpRepository;
    private final ExpertProfileRepository expertProfileRepository;
    private final InteractionRepository interactionRepository;
    private final BCryptPasswordEncoder passwordEncoder;
    private final OtpService otpService;
    private final JwtService jwtService;
    private final EmailService emailService;

    @Value("${otp.expiry-minutes:10}")
    private int otpExpiryMinutes;

    @Value("${otp.max-requests-per-hour:3}")
    private int maxRequestsPerHour;

    /** Window (seconds) after the last heartbeat before an expert reads as offline. */
    @Value("${app.presence.online-window-seconds:120}")
    private long presenceOnlineWindowSeconds;

    public AuthService(PendingUserRepository pendingUserRepository,
            UserRepository userRepository,
            PasswordResetOtpRepository passwordResetOtpRepository,
            ExpertProfileRepository expertProfileRepository,
            InteractionRepository interactionRepository,
            BCryptPasswordEncoder passwordEncoder,
            OtpService otpService,
            JwtService jwtService,
            EmailService emailService) {
        this.pendingUserRepository = pendingUserRepository;
        this.userRepository = userRepository;
        this.passwordResetOtpRepository = passwordResetOtpRepository;
        this.expertProfileRepository = expertProfileRepository;
        this.interactionRepository = interactionRepository;
        this.passwordEncoder = passwordEncoder;
        this.otpService = otpService;
        this.jwtService = jwtService;
        this.emailService = emailService;
    }

    // ═══════════════════════════════════════════
    // SIGNUP — Step 1: Create PendingUser
    // ═══════════════════════════════════════════

    /**
     * Creates a PendingUser (unverified). Sends OTP to email.
     * User does NOT exist in "users" collection until OTP is verified.
     */
    public AuthResponse signup(SignupRequest request) {
        String email = request.getEmail().toLowerCase().trim();

        // Check if email already exists in users (already verified)
        if (userRepository.existsByEmail(email)) {
            return new AuthResponse(false, "Email already registered. Please log in.");
        }

        // Check if there's already a pending user
        Optional<PendingUser> existingPending = pendingUserRepository.findByEmail(email);
        if (existingPending.isPresent()) {
            PendingUser pending = existingPending.get();

            // Rate limit check
            if (isRateLimited(pending.getRateLimitWindowStart(), pending.getOtpRequestCount())) {
                return new AuthResponse(false, "Too many OTP requests. Please try again later.");
            }

            // Update existing pending user's data
            pending.setFirstName(request.getFirstName().trim());
            pending.setLastName(request.getLastName().trim());
            
            // For Google users, don't update password (they don't have one)
            if (!Boolean.TRUE.equals(request.getIsGoogleUser())) {
                pending.setPassword(passwordEncoder.encode(request.getPassword()));
            }
            pending.setRole(request.getRole().toUpperCase());
            pending.setGoogleId(request.getGoogleId());
            pending.setUpdatedAt(Instant.now());

            // Generate and store new OTP
            String otp = otpService.generateOtp();
            pending.setOtpHash(otpService.hashOtp(otp));
            pending.setOtpExpiresAt(Instant.now().plusSeconds(otpExpiryMinutes * 60));
            pending.setOtpRequestCount(pending.getOtpRequestCount() + 1);

            pendingUserRepository.save(pending);
            emailService.sendOtpEmail(email, otp);

            log.info("OTP resent to pending user: {}", email);
            return new AuthResponse(true, "OTP sent to your email. Please verify to complete registration.");
        }

        // Create new pending user
        PendingUser pending = new PendingUser();
        pending.setEmail(email);
        
        // For Google users, store empty password (they authenticate via Google)
        if (Boolean.TRUE.equals(request.getIsGoogleUser())) {
            pending.setPassword("");
        } else {
            pending.setPassword(passwordEncoder.encode(request.getPassword()));
        }
        
        pending.setFirstName(request.getFirstName().trim());
        pending.setLastName(request.getLastName().trim());
        pending.setRole(request.getRole().toUpperCase());
        pending.setGoogleId(request.getGoogleId());

        // Generate OTP
        String otp = otpService.generateOtp();
        pending.setOtpHash(otpService.hashOtp(otp));
        pending.setOtpExpiresAt(Instant.now().plusSeconds(otpExpiryMinutes * 60));
        pending.setOtpRequestCount(1);
        pending.setRateLimitWindowStart(Instant.now());
        pending.setCreatedAt(Instant.now());
        pending.setUpdatedAt(Instant.now());

        pendingUserRepository.save(pending);
        emailService.sendOtpEmail(email, otp);

        log.info("Pending user created: {} (role: {}, google: {})", email, request.getRole(), request.getIsGoogleUser());
        return new AuthResponse(true, "OTP sent to your email. Please verify to complete registration.");
    }

    // ═══════════════════════════════════════════
    // SIGNUP — Step 2: Verify OTP → Create User
    // ═══════════════════════════════════════════

    /**
     * Verifies OTP for a pending user.
     * On success: PendingUser is MOVED to User collection (account created).
     * On failure: PendingUser remains (can retry).
     */
    public AuthResponse verifySignupOtp(OtpRequest request) {
        String email = request.getEmail().toLowerCase().trim();

        Optional<PendingUser> pendingOpt = pendingUserRepository.findByEmail(email);
        if (pendingOpt.isEmpty()) {
            return new AuthResponse(false, "No pending registration found for this email. Please sign up first.");
        }

        PendingUser pending = pendingOpt.get();

        // Check OTP expiry
        if (pending.getOtpExpiresAt().isBefore(Instant.now())) {
            pendingUserRepository.delete(pending);
            log.warn("OTP expired for pending user: {}", email);
            return new AuthResponse(false, "OTP has expired. Please sign up again.");
        }

        // Verify OTP
        if (!otpService.verifyOtp(request.getOtp(), pending.getOtpHash())) {
            log.warn("Invalid OTP attempt for: {}", email);
            return new AuthResponse(false, "Invalid OTP. Please try again.");
        }

        // OTP verified — create actual User
        User user = new User();
        user.setEmail(email);
        user.setPassword(pending.getPassword()); // Already BCrypt hashed (or empty for Google users)
        user.setFirstName(pending.getFirstName());
        user.setLastName(pending.getLastName());
        user.setRole(pending.getRole());
        user.setProfileCompleted(false);
        user.setIsActive(true);
        user.setCreatedAt(Instant.now());
        user.setUpdatedAt(Instant.now());
        
        // If this was a Google user, set Google-specific fields
        if (pending.getGoogleId() != null && !pending.getGoogleId().isEmpty()) {
            user.setGoogleId(pending.getGoogleId());
            user.setAuthProvider("google");
            user.setEmailVerified(true);
        }

        userRepository.save(user);

        // Delete pending user (single-use)
        pendingUserRepository.delete(pending);

        log.info("User created after OTP verification: {} (role: {})", email, user.getRole());

        return new AuthResponse(true, "Email verified! Account created successfully. You can now log in.");
    }

    // ═══════════════════════════════════════════
    // SIGNUP — Resend OTP
    // ═══════════════════════════════════════════

    /**
     * Resends OTP to pending user. Rate limited to 3/hour.
     */
    public MessageResponse resendSignupOtp(String email) {
        email = email.toLowerCase().trim();

        Optional<PendingUser> pendingOpt = pendingUserRepository.findByEmail(email);
        if (pendingOpt.isEmpty()) {
            return new MessageResponse(false, "No pending registration found for this email.");
        }

        PendingUser pending = pendingOpt.get();

        // Rate limit check
        if (isRateLimited(pending.getRateLimitWindowStart(), pending.getOtpRequestCount())) {
            return new MessageResponse(false, "Too many OTP requests. Please try again later.");
        }

        // Generate new OTP
        String otp = otpService.generateOtp();
        pending.setOtpHash(otpService.hashOtp(otp));
        pending.setOtpExpiresAt(Instant.now().plusSeconds(otpExpiryMinutes * 60));
        pending.setOtpRequestCount(pending.getOtpRequestCount() + 1);
        pending.setUpdatedAt(Instant.now());

        pendingUserRepository.save(pending);
        emailService.sendOtpEmail(email, otp);

        log.info("OTP resent to pending user: {}", email);
        return new MessageResponse(true, "OTP resent successfully.");
    }

    // ═══════════════════════════════════════════
    // LOGIN
    // ═══════════════════════════════════════════

    /**
     * Authenticates user. Returns role-specific redirect URL.
     * For experts: sets isOnline=true on login and computes presence status.
     * Also determines if expert is BUSY (has active session) or ONLINE.
     */
    public AuthResponse login(LoginRequest request) {
        String email = request.getEmail().toLowerCase().trim();

        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            return new AuthResponse(false, "Invalid email or password");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            return new AuthResponse(false, "Invalid email or password");
        }

        if (!user.getIsActive()) {
            return new AuthResponse(false, "Account is deactivated. Please contact support.");
        }

        // ── Expert online presence: Set isOnline=true on login ──
        if ("EXPERT".equalsIgnoreCase(user.getRole())) {
            ExpertProfile profile = expertProfileRepository.findByUserId(user.getId()).orElse(null);
            if (profile != null) {
                profile.setIsOnline(true);
                profile.setUpdatedAt(Instant.now());
                profile.setLastActivityAt(Instant.now());
                expertProfileRepository.save(profile);
                log.info("Expert presence set to ONLINE on login: {}", email);
            }
        }

        String redirectUrl = getDashboardUrl(user.getRole(), user.getProfileCompleted());

        log.info("User logged in: {} (role: {})", email, user.getRole());

        AuthResponse response = new AuthResponse(true, "Login successful", redirectUrl,
                user.getEmail(), user.getFirstName(), user.getLastName(),
                user.getFullName(), user.getRole(), user.getProfileCompleted(),
                user.getCountry());

        response.setId(user.getId());

        // Set expert presence status in response
        if ("EXPERT".equalsIgnoreCase(user.getRole())) {
            String status = computeExpertStatus(user.getId());
            response.setStatus(status);
            response.setIsOnline(!"OFFLINE".equals(status));
        }

        // Generate JWT tokens in the controller layer
        return response;
    }

    // ═══════════════════════════════════════════
    // LOGOUT — Set expert OFFLINE
    // ═══════════════════════════════════════════

    /**
     * Sets expert isOnline=false on logout.
     * Also increments tokenVersion to invalidate all existing JWTs (forces re-login).
     */
    public void setExpertOffline(String email) {
        User user = userRepository.findByEmail(email.toLowerCase().trim()).orElse(null);
        if (user != null) {
            // Invalidate all existing tokens by incrementing version
            user.setTokenVersion((user.getTokenVersion() != null ? user.getTokenVersion() : 1L) + 1);
            user.setUpdatedAt(Instant.now());
            userRepository.save(user);

            if ("EXPERT".equalsIgnoreCase(user.getRole())) {
                ExpertProfile profile = expertProfileRepository.findByUserId(user.getId()).orElse(null);
                if (profile != null) {
                    profile.setIsOnline(false);
                    profile.setLastActivityAt(null);
                    profile.setUpdatedAt(Instant.now());
                    expertProfileRepository.save(profile);
                    log.info("Expert presence set to OFFLINE on logout: {}", email);
                }
            }
            log.info("Token version incremented on logout for: {}", email);
        }
    }

        /**
     * Updates the expert's lastActivityAt timestamp (heartbeat).
     * Only updates if the expert is currently marked as online.
     */
    public void updateExpertActivity(String userId) {
        expertProfileRepository.findByUserId(userId).ifPresent(profile -> {
            profile.setIsOnline(true);
            profile.setLastActivityAt(Instant.now());
            expertProfileRepository.save(profile);
            log.debug("Expert heartbeat updated: userId={}", userId);
        });
    }

    // ═══════════════════════════════════════════
    // EXPERT PRESENCE STATUS
    // ═══════════════════════════════════════════

    /**
     * Computes the expert's presence status using heartbeat-based logic:
     * - BUSY if expert has an active session (ACTIVE or CREATED)
     * - ONLINE if expert's isOnline=true AND lastActivityAt is within the configured window
     * - OFFLINE otherwise (either isOnline=false or heartbeat expired)
     * 
     * @return "ONLINE", "BUSY", or "OFFLINE"
     */
    public String computeExpertStatus(String userId) {
        ExpertProfile profile = expertProfileRepository.findByUserId(userId).orElse(null);
        if (profile == null || !Boolean.TRUE.equals(profile.getIsOnline())) {
            return "OFFLINE";
        }

        // Check for active sessions (ACTIVE or CREATED) — BUSY takes priority
        List<Interaction> expertInteractions = interactionRepository.findByExpertId(userId);
        boolean hasActiveSession = expertInteractions.stream()
                .anyMatch(s -> s.getStatus() == SessionStatus.ACTIVE || s.getStatus() == SessionStatus.CREATED);
        if (hasActiveSession) {
            return "BUSY";
        }

        // Heartbeat check: if lastActivityAt is within the last 2 minutes → ONLINE
        // Otherwise → OFFLINE (heartbeat expired, likely closed the browser)
        Instant lastActivity = profile.getLastActivityAt();
        if (lastActivity != null && lastActivity.isAfter(Instant.now().minusSeconds(presenceOnlineWindowSeconds))) {
            return "ONLINE";
        }

        // Heartbeat expired — auto-mark as OFFLINE
        profile.setIsOnline(false);
        expertProfileRepository.save(profile);
        log.info("Expert auto-offlined due to heartbeat expiry: userId={}", userId);
        return "OFFLINE";
    }

    // ═══════════════════════════════════════════
    // FORGOT PASSWORD — Step 1: Send OTP
    // ═══════════════════════════════════════════

    /**
     * Sends a password reset OTP to the user's email.
     * Rate limited to 3 requests per hour per email.
     */
    public MessageResponse sendPasswordResetOtp(String email) {
        email = email.toLowerCase().trim();

        // Check user exists
        if (!userRepository.existsByEmail(email)) {
            return new MessageResponse(true, "If an account exists with this email, an OTP has been sent.");
        }

        // Generate OTP
        String otp = otpService.generateOtp();
        Instant now = Instant.now();

        // Check rate limit and get or create record
        Optional<PasswordResetOtp> existing = passwordResetOtpRepository.findByEmail(email);
        PasswordResetOtp resetOtp;

        if (existing.isPresent()) {
            resetOtp = existing.get();
            if (isRateLimited(resetOtp.getRateLimitWindowStart(), resetOtp.getRequestCount())) {
                return new MessageResponse(false, "Too many OTP requests. Please try again later.");
            }
        } else {
            resetOtp = new PasswordResetOtp();
            resetOtp.setEmail(email);
            resetOtp.setRequestCount(0);
            resetOtp.setRateLimitWindowStart(now);
        }

        resetOtp.setOtpHash(otpService.hashOtp(otp));
        resetOtp.setExpiresAt(now.plusSeconds(otpExpiryMinutes * 60));
        resetOtp.setRequestCount(resetOtp.getRequestCount() + 1);

        passwordResetOtpRepository.save(resetOtp);
        emailService.sendOtpEmail(email, otp);

        log.info("Password reset OTP sent to: {}", email);
        return new MessageResponse(true, "If an account exists with this email, an OTP has been sent.");
    }

    // ═══════════════════════════════════════════
    // FORGOT PASSWORD — Step 2: Verify OTP
    // ═══════════════════════════════════════════

    /**
     * Verifies password reset OTP. Returns success if valid.
     */
    public MessageResponse verifyPasswordResetOtp(OtpRequest request) {
        String email = request.getEmail().toLowerCase().trim();

        Optional<PasswordResetOtp> recordOpt = passwordResetOtpRepository.findByEmail(email);
        if (recordOpt.isEmpty()) {
            return new MessageResponse(false, "No OTP request found. Please request a password reset.");
        }

        PasswordResetOtp record = recordOpt.get();

        if (record.getExpiresAt().isBefore(Instant.now())) {
            passwordResetOtpRepository.delete(record);
            return new MessageResponse(false, "OTP has expired. Please request a new one.");
        }

        if (!otpService.verifyOtp(request.getOtp(), record.getOtpHash())) {
            return new MessageResponse(false, "Invalid OTP. Please try again.");
        }

        return new MessageResponse(true, "OTP verified. You can now reset your password.");
    }

    // ═══════════════════════════════════════════
    // FORGOT PASSWORD — Step 3: Reset Password
    // ═══════════════════════════════════════════

    /**
     * Resets the user's password after OTP verification.
     * Deletes the OTP record (single-use).
     */
    public MessageResponse resetPassword(ResetPasswordRequest request) {
        String email = request.getEmail().toLowerCase().trim();

        // Verify OTP one more time
        Optional<PasswordResetOtp> recordOpt = passwordResetOtpRepository.findByEmail(email);
        if (recordOpt.isEmpty()) {
            return new MessageResponse(false, "No OTP request found. Please start the password reset process again.");
        }

        PasswordResetOtp record = recordOpt.get();

        if (record.getExpiresAt().isBefore(Instant.now())) {
            passwordResetOtpRepository.delete(record);
            return new MessageResponse(false, "OTP has expired. Please request a new one.");
        }

        if (!otpService.verifyOtp(request.getOtp(), record.getOtpHash())) {
            return new MessageResponse(false, "Invalid OTP. Please try again.");
        }

        // Update password
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            passwordResetOtpRepository.delete(record);
            return new MessageResponse(false, "User not found. Please sign up.");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        // Invalidate all existing JWT tokens (forces re-login on all devices)
        user.setTokenVersion((user.getTokenVersion() != null ? user.getTokenVersion() : 1L) + 1);
        user.setUpdatedAt(Instant.now());
        userRepository.save(user);

        // Delete OTP record (single-use)
        passwordResetOtpRepository.delete(record);

        log.info("Password reset successful for: {} (tokens invalidated)", email);
        return new MessageResponse(true, "Password reset successfully. All devices have been logged out. You can now log in with your new password.");
    }

    // ═══════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════

    private boolean isRateLimited(Instant windowStart, int requestCount) {
        if (windowStart == null)
            return false;
        Instant oneHourAgo = Instant.now().minusSeconds(3600);
        if (windowStart.isBefore(oneHourAgo))
            return false; // Window expired, reset
        return requestCount >= maxRequestsPerHour;
    }

    /**
     * Finds a user by email.
     */
    public User getUserByEmail(String email) {
        return userRepository.findByEmail(email.toLowerCase().trim()).orElse(null);
    }

    /**
     * Finds a user by their MongoDB ID.
     */
    public User getUserById(String id) {
        return userRepository.findById(id).orElse(null);
    }

    private String getDashboardUrl(String role, Boolean profileCompleted) {
        String upperRole = role != null ? role.toUpperCase() : "";
        if ("CLIENT".equals(upperRole))
            return "/client-dashboard";
        if ("EXPERT".equals(upperRole)) {
            if (Boolean.TRUE.equals(profileCompleted))
                return "/expert-dashboard";
            return "/expert-profile-completion";
        }
        if ("ADMIN".equals(upperRole))
            return "/admin/dashboard";
        return "/";
    }
}
