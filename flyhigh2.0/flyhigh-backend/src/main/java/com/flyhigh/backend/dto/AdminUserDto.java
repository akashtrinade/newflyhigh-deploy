package com.flyhigh.backend.dto;

import java.time.Instant;

/**
 * Lightweight user representation for Admin Portal tables.
 */
public class AdminUserDto {

    private String id;
    private String email;
    private String firstName;
    private String lastName;
    private String fullName;
    private String role;
    private String country;
    private String status; // "ACTIVE" | "INACTIVE" — matches UI expectations
    private Boolean isActive;
    private Boolean isAdmin;
    private Instant createdAt;

    public AdminUserDto() {}

    public AdminUserDto(String id, String email, String fullName, String role,
                        String country, Boolean isActive, Boolean isAdmin, Instant createdAt) {
        this.id = id;
        this.email = email;
        this.fullName = fullName;
        this.role = role;
        this.country = country;
        this.isActive = isActive;
        this.isAdmin = isAdmin;
        this.createdAt = createdAt;
        this.status = Boolean.TRUE.equals(isActive) ? "ACTIVE" : "INACTIVE";
    }

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

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getCountry() { return country; }
    public void setCountry(String country) { this.country = country; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }

    public Boolean getIsAdmin() { return isAdmin; }
    public void setIsAdmin(Boolean isAdmin) { this.isAdmin = isAdmin; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
