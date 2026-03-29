"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderRoutes = void 0;
const express_1 = require("express");
const order_controller_1 = require("../controllers/order.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const adminAuth_middleware_1 = require("../middleware/adminAuth.middleware");
const express_validator_1 = require("express-validator");
const validation_middleware_1 = require("../middleware/validation.middleware");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const router = (0, express_1.Router)();
exports.orderRoutes = router;
const orderController = new order_controller_1.OrderController();
// Validation rules
const createOrderValidation = [
    (0, express_validator_1.body)('cartItems')
        .isArray({ min: 1 })
        .withMessage('Cart items are required and must be a non-empty array'),
    (0, express_validator_1.body)('cartItems.*.productId')
        .isUUID()
        .withMessage('Each cart item must have a valid product ID'),
    (0, express_validator_1.body)('cartItems.*.quantity')
        .isInt({ min: 1 })
        .withMessage('Quantity must be at least 1'),
    (0, express_validator_1.body)('deliveryAddress')
        .isObject()
        .withMessage('Delivery address is required'),
    (0, express_validator_1.body)('deliveryAddress.street')
        .trim()
        .notEmpty()
        .withMessage('Street address is required'),
    (0, express_validator_1.body)('deliveryAddress.city')
        .trim()
        .notEmpty()
        .withMessage('City is required'),
    (0, express_validator_1.body)('deliveryAddress.region')
        .trim()
        .notEmpty()
        .withMessage('Region is required'),
    (0, express_validator_1.body)('deliveryAddress.phone')
        .matches(/^\+?[1-9]\d{1,14}$/)
        .withMessage('Valid phone number is required'),
    (0, express_validator_1.body)('discount')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Discount must be a positive number'),
    (0, express_validator_1.body)('credits')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Credits must be a positive number'),
    (0, express_validator_1.body)('deliveryNotes')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Delivery notes must not exceed 500 characters'),
    (0, express_validator_1.body)('voucherCode')
        .optional()
        .trim()
        .isLength({ max: 50 })
        .withMessage('Voucher code must not exceed 50 characters'),
    validation_middleware_1.handleValidationErrors,
];
const verifyPaymentValidation = [
    (0, express_validator_1.body)('reference')
        .trim()
        .notEmpty()
        .withMessage('Payment reference is required'),
    validation_middleware_1.handleValidationErrors,
];
const updateStatusValidation = [
    (0, express_validator_1.param)('id')
        .isUUID()
        .withMessage('Order ID must be a valid UUID'),
    (0, express_validator_1.body)('status')
        .isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'failed'])
        .withMessage('Invalid status value'),
    (0, express_validator_1.body)('reason')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Reason must not exceed 500 characters'),
    validation_middleware_1.handleValidationErrors,
];
const orderIdValidation = [
    (0, express_validator_1.param)('id')
        .isUUID()
        .withMessage('Order ID must be a valid UUID'),
    validation_middleware_1.handleValidationErrors,
];
const orderNumberValidation = [
    (0, express_validator_1.param)('orderNumber')
        .matches(/^ORD-[A-Z0-9]{4}-[A-Z0-9]{4}$/)
        .withMessage('Invalid order number format'),
    validation_middleware_1.handleValidationErrors,
];
const pendingOrderValidation = [
    (0, express_validator_1.param)('pendingOrderId')
        .isUUID()
        .withMessage('Pending order ID must be a valid UUID'),
    validation_middleware_1.handleValidationErrors,
];
const getUserOrdersValidation = [
    (0, express_validator_1.query)('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
    (0, express_validator_1.query)('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    (0, express_validator_1.query)('status')
        .optional()
        .isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'failed'])
        .withMessage('Invalid status filter'),
    validation_middleware_1.handleValidationErrors,
];
const checkPaymentStatusValidation = [
    (0, express_validator_1.query)('reference')
        .trim()
        .notEmpty()
        .withMessage('Payment reference is required'),
    validation_middleware_1.handleValidationErrors,
];
const verifyDeliveryCodeValidation = [
    (0, express_validator_1.body)('code')
        .optional()
        .isLength({ min: 4, max: 4 })
        .withMessage('Delivery code must be exactly 4 digits')
        .matches(/^\d{4}$/)
        .withMessage('Delivery code must be exactly 4 digits'),
    (0, express_validator_1.query)('code')
        .optional()
        .isLength({ min: 4, max: 4 })
        .withMessage('Delivery code must be exactly 4 digits')
        .matches(/^\d{4}$/)
        .withMessage('Delivery code must be exactly 4 digits'),
    validation_middleware_1.handleValidationErrors,
];
const verifyDeliveryTokenValidation = [
    (0, express_validator_1.body)('token')
        .optional()
        .trim()
        .isLength({ min: 12, max: 512 })
        .withMessage('Verification token format is invalid'),
    (0, express_validator_1.query)('token')
        .optional()
        .trim()
        .isLength({ min: 12, max: 512 })
        .withMessage('Verification token format is invalid'),
    validation_middleware_1.handleValidationErrors,
];
const deliveryVerifyCodeLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 15,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many delivery verification attempts. Please try again later.',
    skipSuccessfulRequests: true,
});
const deliveryVerifyTokenLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 40,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many delivery verification attempts. Please try again later.',
    skipSuccessfulRequests: true,
});
// Public routes
/**
 * @route   POST /api/webhook/paystack
 * @desc    Handle Paystack webhook events
 * @access  Public (but verified by signature)
 */
