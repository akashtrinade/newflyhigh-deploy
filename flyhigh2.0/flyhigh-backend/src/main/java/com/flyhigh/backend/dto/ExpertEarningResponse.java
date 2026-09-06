package com.flyhigh.backend.dto;

/**
 * A single earning entry shown in the expert's earnings table.
 */
public class ExpertEarningResponse {

    private String id;
    private String sessionDate;
    private String clientName;
    private int duration;
    private double clientPaid;
    private double platformFee;
    private double expertEarning;
    private String status;
    private String payoutStatus;

    public ExpertEarningResponse() {}

    public ExpertEarningResponse(String id, String sessionDate, String clientName,
                                 int duration, double clientPaid, double platformFee,
                                 double expertEarning, String status, String payoutStatus) {
        this.id = id;
        this.sessionDate = sessionDate;
        this.clientName = clientName;
        this.duration = duration;
        this.clientPaid = clientPaid;
        this.platformFee = platformFee;
        this.expertEarning = expertEarning;
        this.status = status;
        this.payoutStatus = payoutStatus;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getSessionDate() { return sessionDate; }
    public void setSessionDate(String sessionDate) { this.sessionDate = sessionDate; }

    public String getClientName() { return clientName; }
    public void setClientName(String clientName) { this.clientName = clientName; }

    public int getDuration() { return duration; }
    public void setDuration(int duration) { this.duration = duration; }

    public double getClientPaid() { return clientPaid; }
    public void setClientPaid(double clientPaid) { this.clientPaid = clientPaid; }

    public double getPlatformFee() { return platformFee; }
    public void setPlatformFee(double platformFee) { this.platformFee = platformFee; }

    public double getExpertEarning() { return expertEarning; }
    public void setExpertEarning(double expertEarning) { this.expertEarning = expertEarning; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getPayoutStatus() { return payoutStatus; }
    public void setPayoutStatus(String payoutStatus) { this.payoutStatus = payoutStatus; }
}
