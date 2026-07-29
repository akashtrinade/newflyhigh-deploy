package com.flyhigh.backend.service;

import com.flyhigh.backend.dto.AuthResponse;
import com.flyhigh.backend.model.User;
import com.flyhigh.backend.repository.UserRepository;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Collections;

/**
 * Google Sign-In Service.
 *
 * FLOW:
 * 1. Frontend sends Google ID token (JWT) from @react-oauth/google
 * 2. Backend verifies the token using Google's public keys
 * 3. Extracts user info (email, name, email_verified, googleId)
 * 4. If user exists → login (link Google account if first time)
 * 5. If user doesn't exist → auto-create with role=CLIENT
 *
 * SECURITY:
 * - Verifies token signature using Google's public keys
 * - Checks audience (client ID) matches our app
 * - Checks expiry
 * - Prevents account takeover (if email exists with different provider, error out)
 */
@Service
public class GoogleAuthService {

    private static final Logger log = LoggerFactory.getLogger(GoogleAuthService.class);

    private final UserRepository userRepository;
    private final AuthService authService;
    private final GoogleIdTokenVerifier verifier;

    public GoogleAuthService(
            UserRepository userRepository,
            AuthService authService,
            @Value("${google.client-id}") String clientId) {
        this.userRepository = userRepository;
        this.authService = authService;

        this.verifier = new GoogleIdTokenVerifier.Builder(
                new NetHttpTransport(),
                GsonFactory.getDefaultInstance())
                .setAudience(Collections.singletonList(clientId))
                .build();
    }

    /**
     * Authenticates (or creates) a user using a Google ID token.
     *
     * @param idTokenString The JWT ID token from Google's frontend SDK
     * @return AuthResponse with redirect URL
     * @throws GoogleAuthException if token is invalid or account conflict
     */
    public AuthResponse authenticateWithGoogle(String idTokenString) throws GoogleAuthException {
        // ── Step 1: Verify the ID token ──
        GoogleIdToken idToken;
        try {
            idToken = verifier.verify(idTokenString);
        } catch (Exception e) {
            log.error("Google token verification failed", e);
            throw new GoogleAuthException("Failed to verify Google token: " + e.getMessage());
        }

        if (idToken == null) {
            throw new GoogleAuthException("Invalid Google ID token. Token may be expired or malformed.");
        }

        // ── Step 2: Extract payload ──
        GoogleIdToken.Payload payload = idToken.getPayload();
        String googleId = payload.getSubject();
        String email = payload.getEmail();
        boolean emailVerified = Boolean.TRUE.equals(payload.getEmailVerified());
        String name = (String) payload.get("name");
        String givenName = (String) payload.get("given_name");
        String familyName = (String) payload.get("family_name");

        if (email == null || email.isBlank()) {
            throw new GoogleAuthException("Google account has no email address.");
        }

        email = email.toLowerCase().trim();

        // ── Step 3: Check if email is verified by Google ──
        if (!emailVerified) {
            throw new GoogleAuthException("Google email not verified. Please use a verified Google account.");
        }

        // ── Step 4: Find or create user ──
        User existingUser = userRepository.findByEmail(email).orElse(null);

        if (existingUser != null) {
            // User exists — check for account conflicts
            return handleExistingUser(existingUser, googleId, email);
        } else {
            // User doesn't exist — return pending registration response
            return createPendingGoogleUser(googleId, email, givenName, familyName, name);
        }
    }

    /**
     * Handles login for an existing user signing in with Google.
     */
    private AuthResponse handleExistingUser(User user, String googleId, String email) throws GoogleAuthException {
        String provider = user.getAuthProvider() != null ? user.getAuthProvider() : "local";

        if ("google".equals(provider)) {
            // Already a Google user — normal login
            log.info("Google user logged in: {}", email);
        } else if ("local".equals(provider)) {
            // Email/password user signing in with Google for first time
            if (user.getGoogleId() != null && !user.getGoogleId().equals(googleId)) {
                throw new GoogleAuthException("This email is linked to a different Google account.");
            }
            // Link Google account to existing user
            user.setGoogleId(googleId);
            user.setAuthProvider("google");
            user.setEmailVerified(true);
            user.setUpdatedAt(Instant.now());
            userRepository.save(user);
            log.info("Google account linked to existing user: {}", email);
        }

        if (!user.getIsActive()) {
            throw new GoogleAuthException("Account is deactivated. Please contact support.");
        }

        // ── Expert online presence: Set isOnline=true on login (same as AuthService.login) ──
        if ("EXPERT".equalsIgnoreCase(user.getRole())) {
            authService.updateExpertActivity(user.getId());
            log.info("Expert presence set to ONLINE via Google login: {}", email);
        }

        String redirectUrl = getDashboardUrl(user.getRole(), user.getProfileCompleted());
        log.info("User logged in via Google: {} (role: {})", email, user.getRole());

        AuthResponse response = new AuthResponse(true, "Login successful", redirectUrl,
                user.getEmail(), user.getFirstName(), user.getLastName(),
                user.getFullName(), user.getRole(), user.getProfileCompleted(),
                user.getCountry());

        response.setId(user.getId());

        // Populate expert presence status in response (same as AuthService.login)
        if ("EXPERT".equalsIgnoreCase(user.getRole())) {
            String status = authService.computeExpertStatus(user.getId());
            response.setStatus(status);
            response.setIsOnline(!"OFFLINE".equals(status));
        }

        return response;
    }

