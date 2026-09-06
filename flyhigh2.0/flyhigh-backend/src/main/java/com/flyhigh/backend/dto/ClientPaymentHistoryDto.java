package com.flyhigh.backend.dto;

import java.time.Instant;

/**
 * A single payment entry in the client's payment history.
 */
public class ClientPaymentHistoryDto {

    private String id;
    private String interactionId;
    private String expertName;
    private String expertId;
    private String sessionDate;
    private int duration;
    private double totalPaidAmount;
    private String sessionStatus;
    private String paymentStatus;
    private String razorpayPaymentId;
    private String paymentType;

    public ClientPaymentHistoryDto() {}

    public ClientPaymentHistoryDto(String id, String interactionId, String expertName,
                                   String expertId, String sessionDate, int duration,
                                   double totalPaidAmount, String sessionStatus,
                                   String paymentStatus, String razorpayPaymentId,
                                   String paymentType) {
        this.id = id;
        this.interactionId = interactionId;
        this.expertName = expertName;
        this.expertId = expertId;
        this.sessionDate = sessionDate;
        this.duration = duration;
        this.totalPaidAmount = totalPaidAmount;
        this.sessionStatus = sessionStatus;
        this.paymentStatus = paymentStatus;
        this.razorpayPaymentId = razorpayPaymentId;
        this.paymentType = paymentType;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getInteractionId() { return interactionId; }
    public void setInteractionId(String interactionId) { this.interactionId = interactionId; }

    public String getExpertName() { return expertName; }
    public void setExpertName(String expertName) { this.expertName = expertName; }

    public String getExpertId() { return expertId; }
    public void setExpertId(String expertId) { this.expertId = expertId; }

    public String getSessionDate() { return sessionDate; }
    public void setSessionDate(String sessionDate) { this.sessionDate = sessionDate; }

    public int getDuration() { return duration; }
    public void setDuration(int duration) { this.duration = duration; }

    public double getTotalPaidAmount() { return totalPaidAmount; }
    public void setTotalPaidAmount(double totalPaidAmount) { this.totalPaidAmount = totalPaidAmount; }

    public String getSessionStatus() { return sessionStatus; }
    public void setSessionStatus(String sessionStatus) { this.sessionStatus = sessionStatus; }

    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }

    public String getRazorpayPaymentId() { return razorpayPaymentId; }
    public void setRazorpayPaymentId(String razorpayPaymentId) { this.razorpayPaymentId = razorpayPaymentId; }

    public String getPaymentType() { return paymentType; }
    public void setPaymentType(String paymentType) { this.paymentType = paymentType; }
}
