package com.flyhigh.backend.dto;

public class SessionStateResponse {
    private String interactionId;
    private String phase;                   // FREE_SESSION, PAYMENT_PENDING, PAYMENT_VERIFIED, PAID_SESSION, COMPLETED, FREE_SESSION_EXPIRED
    private int freeTrialRemainingSec;      // Seconds remaining in free trial (0 if not in free trial)
    private int paidSessionRemainingSec;    // Seconds remaining in paid session (0 if not paid)
    private int totalPaidDurationMin;       // Total minutes purchased
    private int elapsedPaidSeconds;         // Elapsed time in paid session
    private Integer recommendedDurationMin; // Expert's recommendation (null if none)
    private String paymentStatus;           // UNPAID, HELD, PAID
    private Double totalPaidAmount;         // Total client-paid amount in INR
    private Double expertAmount;            // Expert's base earning for this session
    private Double commissionAmount;        // Platform commission for this session
    private Double commissionPercent;       // Commission percentage used (e.g. 20.0)
    private boolean showExtendPrompt;       // true when < 5 min remain in paid session
    private Double expertHourlyRate;        // Expert's base earning rate snapshot
    private Double clientHourlyRate;        // Client-facing rate (expert rate + commission)

    public SessionStateResponse() {}

    // Getters and Setters
    public String getInteractionId() { return interactionId; }
    public void setInteractionId(String interactionId) { this.interactionId = interactionId; }

    public String getPhase() { return phase; }
    public void setPhase(String phase) { this.phase = phase; }

    public int getFreeTrialRemainingSec() { return freeTrialRemainingSec; }
    public void setFreeTrialRemainingSec(int freeTrialRemainingSec) { this.freeTrialRemainingSec = freeTrialRemainingSec; }

    public int getPaidSessionRemainingSec() { return paidSessionRemainingSec; }
    public void setPaidSessionRemainingSec(int paidSessionRemainingSec) { this.paidSessionRemainingSec = paidSessionRemainingSec; }

    public int getTotalPaidDurationMin() { return totalPaidDurationMin; }
    public void setTotalPaidDurationMin(int totalPaidDurationMin) { this.totalPaidDurationMin = totalPaidDurationMin; }

    public int getElapsedPaidSeconds() { return elapsedPaidSeconds; }
    public void setElapsedPaidSeconds(int elapsedPaidSeconds) { this.elapsedPaidSeconds = elapsedPaidSeconds; }

    public Integer getRecommendedDurationMin() { return recommendedDurationMin; }
    public void setRecommendedDurationMin(Integer recommendedDurationMin) { this.recommendedDurationMin = recommendedDurationMin; }

    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }

    public Double getTotalPaidAmount() { return totalPaidAmount; }
    public void setTotalPaidAmount(Double totalPaidAmount) { this.totalPaidAmount = totalPaidAmount; }

    public boolean isShowExtendPrompt() { return showExtendPrompt; }
    public void setShowExtendPrompt(boolean showExtendPrompt) { this.showExtendPrompt = showExtendPrompt; }

    public Double getExpertAmount() { return expertAmount; }
    public void setExpertAmount(Double expertAmount) { this.expertAmount = expertAmount; }

    public Double getCommissionAmount() { return commissionAmount; }
    public void setCommissionAmount(Double commissionAmount) { this.commissionAmount = commissionAmount; }

    public Double getCommissionPercent() { return commissionPercent; }
    public void setCommissionPercent(Double commissionPercent) { this.commissionPercent = commissionPercent; }

    public Double getExpertHourlyRate() { return expertHourlyRate; }
    public void setExpertHourlyRate(Double expertHourlyRate) { this.expertHourlyRate = expertHourlyRate; }

    public Double getClientHourlyRate() { return clientHourlyRate; }
    public void setClientHourlyRate(Double clientHourlyRate) { this.clientHourlyRate = clientHourlyRate; }
}
