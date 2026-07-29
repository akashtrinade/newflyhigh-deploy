package com.flyhigh.backend.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request DTO for post-call rating and review.
 */
public class RatingRequest {

    @NotBlank(message = "Call request ID is required")
    private String callRequestId;

    @Min(value = 1, message = "Rating must be between 1 and 5")
    @Max(value = 5, message = "Rating must be between 1 and 5")
    private int rating;

    @Size(max = 2000, message = "Review must be less than 2000 characters")
    private String review;

    public RatingRequest() {}

    public String getCallRequestId() { return callRequestId; }
    public void setCallRequestId(String callRequestId) { this.callRequestId = callRequestId; }

    public int getRating() { return rating; }
    public void setRating(int rating) { this.rating = rating; }

    public String getReview() { return review; }
    public void setReview(String review) { this.review = review; }
}