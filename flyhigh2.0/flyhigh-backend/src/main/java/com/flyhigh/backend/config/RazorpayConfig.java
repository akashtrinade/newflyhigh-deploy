package com.flyhigh.backend.config;

import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RazorpayConfig {

    private static final Logger log = LoggerFactory.getLogger(RazorpayConfig.class);

    @Value("${razorpay.key.id}")
    private String keyId;

    @Value("${razorpay.key.secret}")
    private String keySecret;

    @Bean
    public RazorpayClient razorpayClient() {
        if (keyId == null || keyId.isBlank() || keySecret == null || keySecret.isBlank()) {
            log.warn("Razorpay keys not configured — payment features will be unavailable");
            return null;
        }
        try {
            String maskedKey = keyId.length() > 8 ? keyId.substring(0, 8) + "..." : "***";
            log.info("Initializing RazorpayClient with key id: {}", maskedKey);
            return new RazorpayClient(keyId, keySecret);
        } catch (RazorpayException e) {
            log.error("Failed to initialize Razorpay client: {}. Payment features disabled.", e.getMessage());
            return null;
        }
    }
}
