package com.flyhigh.backend.dto;

public class DurationRecommendationRequest {
    private String interactionId;
    private int recommendedDurationMinutes;  // 15, 30, 45, or 60

    public String getInteractionId() { return interactionId; }
    public void setInteractionId(String interactionId) { this.interactionId = interactionId; }

    public int getRecommendedDurationMinutes() { return recommendedDurationMinutes; }
    public void setRecommendedDurationMinutes(int recommendedDurationMinutes) { this.recommendedDurationMinutes = recommendedDurationMinutes; }
}
