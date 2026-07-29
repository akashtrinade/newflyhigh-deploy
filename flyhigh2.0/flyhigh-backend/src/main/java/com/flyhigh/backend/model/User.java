package com.flyhigh.backend.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * User entity — created only AFTER successful email OTP verification.
 * firstName and lastName stored separately for personalization.
 * fullName auto-generated as "firstName lastName".
 *
 * SECURITY:
 * - Email uniquely indexed
 * - BCrypt hashed password
 * - profileCompleted flag for expert onboarding
 */
@Document(collection = "users")
public class User {

    @Id
    private String id;

    @Indexed(unique = true)
    private String email;

    private String password;

    /** Google's unique user ID — used for Google Sign-In linking */
    @Indexed(sparse = true)
    private String googleId;

    /** "local" for email/password signup, "google" for Google Sign-In */
    private String authProvider = "local";

    /** Whether email has been verified (Google provides this for us) */
    private Boolean emailVerified = false;

    private String firstName;
    private String lastName;
    private String fullName;
    private String country;
    private String role; // CLIENT or EXPERT
    private Boolean profileCompleted = false;
    private Boolean isActive = true;

    // ── Extended profile fields ──
    private String phoneNumber;
    private String city;
    private String state;
    private String address;
    private String postalCode;
    private String profileImage;

    // ── Admin flag ──
    private Boolean isAdmin = false;

    // ── Notification preferences (embedded) ──
    private NotificationPreferences notificationPreferences = new NotificationPreferences();

    /**
     * Token version — incremented on logout and password reset.
     * Invalidates all previously issued JWT tokens for this user.
     * Checked during JWT validation in JwtAuthenticationFilter.
     */
    private Long tokenVersion = 1L;

    private Instant createdAt;
    private Instant updatedAt;

    // --- Seed metadata ---
    private Boolean isSeedData = false;
    private String seedSource;

    public User() {}

    public User(String id, String email, String password, String firstName, String lastName,
                String role, Boolean isActive, Instant createdAt, Instant updatedAt) {
        this.id = id;
        this.email = email;
        this.password = password;
        this.firstName = firstName;
        this.lastName = lastName;
        this.fullName = firstName + " " + lastName;
        this.role = role;
        this.profileCompleted = false;
        this.isActive = isActive;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getGoogleId() { return googleId; }
    public void setGoogleId(String googleId) { this.googleId = googleId; }

    public String getAuthProvider() { return authProvider; }
    public void setAuthProvider(String authProvider) { this.authProvider = authProvider; }

    public Boolean getEmailVerified() { return emailVerified; }
    public void setEmailVerified(Boolean emailVerified) { this.emailVerified = emailVerified; }
    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) {
        this.firstName = firstName;
        this.fullName = firstName + " " + (this.lastName != null ? this.lastName : "");
    }

    public String getLastName() { return lastName; }
    public void setLastName(String lastName) {
        this.lastName = lastName;
        this.fullName = (this.firstName != null ? this.firstName : "") + " " + lastName;
    }

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

    public Long getTokenVersion() { return tokenVersion; }
    public void setTokenVersion(Long tokenVersion) { this.tokenVersion = tokenVersion; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    public Boolean getIsSeedData() { return isSeedData; }
    public void setIsSeedData(Boolean isSeedData) { this.isSeedData = isSeedData; }

    public String getSeedSource() { return seedSource; }
    public void setSeedSource(String seedSource) { this.seedSource = seedSource; }

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

    public Boolean getIsAdmin() { return isAdmin; }
    public void setIsAdmin(Boolean isAdmin) { this.isAdmin = isAdmin; }

    public NotificationPreferences getNotificationPreferences() { return notificationPreferences; }
    public void setNotificationPreferences(NotificationPreferences notificationPreferences) { this.notificationPreferences = notificationPreferences; }
}