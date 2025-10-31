"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderRoutes = void 0;
const express_1 = require("express");
const order_controller_1 = require("../controllers/order.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const adminAuth_middleware_1 = require("../middleware/adminAuth.middleware");
const express_validator_1 = require("express-validator");
const validation_middleware_1 = require("../middleware/validation.middleware");
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
// Public routes
/**
 * @route   POST /api/webhook/paystack
 * @desc    Handle Paystack webhook events
 * @access  Public (but verified by signature)
 */
router.post('/webhook/paystack', orderController.handleWebhook);
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
// Admin routes
router.use(adminAuth_middleware_1.authenticateAdmin);
/**
 * @route   PUT /api/orders/:id/status
 * @desc    Update order status (Admin only)
 * @access  Admin
 */
router.put('/:id/status', updateStatusValidation, orderController.updateOrderStatus);
/**
 * @route   GET /api/orders/admin/stats
 * @desc    Get order statistics (Admin only)
 * @access  Admin
 */
router.get('/admin/stats', orderController.getOrderStats);
