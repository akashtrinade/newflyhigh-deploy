package com.flyhigh.backend.dto;

public class AuthResponse {
    private boolean success;
    private String message;
    private String id;          // MongoDB user _id
    private String redirectUrl;
    private String email;
    private String firstName;
    private String lastName;
    private String fullName;
    private String role;
    private Boolean profileCompleted;
    private String country;
    private String status; // ONLINE, OFFLINE, BUSY — for expert visibility
    private Boolean isOnline;

    // ── Extended profile fields ──
    private String phoneNumber;
    private String city;
    private String state;
    private String address;
    private String postalCode;
    private String profileImage;

    // ── Notification preferences ──
    private com.flyhigh.backend.model.NotificationPreferences notificationPreferences;

    public AuthResponse() {}

    public AuthResponse(boolean success, String message) {
        this.success = success;
        this.message = message;
    }

    public AuthResponse(boolean success, String message, String redirectUrl,
                        String email, String firstName, String lastName,
                        String fullName, String role, Boolean profileCompleted,
                        String country) {
        this.success = success;
        this.message = message;
        this.redirectUrl = redirectUrl;
        this.email = email;
        this.firstName = firstName;
        this.lastName = lastName;
        this.fullName = fullName;
        this.role = role;
        this.profileCompleted = profileCompleted;
        this.country = country;
    }

    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getRedirectUrl() { return redirectUrl; }
    public void setRedirectUrl(String redirectUrl) { this.redirectUrl = redirectUrl; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }

    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public Boolean getProfileCompleted() { return profileCompleted; }
    public void setProfileCompleted(Boolean profileCompleted) { this.profileCompleted = profileCompleted; }

    public String getCountry() { return country; }
    public void setCountry(String country) { this.country = country; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Boolean getIsOnline() { return isOnline; }
    public void setIsOnline(Boolean isOnline) { this.isOnline = isOnline; }

    // ── Extended profile getters & setters ──

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

    public com.flyhigh.backend.model.NotificationPreferences getNotificationPreferences() { return notificationPreferences; }
    public void setNotificationPreferences(com.flyhigh.backend.model.NotificationPreferences notificationPreferences) { this.notificationPreferences = notificationPreferences; }
}

