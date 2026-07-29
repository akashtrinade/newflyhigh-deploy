package com.flyhigh.backend.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public class ExpertProfileRequest {

    @NotBlank(message = "First name is required")
    private String firstName;

    @NotBlank(message = "Last name is required")
    private String lastName;

    @NotBlank(message = "Country is required")
    private String country;

    @NotBlank(message = "Professional title is required")
    private String professionalTitle;

    @NotBlank(message = "Category is required")
    private String category;

    @NotBlank(message = "Sub category is required")
    private String subCategory;

    @NotNull(message = "Years of experience is required")
    @Min(value = 0, message = "Experience cannot be negative")
    private Integer yearsOfExperience;

    @NotBlank(message = "Bio is required")
    private String bio;

    @NotNull(message = "Hourly rate is required")
    @DecimalMin(value = "0.01", message = "Hourly rate must be greater than 0")
    private Double hourlyRate;

    @NotBlank(message = "Phone number is required")
    private String phoneNumber;

    @NotEmpty(message = "Select at least one language")
    private List<String> languages;

    // Optional fields
    private String city;
    private String linkedIn;
    private String portfolio;
    private String github;

    public ExpertProfileRequest() {}

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

    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }

    public List<String> getLanguages() { return languages; }
    public void setLanguages(List<String> languages) { this.languages = languages; }

    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }

    public String getLinkedIn() { return linkedIn; }
    public void setLinkedIn(String linkedIn) { this.linkedIn = linkedIn; }

    public String getPortfolio() { return portfolio; }
    public void setPortfolio(String portfolio) { this.portfolio = portfolio; }

    public String getGithub() { return github; }
    public void setGithub(String github) { this.github = github; }

    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }

    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }

    public String getCountry() { return country; }
    public void setCountry(String country) { this.country = country; }
}
