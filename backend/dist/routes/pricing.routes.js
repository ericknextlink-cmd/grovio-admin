"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pricingRoutes = void 0;
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const pricing_controller_1 = require("../controllers/pricing.controller");
const adminAuth_middleware_1 = require("../middleware/adminAuth.middleware");
const validation_middleware_1 = require("../middleware/validation.middleware");
const router = (0, express_1.Router)();
exports.pricingRoutes = router;
const pricingController = new pricing_controller_1.PricingController();
const applyPricingValidation = [
    (0, express_validator_1.body)('ranges')
        .isArray()
        .withMessage('ranges must be an array'),
    (0, express_validator_1.body)('ranges.*.min_value')
        .isFloat({ min: 0 })
        .withMessage('min_value must be a non-negative number'),
    (0, express_validator_1.body)('ranges.*.max_value')
        .isFloat({ min: 0 })
        .withMessage('max_value must be a non-negative number'),
    (0, express_validator_1.body)('ranges.*.percentage')
        .isFloat({ min: 0 })
        .withMessage('percentage must be a non-negative number'),
    validation_middleware_1.handleValidationErrors
];
const applyBundleMarkupValidation = [
    (0, express_validator_1.body)('percentage')
        .isFloat({ min: 0 })
        .withMessage('percentage must be a non-negative number'),
    validation_middleware_1.handleValidationErrors
];
router.use(adminAuth_middleware_1.authenticateAdmin);
router.get('/ranges', pricingController.getRanges);
router.post('/apply', applyPricingValidation, pricingController.applyPricing);
router.post('/apply-discounts', applyPricingValidation, pricingController.applyDiscounts);
router.post('/apply-bundle-markup', applyBundleMarkupValidation, pricingController.applyBundleMarkup);
