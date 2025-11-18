"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Load environment variables first
require("./config/register-env");
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const auth_routes_1 = require("./routes/auth.routes");
const health_routes_1 = require("./routes/health.routes");
const account_routes_1 = require("./routes/account.routes");
const profile_routes_1 = require("./routes/profile.routes");
const otp_routes_1 = require("./routes/otp.routes");
const admin_routes_1 = require("./routes/admin.routes");
const products_routes_1 = require("./routes/products.routes");
const categories_routes_1 = require("./routes/categories.routes");
const dashboard_routes_1 = require("./routes/dashboard.routes");
const ai_routes_1 = require("./routes/ai.routes");
const order_routes_1 = require("./routes/order.routes");
const user_preferences_routes_1 = require("./routes/user-preferences.routes");
const bundles_routes_1 = require("./routes/bundles.routes");
const ai_products_routes_1 = require("./routes/ai-products.routes");
const upload_routes_1 = require("./routes/upload.routes");
const cart_routes_1 = require("./routes/cart.routes");
const favorites_routes_1 = require("./routes/favorites.routes");
const error_middleware_1 = require("./middleware/error.middleware");
const notFound_middleware_1 = require("./middleware/notFound.middleware");
const port_1 = require("./utils/port");
const app = (0, express_1.default)();
// Trust proxy for rate limiting in production (Railway, Render, etc.)
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}
// Security middleware with custom CSP for OAuth callbacks
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'",
                "'unsafe-inline'", // Required for OAuth callback inline scripts
                "'unsafe-eval'", // May be needed for some OAuth flows
            ],
            styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for OAuth pages
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: [
                "'self'",
                process.env.SUPABASE_URL || "https://*.supabase.co", // Allow Supabase connections
            ].filter(Boolean),
            fontSrc: ["'self'", "data:"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'self'"],
            formAction: ["'self'"],
            baseUri: ["'self'"],
            frameAncestors: ["'self'"],
            upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
        },
    },
    crossOriginOpenerPolicy: {
        policy: 'same-origin-allow-popups', // Required for OAuth popup flows
    },
    crossOriginEmbedderPolicy: false, // Disable to allow OAuth popups
}));
// CORS configuration
const allowedOrigins = [
    process.env.FRONTEND_URL,
    process.env.NEXT_PUBLIC_FRONTEND_URL,
    process.env.DOMAIN_URL,
    process.env.ADMIN_URL,
    'https://grovio-gamma.vercel.app',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
].filter((origin) => !!origin);
// In development, allow all localhost origins
const localhostRegex = /^http:\/\/localhost:\d+$/;
if (process.env.NODE_ENV !== 'production') {
    allowedOrigins.push(localhostRegex);
}
// Also allow Vercel preview URLs (always, not just in non-production)
// This covers production, staging, and preview deployments
allowedOrigins.push(/^https:\/\/.*\.vercel\.app$/);
// Custom CORS middleware that can access request path
app.use((req, res, next) => {
    const origin = req.headers.origin;
    const isHealthCheck = req.path?.startsWith('/api/health') || false;
    const isWebhook = req.path?.startsWith('/api/webhook') || false;
    // In production, reject no-origin requests unless they're health checks or webhooks
    if (!origin && process.env.NODE_ENV === 'production') {
        if (!isHealthCheck && !isWebhook) {
            return res.status(403).json({
                success: false,
                message: 'CORS: Origin header is required'
            });
        }
        // For webhooks/health checks without origin, allow but don't set CORS headers
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        return next();
    }
    // Check if origin is in allowed list
    if (origin) {
        const isAllowed = allowedOrigins.some(allowedOrigin => {
            if (typeof allowedOrigin === 'string') {
                return origin === allowedOrigin;
            }
            if (allowedOrigin instanceof RegExp) {
                return allowedOrigin.test(origin);
            }
            return false;
        });
        if (isAllowed) {
            res.header('Access-Control-Allow-Origin', origin);
            res.header('Access-Control-Allow-Credentials', 'true');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            res.header('Access-Control-Expose-Headers', 'Content-Type');
        }
        else {
            console.warn(`CORS blocked origin: ${origin}. Allowed origins:`, allowedOrigins);
            return res.status(403).json({
                success: false,
                message: `Not allowed by CORS. Origin: ${origin}`
            });
        }
    }
    else {
        // In development, allow no-origin for testing tools
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(204).send();
    }
    next();
});
// Cookie parser (must come before routes)
app.use((0, cookie_parser_1.default)());
// Rate limiting - stricter for general API
const generalLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 60, // limit each IP to 60 requests per windowMs (reduced from 100)
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
// Webhook rate limiting - more permissive for payment provider callbacks
const webhookLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // Allow more requests for webhooks (payment providers may retry)
    message: 'Too many webhook requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});
