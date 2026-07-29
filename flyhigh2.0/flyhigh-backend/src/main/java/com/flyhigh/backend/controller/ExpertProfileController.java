package com.flyhigh.backend.controller;

import com.flyhigh.backend.dto.DropdownCatalogResponse;
import com.flyhigh.backend.dto.ExpertProfileRequest;
import com.flyhigh.backend.dto.ExpertProfileResponse;
import com.flyhigh.backend.dto.MessageResponse;
import com.flyhigh.backend.service.DropdownService;
import com.flyhigh.backend.service.ExpertProfileService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/**
 * Expert Profile Controller.
 *
 * ENDPOINTS:
 * - POST /api/expert/profile       → Create/update expert profile (requires EXPERT role)
 * - GET  /api/expert/profile       → Get expert profile
 * - GET  /api/expert/profile/status → Check if profile is completed
 */
@RestController
@RequestMapping("/api/expert")
public class ExpertProfileController {

    private final ExpertProfileService expertProfileService;
    private final DropdownService dropdownService;

    public ExpertProfileController(ExpertProfileService expertProfileService,
                                   DropdownService dropdownService) {
        this.expertProfileService = expertProfileService;
        this.dropdownService = dropdownService;
    }

    /**
     * POST /api/expert/profile
     * Creates or updates the expert profile.
     * Requires EXPERT role and valid JWT token.
     */
    @PostMapping("/profile")
    @PreAuthorize("hasRole('EXPERT')")
    public ResponseEntity<?> completeProfile(
            @Valid @RequestBody ExpertProfileRequest request,
            Authentication authentication) {
        String email = authentication.getName(); // email used as principal
        ExpertProfileService.ProfileResult result = expertProfileService.completeProfile(email, request);
        if (!result.isSuccess()) {
            return ResponseEntity.badRequest().body(new MessageResponse(false, result.getMessage()));
        }
        return ResponseEntity.ok(new MessageResponse(true, result.getMessage()));
    }

    /**
     * GET /api/expert/profile
     * Returns the expert profile for the authenticated user.
     */
    @GetMapping("/profile")
    @PreAuthorize("hasRole('EXPERT')")
    public ResponseEntity<?> getProfile(Authentication authentication) {
        String email = authentication.getName();
        ExpertProfileResponse response = expertProfileService.getProfileResponse(email);
        if (response == null) {
            return ResponseEntity.badRequest().body(new MessageResponse(false, "User not found"));
        }
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/expert/profile/dropdowns
     * Returns dropdown definitions for the expert profile form.
     */
    @GetMapping("/profile/dropdowns")
    @PreAuthorize("hasRole('EXPERT')")
    public ResponseEntity<DropdownCatalogResponse> getProfileDropdowns() {
        return ResponseEntity.ok(dropdownService.getExpertProfileDropdownCatalog());
    }

    /**
     * GET /api/expert/profile/status
     * Returns whether the expert profile is completed.
     */
    @GetMapping("/profile/status")
    @PreAuthorize("hasRole('EXPERT')")
    public ResponseEntity<?> getProfileStatus(Authentication authentication) {
        String email = authentication.getName();
        boolean completed = expertProfileService.isProfileCompleted(email);
        return ResponseEntity.ok(new ProfileStatusResponse(completed));
    }

    static class ProfileStatusResponse {
        private final boolean completed;
        ProfileStatusResponse(boolean completed) { this.completed = completed; }
        public boolean isCompleted() { return completed; }
    }
}
