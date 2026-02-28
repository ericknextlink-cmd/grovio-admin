"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logFrontendErrorRoutes = void 0;
const express_1 = require("express");
const log_frontend_error_controller_1 = require("../controllers/log-frontend-error.controller");
const router = (0, express_1.Router)();
exports.logFrontendErrorRoutes = router;
/**
 * POST /api/log-frontend-error
 * Body: { message?, name?, stack?, componentStack?, userAgent?, url?, timestamp? }
 * Responds 204. Logs to server stdout for platform logs.
 */
router.post('/', log_frontend_error_controller_1.logFrontendError);