// Apply webhook rate limiting to webhook routes
app.use('/api/webhook', webhookLimiter);
// Apply general rate limiting to all other API routes
app.use('/api/', generalLimiter);
// Body parsing middleware
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Logging middleware
app.use((0, morgan_1.default)('combined'));
// API Routes
app.use('/api/health', health_routes_1.healthRoutes);
app.use('/api/auth', auth_routes_1.authRoutes);
app.use('/api/account', account_routes_1.accountRoutes);
app.use('/api/profile', profile_routes_1.profileRoutes);
app.use('/api/otp', otp_routes_1.otpRoutes);
app.use('/api/admin', admin_routes_1.adminRoutes);
app.use('/api/products', products_routes_1.productsRoutes);
app.use('/api/categories', categories_routes_1.categoriesRoutes);
app.use('/api/dashboard', dashboard_routes_1.dashboardRoutes);
app.use('/api/ai', ai_routes_1.aiRoutes);
app.use('/api/orders', order_routes_1.orderRoutes);
app.use('/api/users', user_preferences_routes_1.userPreferencesRoutes);
app.use('/api/bundles', bundles_routes_1.bundlesRoutes);
app.use('/api/ai-products', ai_products_routes_1.aiProductsRoutes);
app.use('/api/upload', upload_routes_1.uploadRoutes);
app.use('/api/cart', cart_routes_1.cartRoutes);
app.use('/api/favorites', favorites_routes_1.favoritesRoutes);
// Webhook endpoint (before general routes)
app.use('/api/webhook', order_routes_1.orderRoutes);
// Root endpoint
app.get('/', (req, res) => {
    return res.json({
        message: 'Grovio Backend API',
        version: '1.0.0',
        status: 'running',
        endpoints: {
            health: '/api/health',
            auth: '/api/auth',
            account: '/api/account',
            profile: '/api/profile',
            otp: '/api/otp',
            admin: '/api/admin',
            products: '/api/products',
            categories: '/api/categories',
            dashboard: '/api/dashboard',
            ai: '/api/ai',
            orders: '/api/orders',
            users: '/api/users',
            bundles: '/api/bundles',
            aiProducts: '/api/ai-products',
            webhook: '/api/webhook'
        }
    });
});
// Error handling middleware (must be last)
app.use(notFound_middleware_1.notFoundHandler);
app.use(error_middleware_1.errorHandler);
// Start server with auto port detection
const startServer = async () => {
    try {
        // Get the desired port from environment or default to 3000
        const desiredPort = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
        // Find an available port starting from the desired port
        const PORT = await (0, port_1.findAvailablePort)(desiredPort);
        app.listen(PORT, () => {
            console.log(` Grovio Backend Server running on port ${PORT}`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3001'}`);
            console.log(`Admin URL: ${process.env.ADMIN_URL || 'http://localhost:3000'}`);
            console.log(` Server URL: http://localhost:${PORT}`);
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};
// Start the server
startServer();
exports.default = app;
