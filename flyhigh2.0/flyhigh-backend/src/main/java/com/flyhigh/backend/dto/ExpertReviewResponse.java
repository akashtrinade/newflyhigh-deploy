package com.flyhigh.backend.dto;

import java.time.Instant;

/**
 * Individual client review/rating for an expert's public profile.
 */
public class ExpertReviewResponse {
    private String callRequestId;
    private String clientName;
    private Integer rating;
    private String review;
    private Instant createdAt;
    private String expertResponse;
    private Instant expertRespondedAt;

    public ExpertReviewResponse() {}

    public String getCallRequestId() { return callRequestId; }
    public void setCallRequestId(String callRequestId) { this.callRequestId = callRequestId; }

    public String getClientName() { return clientName; }
    public void setClientName(String clientName) { this.clientName = clientName; }

    public Integer getRating() { return rating; }
    public void setRating(Integer rating) { this.rating = rating; }

    public String getReview() { return review; }
    public void setReview(String review) { this.review = review; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public String getExpertResponse() { return expertResponse; }
    public void setExpertResponse(String expertResponse) { this.expertResponse = expertResponse; }

    public Instant getExpertRespondedAt() { return expertRespondedAt; }
    public void setExpertRespondedAt(Instant expertRespondedAt) { this.expertRespondedAt = expertRespondedAt; }
}
