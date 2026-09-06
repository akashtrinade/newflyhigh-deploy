package com.flyhigh.backend.dto;

import java.util.ArrayList;
import java.util.List;

/**
 * Aggregated home page statistics — served by the public /api/public/home-stats endpoint.
 * No authentication required.
 */
public class HomePageStatsResponse {

    private long totalUsers;
    private long verifiedExperts;
    private long totalConsultations;
    private double averageRating;
    private List<FeaturedExpertDto> featuredExperts = new ArrayList<>();
    private List<CategoryCountDto> categoryCounts = new ArrayList<>();
    private List<ReviewDto> recentReviews = new ArrayList<>();

    public HomePageStatsResponse() {}

    // ── Builder-style setters for fluent construction ──

    public HomePageStatsResponse totalUsers(long v) { this.totalUsers = v; return this; }
    public HomePageStatsResponse verifiedExperts(long v) { this.verifiedExperts = v; return this; }
    public HomePageStatsResponse totalConsultations(long v) { this.totalConsultations = v; return this; }
    public HomePageStatsResponse averageRating(double v) { this.averageRating = v; return this; }
    public HomePageStatsResponse featuredExperts(List<FeaturedExpertDto> v) { this.featuredExperts = v; return this; }
    public HomePageStatsResponse categoryCounts(List<CategoryCountDto> v) { this.categoryCounts = v; return this; }
    public HomePageStatsResponse recentReviews(List<ReviewDto> v) { this.recentReviews = v; return this; }

    // ── Getters ──

    public long getTotalUsers() { return totalUsers; }
    public long getVerifiedExperts() { return verifiedExperts; }
    public long getTotalConsultations() { return totalConsultations; }
    public double getAverageRating() { return averageRating; }
    public List<FeaturedExpertDto> getFeaturedExperts() { return featuredExperts; }
    public List<CategoryCountDto> getCategoryCounts() { return categoryCounts; }
    public List<ReviewDto> getRecentReviews() { return recentReviews; }
}
