package com.flyhigh.backend.seed;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * Runs seed data population automatically on startup when the 'dev' profile is active.
 *
 * Controlled by the property: flyhigh.seed.enabled=true (dev profile only).
 * To skip seeding, set flyhigh.seed.enabled=false in application-dev.yml or
 * pass --flyhigh.seed.enabled=false as a command-line argument.
 */
@Component
@Profile("dev")
public class SeedRunner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(SeedRunner.class);

    private final DevDataSeeder devDataSeeder;

    public SeedRunner(DevDataSeeder devDataSeeder) {
        this.devDataSeeder = devDataSeeder;
    }

    @Override
    public void run(String... args) {
        log.info("=== SEED RUNNER STARTUP [dev profile] ===");
        log.info("Populating development seed data...");

        try {
            devDataSeeder.seedAll();
            log.info("Seed data population complete.");
        } catch (Exception e) {
            log.error("Seed data population failed: {}", e.getMessage(), e);
        }

        log.info("=== SEED RUNNER COMPLETE ===");
    }
}