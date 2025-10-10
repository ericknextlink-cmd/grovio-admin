"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardRoutes = void 0;
const express_1 = require("express");
const dashboard_controller_1 = require("../controllers/dashboard.controller");
const adminAuth_middleware_1 = require("../middleware/adminAuth.middleware");
const express_validator_1 = require("express-validator");
const validation_middleware_1 = require("../middleware/validation.middleware");
const router = (0, express_1.Router)();
exports.dashboardRoutes = router;
const dashboardController = new dashboard_controller_1.DashboardController();
// Validation rules
const getRecentActivitiesValidation = [
    (0, express_validator_1.query)('limit')
        .optional()
        .isInt({ min: 1, max: 50 })
        .withMessage('Limit must be between 1 and 50'),
    validation_middleware_1.handleValidationErrors
];
const getSalesAnalyticsValidation = [
    (0, express_validator_1.query)('period')
        .optional()
        .isInt({ min: 1, max: 365 })
        .withMessage('Period must be between 1 and 365 days'),
    validation_middleware_1.handleValidationErrors
];
const getLowStockAlertsValidation = [
    (0, express_validator_1.query)('threshold')
        .optional()
        .isInt({ min: 0, max: 100 })
        .withMessage('Threshold must be between 0 and 100'),
    validation_middleware_1.handleValidationErrors
];
// All dashboard routes require admin authentication
router.use(adminAuth_middleware_1.authenticateAdmin);
router.get('/stats', dashboardController.getDashboardStats);
router.get('/activities', getRecentActivitiesValidation, dashboardController.getRecentActivities);
router.get('/analytics', getSalesAnalyticsValidation, dashboardController.getSalesAnalytics);
router.get('/alerts', getLowStockAlertsValidation, dashboardController.getLowStockAlerts);
