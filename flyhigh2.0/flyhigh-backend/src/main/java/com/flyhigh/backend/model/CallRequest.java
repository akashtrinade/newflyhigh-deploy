package com.flyhigh.backend.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * CallRequest — tracks a video call request from client to expert.
 * Has states: PENDING, ACCEPTED, REJECTED, CANCELLED, COMPLETED
 */
@Document(collection = "call_requests")
public class CallRequest {

    @Id
    private String id;

    @Indexed
    private String clientId;    // User ID of the client

    @Indexed
    private String expertId;    // User ID of the expert

    private String clientName;  // Snapshot of client name at time of request
    private String clientEmail;

    private String roomId;      // WebRTC room identifier (assigned on accept)

    private String status;      // PENDING, ACCEPTED, REJECTED, CANCELLED, COMPLETED
    private String rejectReason;

    private Instant createdAt;
    private Instant respondedAt;

    // Rating (post-call)
    private Integer rating;     // 1-5
    private String review;

    // Session tracking
    private String interactionId;  // Links to the Interaction document (set when call accepted)

    // Review tracking
    private Boolean reviewSubmitted = false;  // true after client submits rating
    private Boolean feedbackPending = false;  // true if call ended but no review yet

    // --- Seed metadata ---
    private Boolean isSeedData = false;
    private String seedSource;

    public CallRequest() {}

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getClientId() { return clientId; }
    public void setClientId(String clientId) { this.clientId = clientId; }

    public String getExpertId() { return expertId; }
    public void setExpertId(String expertId) { this.expertId = expertId; }

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

    public String getInteractionId() { return interactionId; }
    public void setInteractionId(String interactionId) { this.interactionId = interactionId; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getRespondedAt() { return respondedAt; }
    public void setRespondedAt(Instant respondedAt) { this.respondedAt = respondedAt; }

    public Integer getRating() { return rating; }
    public void setRating(Integer rating) { this.rating = rating; }

    public String getReview() { return review; }
    public void setReview(String review) { this.review = review; }

    public Boolean getReviewSubmitted() { return reviewSubmitted; }
    public void setReviewSubmitted(Boolean reviewSubmitted) { this.reviewSubmitted = reviewSubmitted; }

    public Boolean getFeedbackPending() { return feedbackPending; }
    public void setFeedbackPending(Boolean feedbackPending) { this.feedbackPending = feedbackPending; }

    public Boolean getIsSeedData() { return isSeedData; }
    public void setIsSeedData(Boolean isSeedData) { this.isSeedData = isSeedData; }

    public String getSeedSource() { return seedSource; }
    public void setSeedSource(String seedSource) { this.seedSource = seedSource; }
}