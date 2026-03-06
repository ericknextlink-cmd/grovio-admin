"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminVoucherRoutes = void 0;
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const validation_middleware_1 = require("../middleware/validation.middleware");
const adminAuth_middleware_1 = require("../middleware/adminAuth.middleware");
const adminVoucherController = __importStar(require("../controllers/admin-voucher.controller"));
const router = (0, express_1.Router)();
exports.adminVoucherRoutes = router;
router.use(adminAuth_middleware_1.authenticateAdmin);
const createVoucherValidation = [
    (0, express_validator_1.body)('code').trim().notEmpty().isLength({ max: 50 }),
    (0, express_validator_1.body)('discount_type').isIn(['percentage', 'fixed']),
    (0, express_validator_1.body)('discount_value').isFloat({ min: 0.01 }),
    (0, express_validator_1.body)('description').optional().trim().isLength({ max: 500 }),
    (0, express_validator_1.body)('image_type').optional().isIn(['regular', 'nss']),
    (0, express_validator_1.body)('min_order_amount').optional().isFloat({ min: 0 }),
    (0, express_validator_1.body)('valid_until').optional().isISO8601(),
    (0, express_validator_1.body)('max_uses').optional().isInt({ min: 1 }),
    validation_middleware_1.handleValidationErrors,
];
const assignVoucherValidation = [
    (0, express_validator_1.body)('userId').trim().notEmpty(),
    (0, express_validator_1.body)('voucherId').trim().notEmpty().isUUID(),
    validation_middleware_1.handleValidationErrors,
];
router.get('/', adminVoucherController.listVouchers);
router.post('/', createVoucherValidation, adminVoucherController.createVoucher);
router.post('/assign', assignVoucherValidation, adminVoucherController.assignVoucher);
router.get('/users', adminVoucherController.listUsersForAssign);
router.get('/:id/preview-image', [(0, express_validator_1.param)('id').isUUID()], validation_middleware_1.handleValidationErrors, adminVoucherController.previewVoucherImage);
