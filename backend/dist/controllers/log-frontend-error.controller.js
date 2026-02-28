"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logFrontendError = logFrontendError;
/**
 * Logs frontend errors to server logs so developers can see them on the deployed platform.
 * No auth required; payload is logged and discarded.
 */
function logFrontendError(req, res) {
    const body = req.body;
    const message = body?.message ?? 'Unknown';
    const name = body?.name ?? 'Error';
    const url = body?.url ?? '';
    const timestamp = body?.timestamp ?? new Date().toISOString();
    // Single line for log aggregation; full details for debugging
    console.error(`[FRONTEND_ERROR] ${timestamp} | ${name}: ${message} | url=${url}`);
    if (body?.stack) {
        console.error('[FRONTEND_ERROR] stack:', body.stack);
    }
    if (body?.componentStack) {
        console.error('[FRONTEND_ERROR] componentStack:', body.componentStack);
    }
    if (body?.userAgent) {
        console.error('[FRONTEND_ERROR] userAgent:', body.userAgent);
    }
    res.status(204).send();
}