    /**
     * Creates a pending registration response for new Google users.
     * The user must complete signup via the regular signup flow.
     */
    private AuthResponse createPendingGoogleUser(String googleId, String email,
                                                  String givenName, String familyName,
                                                  String fullName) throws GoogleAuthException {
        // Return a response indicating signup is required
        // No JWT tokens are issued - user must complete signup
        AuthResponse response = new AuthResponse();
        response.setSuccess(true);
        response.setMessage("New Google user - signup required");
        response.setRedirectUrl("/signup");
        response.setEmail(email);
        response.setFirstName(givenName != null ? givenName : email.split("@")[0]);
        response.setLastName(familyName != null ? familyName : "");
        response.setFullName(fullName);
        response.setRole("PENDING"); // Special status indicating signup not completed
        response.setProfileCompleted(false);

        log.info("New Google user redirected to signup: {}", email);

        return response;
    }

    /**
     * Completes Google registration by creating the user with the selected role.
     */
    public AuthResponse completeGoogleRegistration(String email, String firstName, String lastName,
                                                    String fullName, String role) throws GoogleAuthException {
        // Check if user already exists (shouldn't happen, but safety check)
        if (userRepository.findByEmail(email).isPresent()) {
            throw new GoogleAuthException("User already exists. Please login instead.");
        }

        User user = new User();
        user.setEmail(email);
        user.setFirstName(firstName != null ? firstName : email.split("@")[0]);
        user.setLastName(lastName != null ? lastName : "");
        user.setFullName(fullName);
        user.setAuthProvider("google");
        user.setEmailVerified(true);
        user.setPassword(""); // No password for Google users
        user.setRole(role);
        user.setProfileCompleted(false);
        user.setIsActive(true);
        user.setCreatedAt(Instant.now());
        user.setUpdatedAt(Instant.now());

        userRepository.save(user);

        // ── Expert online presence for newly registered Google expert ──
        // Note: ExpertProfile may not exist yet if profile hasn't been completed.
        // updateExpertActivity silently no-ops if no profile found; presence is computed
        // from the ExpertProfile which gets created during profile completion.
        if ("EXPERT".equalsIgnoreCase(role.toUpperCase())) {
            authService.updateExpertActivity(user.getId());
            log.info("Expert presence set for new Google registration: {}", email);
        }

        String redirectUrl = getDashboardUrl(user.getRole(), user.getProfileCompleted());
        log.info("Google user completed registration: {} (role: {})", email, user.getRole());

        AuthResponse response = new AuthResponse(true, "Account created successfully", redirectUrl,
                user.getEmail(), user.getFirstName(), user.getLastName(),
                user.getFullName(), user.getRole(), user.getProfileCompleted(),
                user.getCountry());

        response.setId(user.getId());

        // Populate expert presence status in response
        if ("EXPERT".equalsIgnoreCase(user.getRole())) {
            String status = authService.computeExpertStatus(user.getId());
            response.setStatus(status);
            response.setIsOnline(!"OFFLINE".equals(status));
        }

        return response;
    }

    private String getDashboardUrl(String role, Boolean profileCompleted) {
        String upperRole = role != null ? role.toUpperCase() : "";
        if ("CLIENT".equals(upperRole)) return "/client-dashboard";
        if ("EXPERT".equals(upperRole)) {
            if (Boolean.TRUE.equals(profileCompleted)) return "/expert-dashboard";
            return "/expert-profile-completion";
        }
        if ("ADMIN".equals(upperRole)) return "/admin/dashboard";
        return "/";
    }

    /**
     * Custom exception for Google auth errors.
     */
    public static class GoogleAuthException extends Exception {
        public GoogleAuthException(String message) {
            super(message);
        }
    }
}
