"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeErrorMessage = safeErrorMessage;
/**
 * Use when returning error messages in API responses.
 * In production, returns a generic message to avoid leaking internal details.
 */
function safeErrorMessage(detail, generic = 'An error occurred') {
    return process.env.NODE_ENV === 'development' ? detail : generic;
}
