"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deliveryRoutes = void 0;
const express_1 = require("express");
const delivery_controller_1 = require("../controllers/delivery.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const adminAuth_middleware_1 = require("../middleware/adminAuth.middleware");
const express_validator_1 = require("express-validator");
const validation_middleware_1 = require("../middleware/validation.middleware");
const router = (0, express_1.Router)();
const controller = new delivery_controller_1.DeliveryController();
// Public (authenticated user) - calculate delivery fee for checkout
router.get('/calculate', auth_middleware_1.authenticateToken, [
    (0, express_validator_1.query)('lat').isFloat({ min: -90, max: 90 }).withMessage('Valid lat required'),
    (0, express_validator_1.query)('lng').isFloat({ min: -180, max: 180 }).withMessage('Valid lng required'),
], validation_middleware_1.handleValidationErrors, controller.calculate);
// Admin - get/update delivery settings
router.get('/settings', adminAuth_middleware_1.authenticateAdmin, controller.getSettings);
router.put('/settings', adminAuth_middleware_1.authenticateAdmin, controller.updateSettings);
exports.deliveryRoutes = router;
