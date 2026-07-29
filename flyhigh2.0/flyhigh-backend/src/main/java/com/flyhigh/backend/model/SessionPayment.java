package com.flyhigh.backend.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "session_payments")
public class SessionPayment {

    @Id
    private String id;

    @Indexed
    private String interactionId; // Link to the Interaction session

    @Indexed
    private String transactionId; // Gateway reference (Razorpay/Stripe payment_id)

    private Double amount;               // Total client-paid amount = expertAmount + commissionAmount
    private Double expertAmount;         // Expert's base earning portion (INR)
    private Double commissionAmount;     // Platform commission portion (INR)
    private Instant chargedAt;

    private PaymentType type; // Enum: INITIAL, EXTENSION

    private String status; // E.g., "SUCCESS", "FAILED"

    private Integer extensionToMinutes; // New targeted length (e.g. 30, 45, 60)
}
