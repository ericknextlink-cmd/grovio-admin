"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Load environment variables first
require("./config/register-env");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
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
const error_middleware_1 = require("./middleware/error.middleware");
const notFound_middleware_1 = require("./middleware/notFound.middleware");
const port_1 = require("./utils/port");
const app = (0, express_1.default)();
// Security middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: [
        process.env.FRONTEND_URL || 'http://localhost:3001',
        process.env.ADMIN_URL || 'http://localhost:3000'
    ],
    credentials: true
}));
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);
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
            ai: '/api/ai'
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
            console.log(`🚀 Grovio Backend Server running on port ${PORT}`);
            console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3001'}`);
            console.log(`⚡ Admin URL: ${process.env.ADMIN_URL || 'http://localhost:3000'}`);
            console.log(`📡 Server URL: http://localhost:${PORT}`);
        });
    }
    catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};
// Start the server
startServer();
exports.default = app;
