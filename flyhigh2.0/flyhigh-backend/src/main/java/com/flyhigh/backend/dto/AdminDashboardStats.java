package com.flyhigh.backend.dto;

/**
 * Dashboard statistics for the Admin Portal.
 */
public class AdminDashboardStats {

    private long totalUsers;
    private long totalExperts;
    private long totalClients;
    private long activeConsultations;
    private double todayRevenue;
    private double platformRevenue;
    private double pendingPayouts;
    private long completedConsultations;

    private long latestUsersCount;
    private long latestExpertsCount;
    private long latestConsultationsCount;
    private long latestPaymentsCount;

    public AdminDashboardStats() {}

    // ── Builder-style setters for fluent construction ──

    public AdminDashboardStats totalUsers(long v) { this.totalUsers = v; return this; }
    public AdminDashboardStats totalExperts(long v) { this.totalExperts = v; return this; }
    public AdminDashboardStats totalClients(long v) { this.totalClients = v; return this; }
    public AdminDashboardStats activeConsultations(long v) { this.activeConsultations = v; return this; }
    public AdminDashboardStats todayRevenue(double v) { this.todayRevenue = v; return this; }
    public AdminDashboardStats platformRevenue(double v) { this.platformRevenue = v; return this; }
    public AdminDashboardStats pendingPayouts(double v) { this.pendingPayouts = v; return this; }
    public AdminDashboardStats completedConsultations(long v) { this.completedConsultations = v; return this; }

    // ── Getters ──

    public long getTotalUsers() { return totalUsers; }
    public long getTotalExperts() { return totalExperts; }
    public long getTotalClients() { return totalClients; }
    public long getActiveConsultations() { return activeConsultations; }
    public double getTodayRevenue() { return todayRevenue; }
    public double getPlatformRevenue() { return platformRevenue; }
    public double getPendingPayouts() { return pendingPayouts; }
    public long getCompletedConsultations() { return completedConsultations; }
    public long getLatestUsersCount() { return latestUsersCount; }
    public void setLatestUsersCount(long v) { this.latestUsersCount = v; }
    public long getLatestExpertsCount() { return latestExpertsCount; }
    public void setLatestExpertsCount(long v) { this.latestExpertsCount = v; }
    public long getLatestConsultationsCount() { return latestConsultationsCount; }
    public void setLatestConsultationsCount(long v) { this.latestConsultationsCount = v; }
    public long getLatestPaymentsCount() { return latestPaymentsCount; }
    public void setLatestPaymentsCount(long v) { this.latestPaymentsCount = v; }
}
