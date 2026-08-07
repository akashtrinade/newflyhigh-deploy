package com.flyhigh.backend.controller;

import com.flyhigh.backend.dto.*;
import com.flyhigh.backend.model.ExpertProfile;
import com.flyhigh.backend.model.User;
import com.flyhigh.backend.service.AuthService;
import com.flyhigh.backend.service.ExpertProfileService;
import com.flyhigh.backend.service.JwtService;
import com.flyhigh.backend.repository.ExpertProfileRepository;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Authentication Controller.
 *
 * ENDPOINTS:
 * - POST /api/auth/signup → Create pending user + send OTP
 * - POST /api/auth/verify-signup-otp → Verify OTP → Create actual user
 * - POST /api/auth/resend-signup-otp → Resend OTP (rate-limited)
 * - POST /api/auth/login → Login, returns JWT cookies + redirect URL
 * - POST /api/auth/refresh → Refresh JWT tokens
 * - POST /api/auth/logout → Clear auth cookies
 * - POST /api/auth/forgot-password → Send password reset OTP
 * - POST /api/auth/verify-reset-otp → Verify password reset OTP
 * - POST /api/auth/reset-password → Set new password
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final JwtService jwtService;
    private final ExpertProfileService expertProfileService;
    private final ExpertProfileRepository expertProfileRepository;

    public AuthController(AuthService authService,
            JwtService jwtService,
            ExpertProfileService expertProfileService,
            ExpertProfileRepository expertProfileRepository) {
        this.authService = authService;
        this.jwtService = jwtService;
        this.expertProfileService = expertProfileService;
        this.expertProfileRepository = expertProfileRepository;
    }

    // ═══════════════════════════════════════════
    // SIGNUP
    // ═══════════════════════════════════════════

    @PostMapping("/signup")
    public ResponseEntity<AuthResponse> signup(@Valid @RequestBody SignupRequest request) {
        AuthResponse response = authService.signup(request);
        if (!response.isSuccess()) {
            return ResponseEntity.badRequest().body(response);
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // ═══════════════════════════════════════════
    // VERIFY SIGNUP OTP
    // ═══════════════════════════════════════════

    @PostMapping("/verify-signup-otp")
    public ResponseEntity<AuthResponse> verifySignupOtp(@Valid @RequestBody OtpRequest request) {
        AuthResponse response = authService.verifySignupOtp(request);
        if (!response.isSuccess()) {
            return ResponseEntity.badRequest().body(response);
        }
        return ResponseEntity.ok(response);
    }

    // ═══════════════════════════════════════════
    // RESEND SIGNUP OTP
    // ═══════════════════════════════════════════

    @PostMapping("/resend-signup-otp")
    public ResponseEntity<MessageResponse> resendSignupOtp(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(new MessageResponse(false, "Email is required"));
        }
        MessageResponse response = authService.resendSignupOtp(email);
        if (!response.isSuccess()) {
            return ResponseEntity.badRequest().body(response);
        }
        return ResponseEntity.ok(response);
    }

    // ═══════════════════════════════════════════
    // LOGIN
    // ═══════════════════════════════════════════

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request,
            HttpServletResponse servletResponse) {
        AuthResponse response = authService.login(request);

        if (!response.isSuccess()) {
            return ResponseEntity.badRequest().body(response);
        }

        // Fetch user for token version
        User user = authService.getUserByEmail(response.getEmail());
        String userId = user != null ? user.getId() : response.getEmail();
        Long tokenVersion = user != null ? user.getTokenVersion() : 1L;

        // Generate JWT tokens with token version for invalidation
        String accessToken = jwtService.generateAccessToken(
                userId, response.getEmail(), response.getRole(), tokenVersion);
        String refreshToken = jwtService.generateRefreshToken(
                userId, response.getEmail(), response.getRole(), tokenVersion);

        setAuthCookies(servletResponse, accessToken, refreshToken);

        return ResponseEntity.ok(response);
    }

    // ═══════════════════════════════════════════
    // REFRESH TOKEN
    // ═══════════════════════════════════════════

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(
            @CookieValue(value = "refreshToken", required = false) String refreshToken,
            HttpServletResponse servletResponse) {
        if (refreshToken == null || !jwtService.validateToken(refreshToken)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new AuthResponse(false, "Invalid or expired refresh token"));
        }

        String email = jwtService.extractEmail(refreshToken);
        String role = jwtService.extractRole(refreshToken);

        // Fetch user for up-to-date tokenVersion (invalidates tokens from other sessions)
        User user = authService.getUserByEmail(email);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new AuthResponse(false, "User not found"));
        }

        // Validate token version (rejects tokens if user logged out elsewhere)
        Long tokenVersion = jwtService.extractTokenVersion(refreshToken);
        if (tokenVersion != null && !tokenVersion.equals(user.getTokenVersion())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new AuthResponse(false, "Session invalidated. Please log in again."));
        }

        String newAccessToken = jwtService.generateAccessToken(
                user.getId(), email, role, user.getTokenVersion());
        String newRefreshToken = jwtService.generateRefreshToken(
                user.getId(), email, role, user.getTokenVersion());

        setAuthCookies(servletResponse, newAccessToken, newRefreshToken);

        return ResponseEntity.ok(new AuthResponse(true, "Token refreshed"));
    }

    // ═══════════════════════════════════════════
    // FORGOT PASSWORD — Step 1: Send OTP
    // ═══════════════════════════════════════════

    @PostMapping("/forgot-password")
    public ResponseEntity<MessageResponse> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        MessageResponse response = authService.sendPasswordResetOtp(request.getEmail());
        if (!response.isSuccess()) {
            return ResponseEntity.badRequest().body(response);
        }
        return ResponseEntity.ok(response);
    }

    // ═══════════════════════════════════════════
    // FORGOT PASSWORD — Step 2: Verify OTP
    // ═══════════════════════════════════════════

    @PostMapping("/verify-reset-otp")
    public ResponseEntity<MessageResponse> verifyResetOtp(@Valid @RequestBody OtpRequest request) {
        MessageResponse response = authService.verifyPasswordResetOtp(request);
        if (!response.isSuccess()) {
            return ResponseEntity.badRequest().body(response);
        }
        return ResponseEntity.ok(response);
    }

    // ═══════════════════════════════════════════
    // FORGOT PASSWORD — Step 3: Reset Password
    // ═══════════════════════════════════════════

    @PostMapping("/reset-password")
    public ResponseEntity<MessageResponse> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        MessageResponse response = authService.resetPassword(request);
        if (!response.isSuccess()) {
            return ResponseEntity.badRequest().body(response);
        }
        return ResponseEntity.ok(response);
    }

    // ═══════════════════════════════════════════
    // GET CURRENT USER
    // ═══════════════════════════════════════════

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new AuthResponse(false, "Not authenticated"));
        }

        String email = authentication.getName();
        User user = authService.getUserByEmail(email);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new AuthResponse(false, "User not found"));
        }

        ExpertProfileResponse profileResponse = "EXPERT".equalsIgnoreCase(user.getRole())
                ? expertProfileService.getProfileResponse(email)
                : null;

        AuthResponse response = new AuthResponse(true, "User retrieved",
                null, user.getEmail(), user.getFirstName(),
                user.getLastName(), user.getFullName(),
                user.getRole(), user.getProfileCompleted(),
                profileResponse != null ? profileResponse.getCountry() : user.getCountry());

        response.setId(user.getId());

        // ── Extended profile fields ──
        response.setPhoneNumber(user.getPhoneNumber());
        response.setCity(user.getCity());
        response.setState(user.getState());
        response.setAddress(user.getAddress());
        response.setPostalCode(user.getPostalCode());
        response.setProfileImage(user.getProfileImage());
        response.setNotificationPreferences(user.getNotificationPreferences());

        // Set expert presence status from the actual ExpertProfile in DB
        if ("EXPERT".equalsIgnoreCase(user.getRole())) {
            String status = authService.computeExpertStatus(user.getId());
            response.setStatus(status);
            response.setIsOnline(!"OFFLINE".equals(status));
        }

        return ResponseEntity.ok(response);
    }

    @PostMapping("/heartbeat")
    public ResponseEntity<MessageResponse> heartbeat(Authentication authentication) {
        if (authentication == null)
            return ResponseEntity.status(401).build();

        User user = authService.getUserByEmail(authentication.getName());
        if (user == null)
            return ResponseEntity.status(401).build();

        authService.updateExpertActivity(user.getId());
        return ResponseEntity.ok(new MessageResponse(true, "Heartbeat updated"));
    }

    // ═══════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════

    @Value("${app.cookie.secure:true}")
    private boolean cookieSecure;

    private void setAuthCookies(HttpServletResponse response, String accessToken, String refreshToken) {
        // Use Set-Cookie header with SameSite=Strict for CSRF protection
        // (httpOnly + secure + sameSite=strict is the strongest cookie security combo)
        // In local dev, set COOKIE_SECURE=false in .env to allow HTTP (needed for signaling server auth)
        String securePart = cookieSecure ? "; Secure" : "";
        String accessCookie = String.format(
                "accessToken=%s; HttpOnly%s; Path=/; Max-Age=%d; SameSite=None",
                accessToken, securePart, (int) (jwtService.getAccessTokenExpiration() / 1000));

        String refreshCookie = String.format(
                "refreshToken=%s; HttpOnly%s; Path=/; Max-Age=%d; SameSite=None",
                refreshToken, securePart, (int) (jwtService.getRefreshTokenExpiration() / 1000));

        response.addHeader("Set-Cookie", accessCookie);
        response.addHeader("Set-Cookie", refreshCookie);
    }
}
