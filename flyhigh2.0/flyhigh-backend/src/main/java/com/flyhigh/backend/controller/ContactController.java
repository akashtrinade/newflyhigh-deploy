package com.flyhigh.backend.controller;

import com.flyhigh.backend.dto.ContactRequest;
import com.flyhigh.backend.dto.MessageResponse;
import com.flyhigh.backend.service.EmailService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Public contact form — no authentication required.
 * Accepts name, email, subject, and message from the /contact page
 * and forwards them to the FlyHigh support inbox.
 */
@RestController
@RequestMapping("/api/contact")
public class ContactController {

    private static final Logger log = LoggerFactory.getLogger(ContactController.class);

    private final EmailService emailService;

    public ContactController(EmailService emailService) {
        this.emailService = emailService;
    }

    @PostMapping("/send")
    public ResponseEntity<MessageResponse> sendMessage(@Valid @RequestBody ContactRequest request) {
        log.info("Contact form submission: name={} email={} subject={}",
                request.getName(), request.getEmail(), request.getSubject());

        emailService.sendContactFormEmail(
                request.getName(),
                request.getEmail(),
                request.getSubject(),
                request.getMessage()
        );

        return ResponseEntity.ok(new MessageResponse(true,
                "Message sent successfully! We'll get back to you within 24 hours."));
    }
}
