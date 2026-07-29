package com.flyhigh.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Request DTO for updating a user's own profile.
 * All fields optional except firstName and lastName (required).
 */
public class UpdateProfileRequest {

    @NotBlank(message = "First name is required")
    @Size(min = 2, max = 50, message = "First name must be 2-50 characters")
    private String firstName;

    @NotBlank(message = "Last name is required")
    @Size(min = 2, max = 50, message = "Last name must be 2-50 characters")
    private String lastName;

    @Pattern(regexp = "^[+]?[0-9]{7,15}$", message = "Phone number must be 7-15 digits, optionally starting with +")
    private String phoneNumber;

    @Size(max = 100, message = "City must be less than 100 characters")
    private String city;

    @Size(max = 100, message = "State must be less than 100 characters")
    private String state;

    @Size(max = 100, message = "Country must be less than 100 characters")
    private String country;

    @Size(max = 500, message = "Address must be less than 500 characters")
    private String address;

    @Pattern(regexp = "^[A-Za-z0-9\\- ]{0,10}$", message = "Postal code must be alphanumeric, max 10 characters")
    private String postalCode;

    @Size(max = 500, message = "Profile image URL must be less than 500 characters")
    private String profileImage;

    public UpdateProfileRequest() {}

    // ── Getters & Setters ──

    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }

    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }

    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }

    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }

    public String getState() { return state; }
    public void setState(String state) { this.state = state; }

    public String getCountry() { return country; }
    public void setCountry(String country) { this.country = country; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getPostalCode() { return postalCode; }
    public void setPostalCode(String postalCode) { this.postalCode = postalCode; }

    public String getProfileImage() { return profileImage; }
    public void setProfileImage(String profileImage) { this.profileImage = profileImage; }
}
