package com.flyhigh.backend.dto;

import com.flyhigh.backend.model.NotificationPreferences;

/**
 * Full user profile response — returned by GET /api/users/profile.
 * Includes all user fields plus notification preferences.
 */
public class UserProfileResponse {

    private String id;
    private String email;
    private String firstName;
    private String lastName;
    private String fullName;
    private String country;
    private String role;
    private Boolean profileCompleted;
    private Boolean isActive;
    private String status;
    private Boolean isOnline;

    // ── New profile fields ──
    private String phoneNumber;
    private String city;
    private String state;
    private String address;
    private String postalCode;
    private String profileImage;

    // ── Notification preferences ──
    private NotificationPreferences notificationPreferences;

    public UserProfileResponse() {}

    // ── Getters & Setters ──

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }

    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getCountry() { return country; }
    public void setCountry(String country) { this.country = country; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public Boolean getProfileCompleted() { return profileCompleted; }
    public void setProfileCompleted(Boolean profileCompleted) { this.profileCompleted = profileCompleted; }

    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Boolean getIsOnline() { return isOnline; }
    public void setIsOnline(Boolean isOnline) { this.isOnline = isOnline; }

    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }

    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }

    public String getState() { return state; }
    public void setState(String state) { this.state = state; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getPostalCode() { return postalCode; }
    public void setPostalCode(String postalCode) { this.postalCode = postalCode; }

    public String getProfileImage() { return profileImage; }
    public void setProfileImage(String profileImage) { this.profileImage = profileImage; }

    public NotificationPreferences getNotificationPreferences() { return notificationPreferences; }
    public void setNotificationPreferences(NotificationPreferences notificationPreferences) { this.notificationPreferences = notificationPreferences; }
}
