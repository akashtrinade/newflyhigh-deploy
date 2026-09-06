package com.flyhigh.backend.exception;

/**
 * Raised when a RazorpayX (payouts) API call fails.
 * Carries enough information for the retry policy to decide whether
 * another attempt makes sense (5xx/network) or not (4xx validation errors).
 */
public class RazorpayXException extends RuntimeException {

    /** HTTP status from RazorpayX, or -1 for network/timeout failures. */
    private final int httpStatus;

    /** RazorpayX error code (error.code), when present. */
    private final String errorCode;

    /** true for 5xx, timeouts, and network failures — safe to retry. */
    private final boolean retryable;

    /** true when the API returned 404 (used by contact fetch/create races). */
    private final boolean notFound;

    public RazorpayXException(int httpStatus, String errorCode, String message,
                              boolean retryable, boolean notFound) {
        super(truncate(message));
        this.httpStatus = httpStatus;
        this.errorCode = errorCode;
        this.retryable = retryable;
        this.notFound = notFound;
    }

    public static RazorpayXException http(int status, String errorCode, String message) {
        boolean retryable = status >= 500;
        return new RazorpayXException(status, errorCode, message, retryable, status == 404);
    }

    public static RazorpayXException network(String message) {
        return new RazorpayXException(-1, null, message, true, false);
    }

    public int getHttpStatus() {
        return httpStatus;
    }

    public String getErrorCode() {
        return errorCode;
    }

    public boolean isRetryable() {
        return retryable;
    }

    public boolean isNotFound() {
        return notFound;
    }

    /** Never leak gateway payloads into UI messages — cap at a sane length. */
    private static String truncate(String message) {
        if (message == null || message.isBlank()) return "RazorpayX request failed";
        return message.length() <= 200 ? message : message.substring(0, 200);
    }
}
