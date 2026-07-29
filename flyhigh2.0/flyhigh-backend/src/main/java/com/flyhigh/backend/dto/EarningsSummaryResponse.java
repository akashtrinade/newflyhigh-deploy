package com.flyhigh.backend.dto;

/**
 * Aggregated earnings statistics for the expert's dashboard overview.
 */
public class EarningsSummaryResponse {

    private double availableBalance;
    private double pendingBalance;
    private double lifetimeEarnings;
    private double platformCommission;
    private long totalSessions;
    private double averageRating;

    public EarningsSummaryResponse() {}

    public EarningsSummaryResponse(double availableBalance, double pendingBalance,
                                   double lifetimeEarnings, double platformCommission,
                                   long totalSessions, double averageRating) {
        this.availableBalance = availableBalance;
        this.pendingBalance = pendingBalance;
        this.lifetimeEarnings = lifetimeEarnings;
        this.platformCommission = platformCommission;
        this.totalSessions = totalSessions;
        this.averageRating = averageRating;
    }

    public double getAvailableBalance() { return availableBalance; }
    public void setAvailableBalance(double availableBalance) { this.availableBalance = availableBalance; }

    public double getPendingBalance() { return pendingBalance; }
    public void setPendingBalance(double pendingBalance) { this.pendingBalance = pendingBalance; }

    public double getLifetimeEarnings() { return lifetimeEarnings; }
    public void setLifetimeEarnings(double lifetimeEarnings) { this.lifetimeEarnings = lifetimeEarnings; }

    public double getPlatformCommission() { return platformCommission; }
    public void setPlatformCommission(double platformCommission) { this.platformCommission = platformCommission; }

    public long getTotalSessions() { return totalSessions; }
    public void setTotalSessions(long totalSessions) { this.totalSessions = totalSessions; }

    public double getAverageRating() { return averageRating; }
    public void setAverageRating(double averageRating) { this.averageRating = averageRating; }
}
