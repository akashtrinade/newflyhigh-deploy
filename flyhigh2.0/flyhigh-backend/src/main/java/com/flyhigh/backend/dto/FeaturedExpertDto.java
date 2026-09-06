package com.flyhigh.backend.dto;

/**
 * Lightweight featured expert card for the home page.
 */
public class FeaturedExpertDto {

    private String id;
    private String name;
    private String category;
    private double rating;
    private int reviewCount;
    private double hourlyRate;
    private boolean isOnline;
    private String initials;

    public FeaturedExpertDto() {}

    public FeaturedExpertDto(String id, String name, String category, double rating,
                             int reviewCount, double hourlyRate, boolean isOnline, String initials) {
        this.id = id;
        this.name = name;
        this.category = category;
        this.rating = rating;
        this.reviewCount = reviewCount;
        this.hourlyRate = hourlyRate;
        this.isOnline = isOnline;
        this.initials = initials;
    }

    // ── Getters and Setters ──

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public double getRating() { return rating; }
    public void setRating(double rating) { this.rating = rating; }

    public int getReviewCount() { return reviewCount; }
    public void setReviewCount(int reviewCount) { this.reviewCount = reviewCount; }

    public double getHourlyRate() { return hourlyRate; }
    public void setHourlyRate(double hourlyRate) { this.hourlyRate = hourlyRate; }

    public boolean getIsOnline() { return isOnline; }
    public void setIsOnline(boolean isOnline) { this.isOnline = isOnline; }

    public String getInitials() { return initials; }
    public void setInitials(String initials) { this.initials = initials; }
}
