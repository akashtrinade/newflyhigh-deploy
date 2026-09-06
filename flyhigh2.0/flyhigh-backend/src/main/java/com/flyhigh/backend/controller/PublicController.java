package com.flyhigh.backend.controller;

import com.flyhigh.backend.dto.HomePageStatsResponse;
import com.flyhigh.backend.service.PublicService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Public endpoints — no authentication required.
 * Serves home page statistics and other public-read data.
 */
@RestController
@RequestMapping("/api/public")
public class PublicController {

    private static final Logger log = LoggerFactory.getLogger(PublicController.class);

    private final PublicService publicService;

    public PublicController(PublicService publicService) {
        this.publicService = publicService;
    }

    /**
     * Get aggregated home page statistics including user counts,
     * featured experts, category breakdowns, and recent reviews.
     * Public — no authentication required.
     */
    @GetMapping("/home-stats")
    public ResponseEntity<HomePageStatsResponse> getHomeStats() {
        log.info("Public home page stats requested");
        HomePageStatsResponse stats = publicService.getHomePageStats();
        return ResponseEntity.ok(stats);
    }
}
