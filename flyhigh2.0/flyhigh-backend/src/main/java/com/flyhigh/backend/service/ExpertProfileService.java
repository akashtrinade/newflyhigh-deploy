package com.flyhigh.backend.service;

import com.flyhigh.backend.dto.ExpertProfileRequest;
import com.flyhigh.backend.dto.ExpertProfileResponse;
import com.flyhigh.backend.model.ExpertProfile;
import com.flyhigh.backend.model.Interaction;
import com.flyhigh.backend.model.SessionStatus;
import com.flyhigh.backend.model.User;
import com.flyhigh.backend.repository.ExpertProfileRepository;
import com.flyhigh.backend.repository.InteractionRepository;
import com.flyhigh.backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;

/**
 * Handles expert profile completion after signup + email verification.
 * Profile completion is MANDATORY before accessing the expert dashboard.
 */
@Service
public class ExpertProfileService {

    private static final Logger log = LoggerFactory.getLogger(ExpertProfileService.class);

    @Value("${pricing.rate-change-days:14}")
    private int rateChangeCooldownDays;

    private final ExpertProfileRepository expertProfileRepository;
    private final UserRepository userRepository;
    private final DropdownService dropdownService;
    private final InteractionRepository interactionRepository;
    private final PricingService pricingService;
    private final AuthService authService;

    public ExpertProfileService(ExpertProfileRepository expertProfileRepository,
            UserRepository userRepository,
            DropdownService dropdownService,
            InteractionRepository interactionRepository,
            PricingService pricingService,
            AuthService authService) {
        this.expertProfileRepository = expertProfileRepository;
        this.userRepository = userRepository;
        this.dropdownService = dropdownService;
        this.interactionRepository = interactionRepository;
        this.pricingService = pricingService;
        this.authService = authService;
    }

    /**
     * Creates or updates expert profile.
     * Marks user.profileCompleted = true on success.
     */
    public ProfileResult completeProfile(String email, ExpertProfileRequest request) {
        User user = userRepository.findByEmail(email.toLowerCase().trim()).orElse(null);
        if (user == null) {
            return new ProfileResult(false, "User not found");
        }

        if (!"EXPERT".equals(user.getRole())) {
            return new ProfileResult(false, "Only experts can complete a profile");
        }

        ExpertProfile profile = expertProfileRepository.findByUserId(user.getId())
                .orElse(new ExpertProfile());

        boolean isNewProfile = profile.getCreatedAt() == null;
        boolean isRateChanged = !isNewProfile
                && profile.getHourlyRate() != null
                && !profile.getHourlyRate().equals(request.getHourlyRate());

        // Enforce rate-change cooldown (only when the hourly rate is actually changing)
        if (isRateChanged) {
            Instant lastRateUpdate = profile.getLastRateUpdatedAt();
            if (lastRateUpdate != null) {
                Instant nextAllowed = lastRateUpdate.plus(rateChangeCooldownDays, ChronoUnit.DAYS);
                if (Instant.now().isBefore(nextAllowed)) {
                    long daysRemaining = ChronoUnit.DAYS.between(Instant.now(), nextAllowed) + 1;
                    return new ProfileResult(false,
                            "You can update your hourly consultation rate again after " + rateChangeCooldownDays + " days.");
                }
            }
        }

        Instant now = Instant.now();

        profile.setUserId(user.getId());
        profile.setCountry(request.getCountry().trim());
        profile.setProfessionalTitle(request.getProfessionalTitle().trim());
        profile.setCategory(request.getCategory().trim());
        profile.setSubCategory(request.getSubCategory().trim());
        profile.setYearsOfExperience(request.getYearsOfExperience());
        profile.setBio(request.getBio().trim());
        profile.setHourlyRate(request.getHourlyRate());
        profile.setPhoneNumber(request.getPhoneNumber().trim());
        profile.setCity(normalizeOptional(request.getCity()));

        // Track when the rate was last updated
        if (isRateChanged || isNewProfile) {
            profile.setLastRateUpdatedAt(now);
        }

        profile.setLanguages(joinLanguages(request.getLanguages()));
        profile.setLinkedIn(normalizeOptional(request.getLinkedIn()));
        profile.setPortfolio(normalizeOptional(request.getPortfolio()));
        profile.setGithub(normalizeOptional(request.getGithub()));

        if (profile.getCreatedAt() == null) {
            profile.setCreatedAt(now);
        }
        profile.setUpdatedAt(now);

        // Set expert online & heartbeat on profile creation
        profile.setIsOnline(true);
        profile.setLastActivityAt(now);

        expertProfileRepository.save(profile);
        dropdownService.ensureCustomSubCategoryOption(profile.getCategory(), profile.getSubCategory());

        user.setFirstName(request.getFirstName().trim());
        user.setLastName(request.getLastName().trim());
        user.setProfileCompleted(true);
        user.setUpdatedAt(now);
        userRepository.save(user);

        log.info("Expert profile completed for user: {}", email);
        return new ProfileResult(true, "Profile completed successfully");
    }

