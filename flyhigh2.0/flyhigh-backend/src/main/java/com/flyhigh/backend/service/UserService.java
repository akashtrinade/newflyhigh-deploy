package com.flyhigh.backend.service;

import com.flyhigh.backend.dto.ChangePasswordRequest;
import com.flyhigh.backend.dto.MessageResponse;
import com.flyhigh.backend.dto.UpdateProfileRequest;
import com.flyhigh.backend.dto.UserProfileResponse;
import com.flyhigh.backend.model.NotificationPreferences;
import com.flyhigh.backend.model.User;
import com.flyhigh.backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;

/**
 * User Service — handles profile updates, password changes, and notification preferences.
 *
 * AUDIT: Profile updates, password changes, and notification preference changes
 * are logged at INFO level for audit trail purposes.
 */
@Service
public class UserService {

    private static final Logger log = LoggerFactory.getLogger(UserService.class);

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, BCryptPasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    // ═══════════════════════════════════════════
    // PROFILE
    // ═══════════════════════════════════════════

    /**
     * Returns the full profile of the authenticated user.
     */
    public UserProfileResponse getProfile(String email) {
        User user = userRepository.findByEmail(email.toLowerCase().trim()).orElse(null);
        if (user == null) {
            return null;
        }
        return buildProfileResponse(user);
    }

    /**
     * Updates the authenticated user's profile fields.
     * Only the fields present in the request are updated.
     */
    public UserProfileResponse updateProfile(String email, UpdateProfileRequest request) {
        User user = userRepository.findByEmail(email.toLowerCase().trim()).orElse(null);
        if (user == null) {
            return null;
        }

        user.setFirstName(request.getFirstName().trim());
        user.setLastName(request.getLastName().trim());
        // fullName auto-computed by setFirstName/setLastName

        // Optional fields — only update if provided (non-blank)
        if (request.getPhoneNumber() != null && !request.getPhoneNumber().isBlank()) {
            user.setPhoneNumber(request.getPhoneNumber().trim());
        }
        if (request.getCity() != null) {
            user.setCity(request.getCity().trim().isEmpty() ? null : request.getCity().trim());
        }
        if (request.getState() != null) {
            user.setState(request.getState().trim().isEmpty() ? null : request.getState().trim());
        }
        if (request.getCountry() != null && !request.getCountry().isBlank()) {
            user.setCountry(request.getCountry().trim());
        }
        if (request.getAddress() != null) {
            user.setAddress(request.getAddress().trim().isEmpty() ? null : request.getAddress().trim());
        }
        if (request.getPostalCode() != null) {
            user.setPostalCode(request.getPostalCode().trim().isEmpty() ? null : request.getPostalCode().trim());
        }
        if (request.getProfileImage() != null) {
            user.setProfileImage(request.getProfileImage().trim().isEmpty() ? null : request.getProfileImage().trim());
        }

        user.setUpdatedAt(Instant.now());
        userRepository.save(user);

        log.info("AUDIT: Profile updated for user: {}", email);
        return buildProfileResponse(user);
    }

    // ═══════════════════════════════════════════
    // CHANGE PASSWORD
    // ═══════════════════════════════════════════

    /**
     * Changes the user's password while logged in.
     * Requires current password verification for security.
     */
    public MessageResponse changePassword(String email, ChangePasswordRequest request) {
        String trimmedEmail = email.toLowerCase().trim();

        // Validate new password matches confirm
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            return new MessageResponse(false, "New password and confirm password do not match.");
        }

        // Validate new password is different from current
        if (request.getCurrentPassword().equals(request.getNewPassword())) {
            return new MessageResponse(false, "New password cannot be the same as your current password.");
        }

        User user = userRepository.findByEmail(trimmedEmail).orElse(null);
        if (user == null) {
            return new MessageResponse(false, "User not found.");
        }

        // Verify current password
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            log.warn("AUDIT: Failed password change attempt (wrong current password) for: {}", trimmedEmail);
            return new MessageResponse(false, "Current password is incorrect.");
        }

        // Encode and set new password
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));

        // Invalidate all existing JWT tokens (forces re-login on all other devices)
        user.setTokenVersion((user.getTokenVersion() != null ? user.getTokenVersion() : 1L) + 1);
        user.setUpdatedAt(Instant.now());
        userRepository.save(user);

        log.info("AUDIT: Password changed for user: {} (all existing sessions invalidated)", trimmedEmail);
        return new MessageResponse(true, "Password changed successfully. You will need to log in again on other devices.");
    }

    // ═══════════════════════════════════════════
    // NOTIFICATION PREFERENCES
    // ═══════════════════════════════════════════

    /**
     * Returns the user's notification preferences.
     */
    public NotificationPreferences getNotificationPreferences(String email) {
        User user = userRepository.findByEmail(email.toLowerCase().trim()).orElse(null);
        if (user == null || user.getNotificationPreferences() == null) {
            return new NotificationPreferences(); // Return defaults
        }
        return user.getNotificationPreferences();
    }

    /**
     * Updates the user's notification preferences.
     */
    public MessageResponse updateNotificationPreferences(String email, NotificationPreferences prefs) {
        User user = userRepository.findByEmail(email.toLowerCase().trim()).orElse(null);
        if (user == null) {
            return new MessageResponse(false, "User not found.");
        }

        user.setNotificationPreferences(prefs);
        user.setUpdatedAt(Instant.now());
        userRepository.save(user);

        log.info("AUDIT: Notification preferences updated for user: {}", email);
        return new MessageResponse(true, "Notification preferences saved.");
    }

    // ═══════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════

    private UserProfileResponse buildProfileResponse(User user) {
        UserProfileResponse response = new UserProfileResponse();
        response.setId(user.getId());
        response.setEmail(user.getEmail());
        response.setFirstName(user.getFirstName());
        response.setLastName(user.getLastName());
        response.setFullName(user.getFullName());
        response.setCountry(user.getCountry());
        response.setRole(user.getRole());
        response.setProfileCompleted(user.getProfileCompleted());
        response.setIsActive(user.getIsActive());

        // Extended profile fields
        response.setPhoneNumber(user.getPhoneNumber());
        response.setCity(user.getCity());
        response.setState(user.getState());
        response.setAddress(user.getAddress());
        response.setPostalCode(user.getPostalCode());
        response.setProfileImage(user.getProfileImage());

        // Notification preferences
        response.setNotificationPreferences(
            user.getNotificationPreferences() != null
                ? user.getNotificationPreferences()
                : new NotificationPreferences()
        );

        return response;
    }
}
