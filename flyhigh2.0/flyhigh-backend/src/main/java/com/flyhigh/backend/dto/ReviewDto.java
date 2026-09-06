package com.flyhigh.backend.dto;

import java.time.Instant;

/**
 * Public review/testimonial for the home page.
 * Only includes fields safe for public display.
 */
public class ReviewDto {

    private String clientName;
    private int rating;
    private String feedback;
    private Instant createdAt;

    public ReviewDto() {}

    public ReviewDto(String clientName, int rating, String feedback, Instant createdAt) {
        this.clientName = clientName;
        this.rating = rating;
        this.feedback = feedback;
        this.createdAt = createdAt;
    }

    public String getClientName() { return clientName; }
    public void setClientName(String clientName) { this.clientName = clientName; }

    public int getRating() { return rating; }
    public void setRating(int rating) { this.rating = rating; }

    public String getFeedback() { return feedback; }
    public void setFeedback(String feedback) { this.feedback = feedback; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
