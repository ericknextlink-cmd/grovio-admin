"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contactRoutes = void 0;
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const contact_controller_1 = require("../controllers/contact.controller");
const error_middleware_1 = require("../middleware/error.middleware");
const validation_middleware_1 = require("../middleware/validation.middleware");
const router = (0, express_1.Router)();
exports.contactRoutes = router;
router.post('/', [
    (0, express_validator_1.body)('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 255 }),
    (0, express_validator_1.body)('email').trim().notEmpty().withMessage('Email is required').isEmail().normalizeEmail(),
    (0, express_validator_1.body)('phone').optional().trim().isLength({ max: 50 }),
    (0, express_validator_1.body)('message').trim().notEmpty().withMessage('Message is required').isLength({ max: 10000 }),
], validation_middleware_1.handleValidationErrors, (0, error_middleware_1.asyncHandler)(contact_controller_1.submitContact));
