"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApiError = exports.asyncHandler = exports.errorHandler = void 0;
/**
 * Global error handler middleware
 */
const errorHandler = (error, req, res, _next // Express requires 4-arg signature for error middleware
) => {
    let { statusCode = 500, message } = error;
    // Handle specific error types
    if (error.name === 'ValidationError') {
        statusCode = 400;
        message = 'Validation Error';
    }
    else if (error.name === 'CastError') {
        statusCode = 400;
        message = 'Invalid data format';
    }
    else if (error.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token';
    }
    else if (error.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired';
    }
    // Log error for debugging
    console.error(`Error ${statusCode}: ${message}`);
    console.error(error.stack);
    // Don't expose sensitive error details in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    res.status(statusCode).json({
        success: false,
        message: isDevelopment ? message : 'Something went wrong',
        ...(isDevelopment && {
            error: error.message,
            stack: error.stack
        })
    });
};
exports.errorHandler = errorHandler;
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
/**
 * Create custom API error
 */
const createApiError = (message, statusCode = 500) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.isOperational = true;
    return error;
};
exports.createApiError = createApiError;
