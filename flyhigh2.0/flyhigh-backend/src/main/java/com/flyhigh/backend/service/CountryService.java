package com.flyhigh.backend.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * Loads the static {@code countries.json} file once on application startup
 * and caches country names in memory.
 *
 * <p>Countries are served directly from the in-memory cache via
 * {@link #getCountryNames()} — they are <b>not</b> stored in MongoDB.
 * {@link DropdownService} merges them into the dropdown catalog response
 * so the frontend sees no difference.</p>
 *
 * <p>This service is fully isolated — it does not depend on
 * DropdownService and does not alter Category, SubCategory, or
 * Languages dropdowns in any way.</p>
 */
@Service
public class CountryService {

    private static final Logger log = LoggerFactory.getLogger(CountryService.class);
    private static final String JSON_PATH = "data/countries.json";

    private final ObjectMapper objectMapper;

    /** Sorted list of country names loaded from countries.json. */
    private final List<String> countryNames = new ArrayList<>();

    public CountryService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    /**
     * Loads countries.json into the in-memory cache at bean initialization
     * time ({@code @PostConstruct}).
     */
    @PostConstruct
    public void init() {
        loadCountryNames();
    }

    /** Returns the complete sorted list of country names (immutable view). */
    public List<String> getCountryNames() {
        return Collections.unmodifiableList(countryNames);
    }

    /** Number of cached countries. */
    public int count() {
        return countryNames.size();
    }

    // ── private helpers ────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private void loadCountryNames() {
        ClassPathResource resource = new ClassPathResource(JSON_PATH);

        if (!resource.exists()) {
            log.error(
                "Countries JSON file not found at classpath:{}. "
                    + "Country dropdown will be empty. "
                    + "Place the file at src/main/resources/{} to resolve this.",
                JSON_PATH, JSON_PATH
            );
            return;
        }

        List<Map<String, Object>> raw;
        try (InputStream in = resource.getInputStream()) {
            raw = objectMapper.readValue(in,
                new TypeReference<List<Map<String, Object>>>() {});
        } catch (IOException e) {
            log.error(
                "Failed to parse countries JSON at classpath:{}. "
                    + "Country dropdown will be empty. Error: {}",
                JSON_PATH, e.getMessage(), e
            );
            return;
        }

        if (raw == null || raw.isEmpty()) {
            log.warn("Countries JSON at classpath:{} is empty. "
                + "Country dropdown will be empty.",
                JSON_PATH);
            return;
        }

        List<String> names = new ArrayList<>();
        for (Map<String, Object> entry : raw) {
            Object nameVal = entry.get("name");
            if (nameVal instanceof String name && !name.isBlank()) {
                names.add(name.trim());
            }
        }

        if (names.isEmpty()) {
            log.warn("No valid country names found in {}.", JSON_PATH);
            return;
        }

        names.sort(String.CASE_INSENSITIVE_ORDER);

        countryNames.clear();
        countryNames.addAll(names);

        log.info("Loaded {} country names from classpath:{} into memory cache.",
            names.size(), JSON_PATH);
    }
}
