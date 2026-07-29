package com.flyhigh.backend.dto;

import java.time.Instant;
import java.util.List;

/**
 * Lightweight expert card for search results.
 * Excludes sensitive fields: bio, phoneNumber, linkedIn, portfolio, github.
 */
public class ExpertSummaryResponse {
    private String id;
    private String userId;
    private String name;              // User.fullName
    private String professionalTitle;
    private String category;
    private String subCategory;
    private Integer experience;       // yearsOfExperience
    private List<String> languages;   // split from comma-separated string
    private String country;
    private Double rating;            // 0.0 placeholder — no rating system yet
    private Integer reviewCount;      // 0 placeholder — no review system yet
    private Double sessionPrice;      // Client-facing price (expert hourly rate + platform commission)
    private Double expertHourlyRate;  // Expert's base earning rate (for expert-only views)
    private String availability;      // "Online" | "Offline" derived from isOnline
    private Boolean isOnline;         // computed from heartbeat
    private String status;            // "ONLINE", "BUSY", "OFFLINE" — computed from heartbeat + active sessions
    private Instant lastSeen;         // lastActivityAt timestamp

    public ExpertSummaryResponse() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getProfessionalTitle() { return professionalTitle; }
    public void setProfessionalTitle(String professionalTitle) { this.professionalTitle = professionalTitle; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getSubCategory() { return subCategory; }
    public void setSubCategory(String subCategory) { this.subCategory = subCategory; }

    public Integer getExperience() { return experience; }
    public void setExperience(Integer experience) { this.experience = experience; }

    public List<String> getLanguages() { return languages; }
    public void setLanguages(List<String> languages) { this.languages = languages; }

    public String getCountry() { return country; }
    public void setCountry(String country) { this.country = country; }

    public Double getRating() { return rating; }
    public void setRating(Double rating) { this.rating = rating; }

    public Integer getReviewCount() { return reviewCount; }
    public void setReviewCount(Integer reviewCount) { this.reviewCount = reviewCount; }

    public Double getSessionPrice() { return sessionPrice; }
    public void setSessionPrice(Double sessionPrice) { this.sessionPrice = sessionPrice; }

    public Double getExpertHourlyRate() { return expertHourlyRate; }
    public void setExpertHourlyRate(Double expertHourlyRate) { this.expertHourlyRate = expertHourlyRate; }

    public String getAvailability() { return availability; }
    public void setAvailability(String availability) { this.availability = availability; }

    public Boolean getIsOnline() { return isOnline; }
    public void setIsOnline(Boolean isOnline) { this.isOnline = isOnline; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Instant getLastSeen() { return lastSeen; }
    public void setLastSeen(Instant lastSeen) { this.lastSeen = lastSeen; }
}
