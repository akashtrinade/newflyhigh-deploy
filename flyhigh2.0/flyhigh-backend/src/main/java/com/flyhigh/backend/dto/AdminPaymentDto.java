package com.flyhigh.backend.dto;

import java.time.Instant;

/**
 * Lightweight payment representation for Admin Portal tables.
 */
public class AdminPaymentDto {

    private String id;
    private double amount;
    private String currency;
    private String status;
    private Instant createdAt;

    public AdminPaymentDto() {}

    public AdminPaymentDto(String id, double amount, String currency,
                           String status, Instant createdAt) {
        this.id = id;
        this.amount = amount;
        this.currency = currency;
        this.status = status;
        this.createdAt = createdAt;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public double getAmount() { return amount; }
    public void setAmount(double amount) { this.amount = amount; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
