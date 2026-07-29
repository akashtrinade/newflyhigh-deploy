package com.flyhigh.backend.controller;

import com.flyhigh.backend.dto.ChangePasswordRequest;
import com.flyhigh.backend.dto.MessageResponse;
import com.flyhigh.backend.dto.UpdateProfileRequest;
import com.flyhigh.backend.dto.UserProfileResponse;
import com.flyhigh.backend.model.NotificationPreferences;
import com.flyhigh.backend.service.UserService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/**
 * User Controller — profile management, password change, and notification preferences.
 *
 * All endpoints require authentication. Users can only access/modify their own data.
 */
@RestController
@RequestMapping("/api/users")
public class UserController {

    private static final Logger log = LoggerFactory.getLogger(UserController.class);

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    // ═══════════════════════════════════════════
    // PROFILE
    // ═══════════════════════════════════════════

    /**
     * Get the authenticated user's full profile.
     */
    @GetMapping("/profile")
    public ResponseEntity<?> getProfile(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).body(new MessageResponse(false, "Not authenticated"));
        }

        String email = authentication.getName();
        UserProfileResponse response = userService.getProfile(email);
        if (response == null) {
            return ResponseEntity.status(404).body(new MessageResponse(false, "User not found"));
        }

        return ResponseEntity.ok(response);
    }

    /**
     * Update the authenticated user's profile.
     * Only the authenticated user can update their own profile.
     */
    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(@Valid @RequestBody UpdateProfileRequest request,
                                           Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).body(new MessageResponse(false, "Not authenticated"));
        }

        String email = authentication.getName();
        UserProfileResponse response = userService.updateProfile(email, request);
        if (response == null) {
            return ResponseEntity.status(404).body(new MessageResponse(false, "User not found"));
        }

        log.info("AUDIT: Profile updated for user: {}", email);
        return ResponseEntity.ok(response);
    }

    // ═══════════════════════════════════════════
    // CHANGE PASSWORD
    // ═══════════════════════════════════════════

    /**
     * Change the authenticated user's password.
     * Requires current password verification.
     */
    @PutMapping("/change-password")
    public ResponseEntity<MessageResponse> changePassword(@Valid @RequestBody ChangePasswordRequest request,
                                                          Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).body(new MessageResponse(false, "Not authenticated"));
        }

        String email = authentication.getName();
        MessageResponse response = userService.changePassword(email, request);

        if (!response.isSuccess()) {
            return ResponseEntity.badRequest().body(response);
        }

        return ResponseEntity.ok(response);
    }

    // ═══════════════════════════════════════════
    // NOTIFICATION PREFERENCES
    // ═══════════════════════════════════════════

    /**
     * Get the authenticated user's notification preferences.
     */
    @GetMapping("/notification-preferences")
    public ResponseEntity<?> getNotificationPreferences(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).body(new MessageResponse(false, "Not authenticated"));
        }

        String email = authentication.getName();
        NotificationPreferences prefs = userService.getNotificationPreferences(email);
        return ResponseEntity.ok(prefs);
    }

    /**
     * Update the authenticated user's notification preferences.
     */
    @PutMapping("/notification-preferences")
    public ResponseEntity<MessageResponse> updateNotificationPreferences(
            @RequestBody NotificationPreferences prefs,
            Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).body(new MessageResponse(false, "Not authenticated"));
        }

        String email = authentication.getName();
        MessageResponse response = userService.updateNotificationPreferences(email, prefs);

        if (!response.isSuccess()) {
            return ResponseEntity.badRequest().body(response);
        }

        return ResponseEntity.ok(response);
    }
}
