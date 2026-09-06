package com.flyhigh.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request DTO for expert response/acknowledgment to a client review.
 */
public class ExpertReviewRequest {

    @NotBlank(message = "Call request ID is required")
    private String callRequestId;

    @Size(max = 2000, message = "Response must be less than 2000 characters")
    private String expertResponse;

    public ExpertReviewRequest() {}

    public String getCallRequestId() { return callRequestId; }
    public void setCallRequestId(String callRequestId) { this.callRequestId = callRequestId; }

    public String getExpertResponse() { return expertResponse; }
    public void setExpertResponse(String expertResponse) { this.expertResponse = expertResponse; }
}
