package com.flyhigh.backend.config;

import com.flyhigh.backend.model.User;
import com.flyhigh.backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;
import java.time.Instant;

/**
 * Admin Account Initializer.
 *
 * Creates the single predefined Admin account on application startup if it does not exist.
 * Admin email and password are configured via environment variables.
 *
 * SECURITY:
 * - Admin password is BCrypt-encoded before storage (never plaintext).
 * - Admin account is created only once (idempotent — skips if already exists).
 * - Admin email can only be set via configuration, never through signup.
 */
@Component
public class AdminInitializer {

    private static final Logger log = LoggerFactory.getLogger(AdminInitializer.class);

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    @Value("${app.admin.email:admin@flyhigh.com}")
    private String adminEmail;

    @Value("${app.admin.password:Admin@123}")
    private String adminPassword;

    public AdminInitializer(UserRepository userRepository, BCryptPasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @PostConstruct
    public void init() {
        String email = adminEmail.toLowerCase().trim();

        // Check if admin already exists
        if (userRepository.existsByEmail(email)) {
            log.info("Admin account already exists: {}", email);
            return;
        }

        // Check that no other admin already exists (prevent duplicates)
        long adminCount = userRepository.countByIsAdminTrue();
        if (adminCount > 0) {
            log.warn("An admin account already exists. Skipping creation of duplicate admin: {}", email);
            return;
        }

        // Create the admin user
        User admin = new User();
        admin.setEmail(email);
        admin.setPassword(passwordEncoder.encode(adminPassword));
        admin.setFirstName("Admin");
        admin.setLastName("User");
        // fullName auto-computed by setters
        admin.setRole("ADMIN");
        admin.setIsAdmin(true);
        admin.setProfileCompleted(true);
        admin.setIsActive(true);
        admin.setEmailVerified(true);
        admin.setAuthProvider("local");
        admin.setCreatedAt(Instant.now());
        admin.setUpdatedAt(Instant.now());

        userRepository.save(admin);
        log.info("AUDIT: Admin account initialized: {} (role=ADMIN, isAdmin=true)", email);
    }
}