    /**
     * Returns the expert profile for a given user email.
     */
    public ExpertProfile getProfile(String email) {
        User user = userRepository.findByEmail(email.toLowerCase().trim()).orElse(null);
        if (user == null)
            return null;
        return expertProfileRepository.findByUserId(user.getId()).orElse(null);
    }

    /**
     * Returns the combined expert profile and user details.
     */
    public ExpertProfileResponse getProfileResponse(String email) {
        User user = userRepository.findByEmail(email.toLowerCase().trim()).orElse(null);
        if (user == null)
            return null;
        ExpertProfile profile = expertProfileRepository.findByUserId(user.getId()).orElse(null);
        return buildResponse(user, profile);
    }

    /**
     * Checks if an expert has completed their profile.
     */
    public boolean isProfileCompleted(String email) {
        User user = userRepository.findByEmail(email.toLowerCase().trim()).orElse(null);
        return user != null && Boolean.TRUE.equals(user.getProfileCompleted());
    }

    private ExpertProfileResponse buildResponse(User user, ExpertProfile profile) {
        ExpertProfileResponse response = new ExpertProfileResponse();
        response.setFirstName(user.getFirstName());
        response.setLastName(user.getLastName());
        response.setUserId(user.getId());
        response.setProfileCompleted(user.getProfileCompleted());
        response.setProfileExists(profile != null);

        if (profile == null) {
            response.setCountry(normalizeOptional(user.getCountry()));
            return response;
        }

        response.setId(profile.getId());
        response.setCountry(firstNonBlank(profile.getCountry(), user.getCountry()));
        response.setProfessionalTitle(profile.getProfessionalTitle());
        response.setCategory(profile.getCategory());
        response.setSubCategory(profile.getSubCategory());
        response.setYearsOfExperience(profile.getYearsOfExperience());
        response.setBio(profile.getBio());
        response.setHourlyRate(profile.getHourlyRate());
        Double baseRate = profile.getHourlyRate();
        response.setClientHourlyRate(baseRate != null ? pricingService.getClientHourlyRate(baseRate) : null);
        response.setPhoneNumber(profile.getPhoneNumber());
        response.setCity(profile.getCity());
        response.setLanguages(splitLanguages(profile.getLanguages()));
        response.setLinkedIn(profile.getLinkedIn());
        response.setPortfolio(profile.getPortfolio());
        response.setGithub(profile.getGithub());

        // Delegates to AuthService for presence computation (single source of truth)
        String status = authService.computeExpertStatus(user.getId());
        response.setStatus(status);
        response.setIsOnline(!"OFFLINE".equals(status));
        response.setLastSeen(profile.getLastActivityAt());

        response.setIsApproved(profile.getIsApproved());
        response.setCreatedAt(profile.getCreatedAt());
        response.setUpdatedAt(profile.getUpdatedAt());
        response.setLastRateUpdatedAt(profile.getLastRateUpdatedAt());
        return response;
    }

    private String joinLanguages(List<String> languages) {
        return languages == null ? null
                : languages.stream()
                        .map(this::normalizeOptional)
                        .filter(Objects::nonNull)
                        .distinct()
                        .reduce((left, right) -> left + ", " + right)
                        .orElse(null);
    }

    private List<String> splitLanguages(String languages) {
        if (languages == null || languages.isBlank()) {
            return List.of();
        }
        return Arrays.stream(languages.split(","))
                .map(this::normalizeOptional)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
    }

    private String firstNonBlank(String primary, String fallback) {
        String normalizedPrimary = normalizeOptional(primary);
        return normalizedPrimary != null ? normalizedPrimary : normalizeOptional(fallback);
    }

    private String normalizeOptional(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    public static class ProfileResult {
        private final boolean success;
        private final String message;

        public ProfileResult(boolean success, String message) {
            this.success = success;
            this.message = message;
        }

        public boolean isSuccess() {
            return success;
        }

        public String getMessage() {
            return message;
        }
    }
}
