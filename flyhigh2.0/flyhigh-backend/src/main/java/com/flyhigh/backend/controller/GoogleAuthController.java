package com.flyhigh.backend.controller;

import com.flyhigh.backend.dto.AuthResponse;
import com.flyhigh.backend.model.User;
import com.flyhigh.backend.service.AuthService;
import com.flyhigh.backend.service.GoogleAuthService;
import com.flyhigh.backend.service.JwtService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Google Sign-In Controller.
 *
 * ENDPOINTS:
 * - POST /api/auth/google-login  → Receive Google ID token, verify, login/create user
 * - POST /api/auth/complete-google-registration → Complete registration with role selection
 *
 * FLOW:
 * 1. Frontend calls @react-oauth/google's GoogleLogin component
 * 2. On success, sends credential (JWT ID token) to /google-login
 * 3. Backend verifies token using Google's public keys
 * 4. Extracts email, name, googleId
 * 5. If user exists → login (link Google account if first time)
 * 6. If user doesn't exist → return pending status with redirect to role selection
 * 7. User selects role → frontend calls /complete-google-registration
 * 8. Backend creates user with selected role
 */
@RestController
@RequestMapping("/api/auth")
public class GoogleAuthController {

    private final GoogleAuthService googleAuthService;
    private final JwtService jwtService;
    private final AuthService authService;

    public GoogleAuthController(GoogleAuthService googleAuthService, JwtService jwtService,
                                AuthService authService) {
        this.googleAuthService = googleAuthService;
        this.jwtService = jwtService;
        this.authService = authService;
    }

    /**
     * POST /api/auth/google-login
     *
     * Request body:
     * {
     *   "credential": "eyJhbGciOiJSUzI1NiIs..."  (Google JWT ID token)
     * }
     *
     * Response:
     * - If existing user: returns AuthResponse with redirectUrl to dashboard
     * - If new user: returns AuthResponse with redirectUrl to /role-selection and role=PENDING
     */
    @PostMapping("/google-login")
    public ResponseEntity<?> googleLogin(@RequestBody Map<String, String> body,
                                          HttpServletResponse response) {
        String credential = body.get("credential");

        if (credential == null || credential.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "message", "Google credential is required"));
        }

        try {
            AuthResponse authResponse = googleAuthService.authenticateWithGoogle(credential);

            // If user is existing (not PENDING), generate JWT tokens
            if (!"PENDING".equals(authResponse.getRole())) {
                User user = authService.getUserByEmail(authResponse.getEmail());
                String userId = user != null ? user.getId() : authResponse.getEmail();
                Long tokenVersion = user != null ? user.getTokenVersion() : 1L;

                String accessToken = jwtService.generateAccessToken(
                        userId, authResponse.getEmail(), authResponse.getRole(), tokenVersion);
                String refreshToken = jwtService.generateRefreshToken(
                        userId, authResponse.getEmail(), authResponse.getRole(), tokenVersion);

                setAuthCookies(response, accessToken, refreshToken);
            }

            return ResponseEntity.ok(authResponse);

        } catch (GoogleAuthService.GoogleAuthException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("success", false, "message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "An unexpected error occurred during Google authentication"));
        }
    }

    /**
     * POST /api/auth/complete-google-registration
     *
     * Request body:
     * {
     *   "email": "user@gmail.com",
     *   "firstName": "John",
     *   "lastName": "Doe",
     *   "fullName": "John Doe",
     *   "role": "CLIENT" or "EXPERT"
     * }
     *
     * Response:
     * - Creates user account with selected role
     * - Returns AuthResponse with redirectUrl and JWT cookies
     */
    @PostMapping("/complete-google-registration")
    public ResponseEntity<?> completeGoogleRegistration(@RequestBody Map<String, String> body,
                                                        HttpServletResponse response) {
        String email = body.get("email");
        String firstName = body.get("firstName");
        String lastName = body.get("lastName");
        String fullName = body.get("fullName");
        String role = body.get("role");

        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "message", "Email is required"));
        }

        if (role == null || role.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "message", "Role selection is required"));
        }

        if (!"CLIENT".equalsIgnoreCase(role) && !"EXPERT".equalsIgnoreCase(role)) {
            return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "message", "Invalid role. Must be CLIENT or EXPERT"));
        }

        try {
            AuthResponse authResponse = googleAuthService.completeGoogleRegistration(
                    email, firstName, lastName, fullName, role.toUpperCase());

            // Generate JWT tokens for the newly created user
            User user = authService.getUserByEmail(authResponse.getEmail());
            String userId = user != null ? user.getId() : authResponse.getEmail();
            Long tokenVersion = user != null ? user.getTokenVersion() : 1L;

            String accessToken = jwtService.generateAccessToken(
                    userId, authResponse.getEmail(), authResponse.getRole(), tokenVersion);
            String refreshToken = jwtService.generateRefreshToken(
                    userId, authResponse.getEmail(), authResponse.getRole(), tokenVersion);

            setAuthCookies(response, accessToken, refreshToken);

            return ResponseEntity.ok(authResponse);

        } catch (GoogleAuthService.GoogleAuthException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("success", false, "message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "An unexpected error occurred during registration"));
        }
    }

    @Value("${app.cookie.secure:true}")
    private boolean cookieSecure;

    private void setAuthCookies(HttpServletResponse response, String accessToken, String refreshToken) {
        String securePart = cookieSecure ? "; Secure" : "";
        String accessCookie = String.format(
                "accessToken=%s; HttpOnly%s; Path=/; Max-Age=%d; SameSite=Strict",
                accessToken, securePart, (int) (jwtService.getAccessTokenExpiration() / 1000));

        String refreshCookie = String.format(
                "refreshToken=%s; HttpOnly%s; Path=/; Max-Age=%d; SameSite=Strict",
                refreshToken, securePart, (int) (jwtService.getRefreshTokenExpiration() / 1000));

        response.addHeader("Set-Cookie", accessCookie);
        response.addHeader("Set-Cookie", refreshCookie);
    }
}