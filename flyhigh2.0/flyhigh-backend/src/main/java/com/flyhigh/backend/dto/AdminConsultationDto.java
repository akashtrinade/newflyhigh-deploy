package com.flyhigh.backend.dto;

import java.time.Instant;

/**
 * Lightweight consultation representation for Admin Portal tables.
 */
public class AdminConsultationDto {

    private String id;
    private String clientId;
    private String expertId;
    private String status;
    private Instant createdAt;

    public AdminConsultationDto() {}

    public AdminConsultationDto(String id, String clientId, String expertId,
                                String status, Instant createdAt) {
        this.id = id;
        this.clientId = clientId;
        this.expertId = expertId;
        this.status = status;
        this.createdAt = createdAt;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getClientId() { return clientId; }
    public void setClientId(String clientId) { this.clientId = clientId; }

    public String getExpertId() { return expertId; }
    public void setExpertId(String expertId) { this.expertId = expertId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
