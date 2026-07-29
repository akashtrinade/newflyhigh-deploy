package com.flyhigh.backend.exception;

public class InvalidSessionStateException extends RuntimeException {
    public InvalidSessionStateException(String message) {
        super(message);
    }
}