router.post('/webhook/paystack', orderController.handleWebhook);
/**
 * @route   POST /api/orders/delivery/verify-code
 * @desc    Verify delivery by 4-digit code (rider or admin)
 * @access  Public
 */
router.post('/delivery/verify-code', deliveryVerifyCodeLimiter, verifyDeliveryCodeValidation, orderController.verifyDeliveryByCode);
/**
 * @route   POST /api/orders/delivery/verify-qr
 * @desc    Verify delivery by QR token (rider or admin)
 * @access  Public
 */
router.post('/delivery/verify-qr', deliveryVerifyTokenLimiter, verifyDeliveryTokenValidation, orderController.verifyDeliveryByToken);
// Admin routes
router.get('/admin/orders', adminAuth_middleware_1.authenticateAdmin, orderController.getAdminOrders);
router.get('/admin/transactions', adminAuth_middleware_1.authenticateAdmin, orderController.getAdminPaymentTransactions);
router.get('/admin/stats', adminAuth_middleware_1.authenticateAdmin, orderController.getOrderStats);
router.put('/:id/status', adminAuth_middleware_1.authenticateAdmin, updateStatusValidation, orderController.updateOrderStatus);
// Protected routes (require authentication)
router.use(auth_middleware_1.authenticateToken);
/**
 * @route   POST /api/orders
 * @desc    Create pending order and initialize payment
 * @access  Private
 */
router.post('/', createOrderValidation, orderController.createOrder);
/**
 * @route   POST /api/orders/verify-payment
 * @desc    Verify payment and complete order
 * @access  Private
 */
router.post('/verify-payment', verifyPaymentValidation, orderController.verifyPayment);
/**
 * @route   GET /api/orders/payment-status
 * @desc    Check payment status
 * @access  Private
 */
router.get('/payment-status', checkPaymentStatusValidation, orderController.checkPaymentStatus);
/**
 * @route   GET /api/orders
 * @desc    Get user's orders
 * @access  Private
 */
router.get('/', getUserOrdersValidation, orderController.getUserOrders);
/**
 * @route   GET /api/orders/:id
 * @desc    Get order by ID
 * @access  Private
 */
router.get('/:id', orderIdValidation, orderController.getOrderById);
/**
 * @route   GET /api/orders/number/:orderNumber
 * @desc    Get order by order number
 * @access  Private
 */
router.get('/number/:orderNumber', orderNumberValidation, orderController.getOrderByNumber);
/**
 * @route   POST /api/orders/:id/cancel
 * @desc    Cancel order
 * @access  Private
 */
router.post('/:id/cancel', orderIdValidation, orderController.cancelOrder);
/**
 * @route   GET /api/orders/pending/:pendingOrderId
 * @desc    Get pending order details
 * @access  Private
 */
router.get('/pending/:pendingOrderId', pendingOrderValidation, orderController.getPendingOrder);
/**
 * @route   POST /api/orders/pending/:pendingOrderId/cancel
 * @desc    Cancel pending order
 * @access  Private
 */
router.post('/pending/:pendingOrderId/cancel', pendingOrderValidation, orderController.cancelPendingOrder);
