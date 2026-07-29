package com.flyhigh.backend.exception;

public class PaymentVerificationException extends RuntimeException {
    public PaymentVerificationException(String message) {
        super(message);
    }

    public PaymentVerificationException(String message, Throwable cause) {
        super(message, cause);
    }
}
