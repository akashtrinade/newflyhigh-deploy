package com.flyhigh.backend.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public class CreateOrderRequest {

    @NotBlank(message = "Interaction ID is required")
    private String interactionId;

    @Min(value = 1, message = "Duration must be at least 1 minute")
    @Max(value = 120, message = "Duration must not exceed 120 minutes")
    private int durationMinutes;

    @NotBlank(message = "Order type is required")
    @Pattern(regexp = "INITIAL|EXTENSION", message = "Type must be INITIAL or EXTENSION")
    private String type;

    public String getInteractionId() { return interactionId; }
    public void setInteractionId(String interactionId) { this.interactionId = interactionId; }

    public int getDurationMinutes() { return durationMinutes; }
    public void setDurationMinutes(int durationMinutes) { this.durationMinutes = durationMinutes; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
}
