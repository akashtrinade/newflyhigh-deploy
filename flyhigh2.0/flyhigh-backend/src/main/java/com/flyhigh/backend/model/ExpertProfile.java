package com.flyhigh.backend.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * ExpertProfile — completed by expert AFTER signup + email verification.
 * Profile completion is mandatory before accessing the expert dashboard.
 *
 * REQUIRED fields: professionalTitle, category, yearsOfExperience, bio,
 * hourlyRate, phoneNumber
 * OPTIONAL fields: languages, linkedIn, portfolio, github
 */
@Document(collection = "expert_profiles")
public class ExpertProfile {

    @Id
    private String id;

    @Indexed(unique = true)
    private String userId; // Links to User.id

    // Required fields
    private String country;
    private String professionalTitle;
    private String category;
    private String subCategory;
    private Integer yearsOfExperience;
    private String bio;
    private Double hourlyRate;
    private String phoneNumber;

    // Optional fields
    private String city;
    private String languages;
    private String linkedIn;
    private String portfolio;
    private String github;

    // Payout details (expert withdrawal)
    private String payoutAccountHolderName;
    private String payoutAccountNumber;
    private String payoutIfsc;
    private String payoutUpiId;

    // ── RazorpayX gateway linkage + bank verification state ──
    private String payoutContactId;        // RazorpayX contact id (cont_...)
    private String payoutFundAccountId;    // RazorpayX fund account id (fa_...)
    private String payoutValidationId;     // RazorpayX composite validation txn id
    private String payoutVerificationStatus; // null | PENDING | VERIFIED | FAILED
    private String payoutVerificationNote;   // registered name / failure details

    private Boolean isOnline = false;
    private Boolean isApproved = false;

    // Rating
    private Double averageRating = 0.0;
    private Integer totalReviews = 0;

    private Instant createdAt;
    private Instant updatedAt;
    private Instant lastActivityAt;
    private Instant lastRateUpdatedAt;

    // --- Seed metadata ---
    private Boolean isSeedData = false;
    private String seedSource;

    public ExpertProfile() {
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getProfessionalTitle() {
        return professionalTitle;
    }

    public void setProfessionalTitle(String professionalTitle) {
        this.professionalTitle = professionalTitle;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getSubCategory() {
        return subCategory;
    }

    public void setSubCategory(String subCategory) {
        this.subCategory = subCategory;
    }

    public String getCountry() {
        return country;
    }

    public void setCountry(String country) {
        this.country = country;
    }

    public Integer getYearsOfExperience() {
        return yearsOfExperience;
    }

    public void setYearsOfExperience(Integer yearsOfExperience) {
        this.yearsOfExperience = yearsOfExperience;
    }

    public String getBio() {
        return bio;
    }

    public void setBio(String bio) {
        this.bio = bio;
    }

    public Double getHourlyRate() {
        return hourlyRate;
    }

    public void setHourlyRate(Double hourlyRate) {
        this.hourlyRate = hourlyRate;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

    public String getCity() {
        return city;
    }

    public void setCity(String city) {
        this.city = city;
    }

    public String getLanguages() {
        return languages;
    }

    public void setLanguages(String languages) {
        this.languages = languages;
    }

    public String getLinkedIn() {
        return linkedIn;
    }

    public void setLinkedIn(String linkedIn) {
        this.linkedIn = linkedIn;
    }

    public String getPortfolio() {
        return portfolio;
    }

    public void setPortfolio(String portfolio) {
        this.portfolio = portfolio;
    }

    public String getGithub() {
        return github;
    }

    public void setGithub(String github) {
        this.github = github;
    }

    public String getPayoutAccountHolderName() {
        return payoutAccountHolderName;
    }

    public void setPayoutAccountHolderName(String payoutAccountHolderName) {
        this.payoutAccountHolderName = payoutAccountHolderName;
    }

    public String getPayoutAccountNumber() {
        return payoutAccountNumber;
    }

    public void setPayoutAccountNumber(String payoutAccountNumber) {
        this.payoutAccountNumber = payoutAccountNumber;
    }

    public String getPayoutIfsc() {
        return payoutIfsc;
    }

    public void setPayoutIfsc(String payoutIfsc) {
        this.payoutIfsc = payoutIfsc;
    }

    public String getPayoutUpiId() {
        return payoutUpiId;
    }

    public void setPayoutUpiId(String payoutUpiId) {
        this.payoutUpiId = payoutUpiId;
    }

    public String getPayoutContactId() {
        return payoutContactId;
    }

    public void setPayoutContactId(String payoutContactId) {
        this.payoutContactId = payoutContactId;
    }

    public String getPayoutFundAccountId() {
        return payoutFundAccountId;
    }

    public void setPayoutFundAccountId(String payoutFundAccountId) {
        this.payoutFundAccountId = payoutFundAccountId;
    }

    public String getPayoutValidationId() {
        return payoutValidationId;
    }

    public void setPayoutValidationId(String payoutValidationId) {
        this.payoutValidationId = payoutValidationId;
    }

    public String getPayoutVerificationStatus() {
        return payoutVerificationStatus;
    }

    public void setPayoutVerificationStatus(String payoutVerificationStatus) {
        this.payoutVerificationStatus = payoutVerificationStatus;
    }

    public String getPayoutVerificationNote() {
        return payoutVerificationNote;
    }

    public void setPayoutVerificationNote(String payoutVerificationNote) {
        this.payoutVerificationNote = payoutVerificationNote;
    }

    public Boolean getIsOnline() {
        return isOnline;
    }

    public void setIsOnline(Boolean isOnline) {
        this.isOnline = isOnline;
    }

    public Boolean getIsApproved() {
        return isApproved;
    }

    public void setIsApproved(Boolean isApproved) {
        this.isApproved = isApproved;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    public Instant getLastActivityAt() {
        return lastActivityAt;
    }

    public void setLastActivityAt(Instant lastActivityAt) {
        this.lastActivityAt = lastActivityAt;
    }

    public Instant getLastRateUpdatedAt() {
        return lastRateUpdatedAt;
    }

    public void setLastRateUpdatedAt(Instant lastRateUpdatedAt) {
        this.lastRateUpdatedAt = lastRateUpdatedAt;
    }

    public Double getAverageRating() {
        return averageRating;
    }

    public void setAverageRating(Double averageRating) {
        this.averageRating = averageRating;
    }

    public Integer getTotalReviews() {
        return totalReviews;
    }

    public void setTotalReviews(Integer totalReviews) {
        this.totalReviews = totalReviews;
    }

    public Boolean getIsSeedData() {
        return isSeedData;
    }

    public void setIsSeedData(Boolean isSeedData) {
        this.isSeedData = isSeedData;
    }

    public String getSeedSource() {
        return seedSource;
    }

    public void setSeedSource(String seedSource) {
        this.seedSource = seedSource;
    }
}