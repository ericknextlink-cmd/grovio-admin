"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthRoutes = void 0;
const express_1 = require("express");
const health_controller_1 = require("../controllers/health.controller");
const error_middleware_1 = require("../middleware/error.middleware");
const router = (0, express_1.Router)();
exports.healthRoutes = router;
const healthController = new health_controller_1.HealthController();
/**
 * @route   GET /api/health
 * @desc    Basic health check
 * @access  Public
 */
router.get('/', (0, error_middleware_1.asyncHandler)(healthController.checkHealth));
/**
 * @route   GET /api/health/detailed
 * @desc    Detailed health check with database connectivity
 * @access  Public
 */
router.get('/detailed', (0, error_middleware_1.asyncHandler)(healthController.checkDetailedHealth));
