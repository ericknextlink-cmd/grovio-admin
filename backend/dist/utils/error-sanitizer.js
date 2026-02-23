"use strict";
/**
 * Error Sanitization Utility
 * Never expose internal errors, database structure, or sensitive information to users
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorMessages = void 0;
exports.sanitizeDatabaseError = sanitizeDatabaseError;
exports.sanitizeAuthError = sanitizeAuthError;
exports.sanitizeApiError = sanitizeApiError;
exports.sanitizeError = sanitizeError;
function sanitizeDatabaseError(error) {
    if (!error)
        return 'An unexpected error occurred';
    const e = error;
    const errorMessage = e.message ?? String(error);
    const errorCode = e.code ?? '';
    // Map known database errors to user-friendly messages
    if (errorCode === '23505' || errorMessage.includes('duplicate key')) {
        // Unique constraint violation
        if (errorMessage.includes('email'))
            return 'This email is already registered';
        if (errorMessage.includes('phone_number'))
            return 'This phone number is already registered';
        if (errorMessage.includes('order_id'))
            return 'Order ID already exists';
        if (errorMessage.includes('invoice_number'))
            return 'Invoice number already exists';
        if (errorMessage.includes('username'))
            return 'This username is already taken';
        return 'This record already exists';
    }
    if (errorCode === '23503' || errorMessage.includes('foreign key')) {
        // Foreign key constraint violation
        if (errorMessage.includes('users_id_fkey')) {
            return 'Unable to create user account. Please try again or contact support.';
        }
        if (errorMessage.includes('order') || errorMessage.includes('product')) {
            return 'Invalid reference. Please refresh and try again.';
        }
        return 'Data integrity error. Please try again.';
    }
    if (errorCode === '23514' || errorMessage.includes('check constraint')) {
        // Check constraint violation
        return 'Invalid data provided. Please check your input and try again.';
    }
    if (errorMessage.includes('violates row-level security')) {
        return 'Permission denied. Please try again or contact support.';
    }
    if (errorMessage.includes('null value') || errorMessage.includes('NOT NULL')) {
        return 'Required information is missing. Please complete all fields.';
    }
    // Generic error message - never expose actual DB error
    return 'An error occurred while processing your request. Please try again.';
}
/**
 * Sanitize Supabase Auth errors
 */
function sanitizeAuthError(error) {
    if (!error)
        return 'An unexpected error occurred';
    const e = error;
    const errorMessage = e.message ?? String(error);
    // Map common Supabase Auth errors
    if (errorMessage.includes('already registered') || errorMessage.includes('already exists')) {
        return 'This account already exists. Try signing in instead.';
    }
    if (errorMessage.includes('Invalid login credentials') || errorMessage.includes('wrong password')) {
        return 'Invalid email or password';
    }
    if (errorMessage.includes('Email not confirmed')) {
        return 'Please verify your email address before signing in';
    }
    if (errorMessage.includes('User already registered')) {
        return 'An account with this email already exists';
    }
    if (errorMessage.includes('Token has expired')) {
        return 'This link has expired. Please request a new one.';
    }
    if (errorMessage.includes('Token invalid')) {
        return 'This verification link is invalid. Please request a new one.';
    }
    if (errorMessage.includes('weak_password') || errorMessage.includes('Password should be')) {
        return 'Password is too weak. Please choose a stronger password.';
    }
    if (errorMessage.includes('invalid email')) {
        return 'Please enter a valid email address';
    }
    // Generic error - never expose actual error message
    return 'An authentication error occurred. Please try again.';
}
/**
 * Sanitize API errors (for external services)
 */
function sanitizeApiError(error) {
    if (!error)
        return 'An unexpected error occurred';
    const e = error;
    const errorMessage = e.message ?? String(error);
    if (errorMessage.includes('network') || errorMessage.includes('ECONNREFUSED') || errorMessage.includes('timeout')) {
        return 'Connection error. Please check your internet connection and try again.';
    }
    if (errorMessage.includes('500') || errorMessage.includes('Internal Server Error')) {
        return 'Service temporarily unavailable. Please try again later.';
    }
    if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
        return 'You do not have permission to perform this action.';
    }
    if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        return 'Your session has expired. Please sign in again.';
    }
    if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
        return 'The requested resource was not found.';
    }
    // Generic error
    return 'An error occurred while processing your request. Please try again.';
}
/**
 * Sanitize any error - tries all sanitizers
 */
function sanitizeError(error) {
    if (!error)
        return 'An unexpected error occurred';
    // Try database error first
    const dbError = sanitizeDatabaseError(error);
    if (dbError !== 'An unexpected error occurred')
        return dbError;
    // Try auth error
    const authError = sanitizeAuthError(error);
    if (authError !== 'An unexpected error occurred')
        return authError;
    // Try API error
    const apiError = sanitizeApiError(error);
    if (apiError !== 'An unexpected error occurred')
        return apiError;
    // Default fallback
    return 'An error occurred while processing your request. Please try again.';
}
/**
 * Common error messages
 */
exports.ErrorMessages = {
    VALIDATION_FAILED: 'Please check your input and try again.',
    NOT_FOUND: 'The requested resource was not found.',
    UNAUTHORIZED: 'You are not authorized to perform this action.',
    FORBIDDEN: 'You do not have permission to access this resource.',
    INTERNAL_ERROR: 'An internal error occurred. Please try again later.',
    DATABASE_ERROR: 'An error occurred while saving your data. Please try again.',
    NETWORK_ERROR: 'Connection error. Please check your internet connection.',
    TIMEOUT: 'Request timed out. Please try again.',
    RATE_LIMITED: 'Too many requests. Please try again later.',
    INVALID_INPUT: 'Invalid data provided. Please check your input.',
    MISSING_REQUIRED: 'Required information is missing. Please complete all fields.'
};
