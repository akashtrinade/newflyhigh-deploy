package com.flyhigh.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Request DTO for expert accepting or rejecting a call.
 */
public class CallActionRequest {

    @NotBlank(message = "Call request ID is required")
    private String callRequestId;

    @NotBlank(message = "Action is required")
    @Pattern(regexp = "ACCEPT|REJECT", message = "Action must be ACCEPT or REJECT")
    private String action;

    @Size(max = 500, message = "Reject reason must be less than 500 characters")
    private String rejectReason;

    public CallActionRequest() {}

    public String getCallRequestId() { return callRequestId; }
    public void setCallRequestId(String callRequestId) { this.callRequestId = callRequestId; }

    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }

    public String getRejectReason() { return rejectReason; }
    public void setRejectReason(String rejectReason) { this.rejectReason = rejectReason; }
}