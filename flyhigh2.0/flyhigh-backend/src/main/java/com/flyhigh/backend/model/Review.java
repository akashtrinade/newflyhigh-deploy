package com.flyhigh.backend.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "reviews")
public class Review {

    @Id
    private String id;

    @Indexed
    private String sessionId;   // Links to CallRequest or Interaction

    @Indexed
    private String clientId;    // User ID of reviewer

    @Indexed
    private String expertId;    // User ID of expert being reviewed

    private Integer rating;     // 1-5
    private String feedback;    // Client's written review
    private Instant createdAt;

    public Review() {}

    public Review(String sessionId, String clientId, String expertId, Integer rating, String feedback) {
        this.sessionId = sessionId;
        this.clientId = clientId;
        this.expertId = expertId;
        this.rating = rating;
        this.feedback = feedback;
        this.createdAt = Instant.now();
    }

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getSessionId() { return sessionId; }
    public void setSessionId(String sessionId) { this.sessionId = sessionId; }

    public String getClientId() { return clientId; }
    public void setClientId(String clientId) { this.clientId = clientId; }

    public String getExpertId() { return expertId; }
    public void setExpertId(String expertId) { this.expertId = expertId; }

    public Integer getRating() { return rating; }
    public void setRating(Integer rating) { this.rating = rating; }

    public String getFeedback() { return feedback; }
    public void setFeedback(String feedback) { this.feedback = feedback; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
