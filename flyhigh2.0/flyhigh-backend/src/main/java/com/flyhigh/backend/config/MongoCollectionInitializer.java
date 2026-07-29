package com.flyhigh.backend.config;

import com.flyhigh.backend.service.DropdownService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.core.MongoTemplate;

import java.util.List;
import java.util.Set;

@Configuration
public class MongoCollectionInitializer {

    /**
     * Creates all required MongoDB collections at startup if they don't already exist.
     * This ensures collections are visible in MongoDB Compass immediately.
     */
    @Bean
    CommandLineRunner initCollections(MongoTemplate mongoTemplate, DropdownService dropdownService) {
        return args -> {
            List<String> requiredCollections = List.of(
                    "users",
                    "expert_profiles",
                    "dropdown_definitions",
                    "interactions",
                    "session_payments",
                    "payouts",
                    "otp_records"
            );

            Set<String> existingCollections = mongoTemplate.getCollectionNames();

            for (String collection : requiredCollections) {
                if (!existingCollections.contains(collection)) {
                    mongoTemplate.createCollection(collection);
                    System.out.println("Created MongoDB collection: " + collection);
                } else {
                    System.out.println("MongoDB collection already exists: " + collection);
                }
            }

            dropdownService.ensureDefaults();
        };
    }
}

