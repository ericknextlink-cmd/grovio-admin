// Load environment variables first
import './config/register-env'

import express, { Application, Request, Response } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import { authRoutes } from './routes/auth.routes'
import { healthRoutes } from './routes/health.routes'
import { accountRoutes } from './routes/account.routes'
import { profileRoutes } from './routes/profile.routes'
import { otpRoutes } from './routes/otp.routes'
import { adminRoutes } from './routes/admin.routes'
import { productsRoutes } from './routes/products.routes'
import { categoriesRoutes } from './routes/categories.routes'
import { dashboardRoutes } from './routes/dashboard.routes'
import { aiRoutes } from './routes/ai.routes'
import { orderRoutes } from './routes/order.routes'
import { userPreferencesRoutes } from './routes/user-preferences.routes'
import { bundlesRoutes } from './routes/bundles.routes'
import { errorHandler } from './middleware/error.middleware'
import { notFoundHandler } from './middleware/notFound.middleware'
import { findAvailablePort } from './utils/port'

const app: Application = express()

// Trust proxy for rate limiting in production (Railway, Render, etc.)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1)
}

// Security middleware
app.use(helmet())
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3001',
    process.env.ADMIN_URL || 'http://localhost:3000'
  ],
  credentials: true
}))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
})
app.use('/api/', limiter)

// Body parsing middleware
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Logging middleware
app.use(morgan('combined'))

// API Routes
app.use('/api/health', healthRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/account', accountRoutes)
app.use('/api/profile', profileRoutes)
app.use('/api/otp', otpRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/products', productsRoutes)
app.use('/api/categories', categoriesRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/users', userPreferencesRoutes)
app.use('/api/bundles', bundlesRoutes)

// Webhook endpoint (before general routes)
app.use('/api/webhook', orderRoutes)


// Root endpoint
app.get('/', (req: Request, res: Response) => {
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
      webhook: '/api/webhook'
    }
  })
})

// Error handling middleware (must be last)
app.use(notFoundHandler)
app.use(errorHandler)

// Start server with auto port detection
const startServer = async () => {
  try {
    // Get the desired port from environment or default to 3000
    const desiredPort = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000
    
    // Find an available port starting from the desired port
    const PORT = await findAvailablePort(desiredPort)
    
    app.listen(PORT, () => {
      console.log(`🚀 Grovio Backend Server running on port ${PORT}`)
      console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`)
      console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3001'}`)
      console.log(`⚡ Admin URL: ${process.env.ADMIN_URL || 'http://localhost:3000'}`)
      console.log(`📡 Server URL: http://localhost:${PORT}`)
    })
  } catch (error) {
    console.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

// Start the server
startServer()

export default app
