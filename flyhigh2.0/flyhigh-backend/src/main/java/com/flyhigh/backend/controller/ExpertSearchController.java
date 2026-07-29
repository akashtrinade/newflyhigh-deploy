package com.flyhigh.backend.controller;

import com.flyhigh.backend.dto.*;
import com.flyhigh.backend.service.DropdownService;
import com.flyhigh.backend.service.ExpertSearchService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * Public expert search and browsing endpoints.
 * Accessible to any authenticated user (CLIENT or EXPERT).
 * Distinct from ExpertProfileController which handles the expert's own profile.
 */
@RestController
@RequestMapping("/api/experts")
public class ExpertSearchController {

    private final ExpertSearchService expertSearchService;
    private final DropdownService dropdownService;

    public ExpertSearchController(ExpertSearchService expertSearchService,
                                  DropdownService dropdownService) {
        this.expertSearchService = expertSearchService;
        this.dropdownService = dropdownService;
    }

    /**
     * Search, filter, sort, and paginate approved expert profiles.
     * All query parameters are optional.
     */
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ExpertSearchPageResponse> searchExperts(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String subCategory,
            @RequestParam(required = false) String language,
            @RequestParam(required = false) String country,
            @RequestParam(required = false) String availability,
            @RequestParam(required = false) String rating,
            @RequestParam(required = false) String price,
            @RequestParam(required = false) String experience,
            @RequestParam(required = false, defaultValue = "Most Relevant") String sort,
            @RequestParam(required = false, defaultValue = "0") int page,
            @RequestParam(required = false, defaultValue = "12") int size) {

        ExpertSearchPageResponse result = expertSearchService.searchExperts(
                q, category, subCategory, language, country,
                availability, rating, price, experience,
                sort, page, size);
        return ResponseEntity.ok(result);
    }

    /**
     * Get a single approved expert's public profile by expert profile ID.
     */
    @GetMapping("/{expertId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getExpertById(@PathVariable String expertId) {
        ExpertProfileResponse response = expertSearchService.getExpertPublicProfile(expertId);
        if (response == null) {
            return ResponseEntity.status(404)
                    .body(new MessageResponse(false, "Expert not found"));
        }
        return ResponseEntity.ok(response);
    }

    /**
     * Get dropdown filter options for the search page.
     * Reuses the existing DropdownService catalog (categories, subCategories, languages, countries).
     */
    @GetMapping("/filters")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<DropdownCatalogResponse> getSearchFilters() {
        return ResponseEntity.ok(dropdownService.getExpertProfileDropdownCatalog());
    }
}
