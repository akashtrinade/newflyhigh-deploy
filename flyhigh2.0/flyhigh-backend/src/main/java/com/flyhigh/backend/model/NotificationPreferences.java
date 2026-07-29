package com.flyhigh.backend.model;

/**
 * Notification preferences embedded in the User document.
 * Controls which notifications the user receives.
 *
 * Defaults: email, push, consultation, payment, and reminder notifications are ON.
 * Marketing emails are OFF by default (opt-in).
 */
public class NotificationPreferences {

    private boolean emailNotifications = true;
    private boolean pushNotifications = true;
    private boolean consultationReminders = true;
    private boolean paymentNotifications = true;
    private boolean marketingEmails = false;
    private boolean reminderNotifications = true;

    public NotificationPreferences() {}

    // ── Getters & Setters ──

    public boolean isEmailNotifications() { return emailNotifications; }
    public void setEmailNotifications(boolean emailNotifications) { this.emailNotifications = emailNotifications; }

    public boolean isPushNotifications() { return pushNotifications; }
    public void setPushNotifications(boolean pushNotifications) { this.pushNotifications = pushNotifications; }

    public boolean isConsultationReminders() { return consultationReminders; }
    public void setConsultationReminders(boolean consultationReminders) { this.consultationReminders = consultationReminders; }

    public boolean isPaymentNotifications() { return paymentNotifications; }
    public void setPaymentNotifications(boolean paymentNotifications) { this.paymentNotifications = paymentNotifications; }

    public boolean isMarketingEmails() { return marketingEmails; }
    public void setMarketingEmails(boolean marketingEmails) { this.marketingEmails = marketingEmails; }

    public boolean isReminderNotifications() { return reminderNotifications; }
    public void setReminderNotifications(boolean reminderNotifications) { this.reminderNotifications = reminderNotifications; }
}
