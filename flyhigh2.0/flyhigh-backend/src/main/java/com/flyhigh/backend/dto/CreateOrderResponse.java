package com.flyhigh.backend.dto;

public class CreateOrderResponse {
    private String orderId;     // Razorpay order ID
    private String amount;      // Amount in paise (as string from Razorpay)
    private String currency;    // INR
    private String keyId;       // Razorpay key_id for frontend

    public CreateOrderResponse() {}

    public CreateOrderResponse(String orderId, String amount, String currency, String keyId) {
        this.orderId = orderId;
        this.amount = amount;
        this.currency = currency;
        this.keyId = keyId;
    }

    public String getOrderId() { return orderId; }
    public void setOrderId(String orderId) { this.orderId = orderId; }

    public String getAmount() { return amount; }
    public void setAmount(String amount) { this.amount = amount; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public String getKeyId() { return keyId; }
    public void setKeyId(String keyId) { this.keyId = keyId; }
}
