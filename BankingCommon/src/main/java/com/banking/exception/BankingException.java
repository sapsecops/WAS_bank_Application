package com.banking.exception;

public class BankingException extends Exception {

    private static final long serialVersionUID = 1L;

    public enum ErrorCode {
        ACCOUNT_NOT_FOUND,
        CUSTOMER_NOT_FOUND,
        INSUFFICIENT_FUNDS,
        ACCOUNT_INACTIVE,
        INVALID_AMOUNT,
        DUPLICATE_CUSTOMER,
        TRANSACTION_FAILED,
        UNAUTHORIZED,
        SYSTEM_ERROR
    }

    private final ErrorCode errorCode;

    public BankingException(ErrorCode errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }

    public BankingException(ErrorCode errorCode, String message, Throwable cause) {
        super(message, cause);
        this.errorCode = errorCode;
    }

    public ErrorCode getErrorCode() {
        return errorCode;
    }

    @Override
    public String toString() {
        return "BankingException{code=" + errorCode + ", message=" + getMessage() + "}";
    }
}
