package com.flyhigh.backend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.secretsmanager.SecretsManagerClient;
import software.amazon.awssdk.services.secretsmanager.model.GetSecretValueRequest;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.HashMap;
import java.util.Map;

/**
 * Loads secrets from AWS Secrets Manager at startup and injects them
 * into the Spring Environment before any beans are created.
 *
 * <p>Only activates when SECRET_ARN environment variable is set (production/AWS).
 * In local dev, secrets come from .env / application.properties directly.</p>
 *
 * <p>Registered via META-INF/spring.factories as an EnvironmentPostProcessor.</p>
 */
public class AwsSecretsConfig implements EnvironmentPostProcessor {

    private static final Logger log = LoggerFactory.getLogger(AwsSecretsConfig.class);
    private static final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        String secretArn = environment.getProperty("SECRET_ARN");
        if (secretArn == null || secretArn.isBlank()) {
            log.info("SECRET_ARN not set — skipping Secrets Manager resolution (local dev mode)");
            return;
        }

        String region = environment.getProperty("AWS_REGION", "us-east-1");
        log.info("Loading secrets from Secrets Manager: {} (region: {})", secretArn, region);

        try (SecretsManagerClient client = SecretsManagerClient.builder()
                .region(Region.of(region))
                .credentialsProvider(DefaultCredentialsProvider.create())
                .build()) {

            GetSecretValueRequest request = GetSecretValueRequest.builder()
                    .secretId(secretArn)
                    .build();

            String secretJson = client.getSecretValue(request).secretString();
            @SuppressWarnings("unchecked")
            Map<String, Object> secrets = objectMapper.readValue(secretJson, Map.class);

            Map<String, Object> props = new HashMap<>();
            secrets.forEach((key, value) -> {
                if (value instanceof String s && !s.isBlank()) {
                    props.put(toPropertyName(key), s);
                }
            });

            // Add as highest-priority property source (overrides application.properties defaults)
            environment.getPropertySources()
                    .addFirst(new MapPropertySource("awsSecretsManager", props));

            log.info("Loaded {} secrets from Secrets Manager", props.size());

        } catch (Exception e) {
            log.error("Failed to load secrets from Secrets Manager ({}): {} — "
                    + "application may fail to start if required properties are missing",
                    secretArn, e.getMessage());
        }
    }

    /**
     * Pass through secret keys as-is (UPPER_SNAKE_CASE).
     * application.properties uses ${MONGODB_URI:}, ${JWT_SECRET:}, etc.
     * placeholders that resolve against these property names.
     */
    private String toPropertyName(String key) {
        // Keep the same key name — application.properties placeholders
        // reference the UPPER_SNAKE_CASE form directly
        return key;
    }
}
