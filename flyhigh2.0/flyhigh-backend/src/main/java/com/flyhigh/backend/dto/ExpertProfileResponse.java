package com.flyhigh.backend.dto;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

public class ExpertProfileResponse {
    private String id;
    private String userId;
    private String firstName;
    private String lastName;
    private String country;
    private String professionalTitle;
    private String category;
    private String subCategory;
    private Integer yearsOfExperience;
    private String bio;
    private Double hourlyRate;
    private Double clientHourlyRate; // Client-facing price (expert rate + platform commission)
    private String phoneNumber;
    private String city;
    private List<String> languages = new ArrayList<>();
    private String linkedIn;
    private String portfolio;
    private String github;
    private Double averageRating;
    private Integer totalReviews;
    private List<ExpertReviewResponse> reviews = new ArrayList<>();
    private Boolean isOnline;
    private String status; // "ONLINE", "BUSY", "OFFLINE" — computed from heartbeat + active sessions
    private Instant lastSeen; // lastActivityAt timestamp (heartbeat)
    private Boolean isApproved;
    private Boolean profileExists;
    private Boolean profileCompleted;
    private Instant createdAt;
    private Instant updatedAt;
    private Instant lastRateUpdatedAt;

    public ExpertProfileResponse() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }

    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }

    public String getCountry() { return country; }
    public void setCountry(String country) { this.country = country; }

    public String getProfessionalTitle() { return professionalTitle; }
    public void setProfessionalTitle(String professionalTitle) { this.professionalTitle = professionalTitle; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getSubCategory() { return subCategory; }
    public void setSubCategory(String subCategory) { this.subCategory = subCategory; }

    public Integer getYearsOfExperience() { return yearsOfExperience; }
    public void setYearsOfExperience(Integer yearsOfExperience) { this.yearsOfExperience = yearsOfExperience; }

    public String getBio() { return bio; }
    public void setBio(String bio) { this.bio = bio; }

    public Double getHourlyRate() { return hourlyRate; }
    public void setHourlyRate(Double hourlyRate) { this.hourlyRate = hourlyRate; }

    public Double getClientHourlyRate() { return clientHourlyRate; }
    public void setClientHourlyRate(Double clientHourlyRate) { this.clientHourlyRate = clientHourlyRate; }

    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }

    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }

    public List<String> getLanguages() { return languages; }
    public void setLanguages(List<String> languages) { this.languages = languages; }

    public String getLinkedIn() { return linkedIn; }
    public void setLinkedIn(String linkedIn) { this.linkedIn = linkedIn; }

    public String getPortfolio() { return portfolio; }
    public void setPortfolio(String portfolio) { this.portfolio = portfolio; }

    public String getGithub() { return github; }
    public void setGithub(String github) { this.github = github; }

    public Double getAverageRating() { return averageRating; }
    public void setAverageRating(Double averageRating) { this.averageRating = averageRating; }

    public Integer getTotalReviews() { return totalReviews; }
    public void setTotalReviews(Integer totalReviews) { this.totalReviews = totalReviews; }

    public List<ExpertReviewResponse> getReviews() { return reviews; }
    public void setReviews(List<ExpertReviewResponse> reviews) { this.reviews = reviews; }

    public Boolean getIsOnline() { return isOnline; }
    public void setIsOnline(Boolean isOnline) { this.isOnline = isOnline; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Instant getLastSeen() { return lastSeen; }
    public void setLastSeen(Instant lastSeen) { this.lastSeen = lastSeen; }

    public Boolean getIsApproved() { return isApproved; }
    public void setIsApproved(Boolean isApproved) { this.isApproved = isApproved; }

    public Boolean getProfileExists() { return profileExists; }
    public void setProfileExists(Boolean profileExists) { this.profileExists = profileExists; }

    public Boolean getProfileCompleted() { return profileCompleted; }
    public void setProfileCompleted(Boolean profileCompleted) { this.profileCompleted = profileCompleted; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    public Instant getLastRateUpdatedAt() { return lastRateUpdatedAt; }
    public void setLastRateUpdatedAt(Instant lastRateUpdatedAt) { this.lastRateUpdatedAt = lastRateUpdatedAt; }
}
