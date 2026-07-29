package com.flyhigh.backend.dto;

/**
 * DTO for creating and returning call request data.
 */
public class CallRequestDto {

    private String id;
    private String expertId;
    private String clientId;
    private String clientName;
    private String clientEmail;
    private String expertName;
    private String roomId;
    private String status;
    private String rejectReason;
    private String createdAt;
    private String respondedAt;
    private Integer rating;
    private String review;
    private Boolean reviewSubmitted;
    private Boolean feedbackPending;
    private String interactionId;

    public CallRequestDto() {}

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getExpertId() { return expertId; }
    public void setExpertId(String expertId) { this.expertId = expertId; }

    public String getClientId() { return clientId; }
    public void setClientId(String clientId) { this.clientId = clientId; }

    public String getClientName() { return clientName; }
    public void setClientName(String clientName) { this.clientName = clientName; }

    public String getClientEmail() { return clientEmail; }
    public void setClientEmail(String clientEmail) { this.clientEmail = clientEmail; }

    public String getRoomId() { return roomId; }
    public void setRoomId(String roomId) { this.roomId = roomId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getRejectReason() { return rejectReason; }
    public void setRejectReason(String rejectReason) { this.rejectReason = rejectReason; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    public String getRespondedAt() { return respondedAt; }
    public void setRespondedAt(String respondedAt) { this.respondedAt = respondedAt; }

    public Integer getRating() { return rating; }
    public void setRating(Integer rating) { this.rating = rating; }

    public String getExpertName() { return expertName; }
    public void setExpertName(String expertName) { this.expertName = expertName; }

    public String getReview() { return review; }
    public void setReview(String review) { this.review = review; }

    public Boolean getReviewSubmitted() { return reviewSubmitted; }
    public void setReviewSubmitted(Boolean reviewSubmitted) { this.reviewSubmitted = reviewSubmitted; }

    public Boolean getFeedbackPending() { return feedbackPending; }
    public void setFeedbackPending(Boolean feedbackPending) { this.feedbackPending = feedbackPending; }

    public String getInteractionId() { return interactionId; }
    public void setInteractionId(String interactionId) { this.interactionId = interactionId; }
}
