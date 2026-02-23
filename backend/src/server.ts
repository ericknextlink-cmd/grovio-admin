// Load environment variables first
import './config/register-env'

import express, { Application, Request, Response } from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import cookieParser from 'cookie-parser'
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
import { aiProductsRoutes } from './routes/ai-products.routes'
import { uploadRoutes } from './routes/upload.routes'
import { cartRoutes } from './routes/cart.routes'
import { favoritesRoutes } from './routes/favorites.routes'
import { pricingRoutes } from './routes/pricing.routes'
import { errorHandler } from './middleware/error.middleware'
import { notFoundHandler } from './middleware/notFound.middleware'
import { findAvailablePort } from './utils/port'

const app: Application = express()

// Trust proxy for rate limiting in production (Railway, Render, etc.)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1)
}

// Security middleware with custom CSP for OAuth callbacks
app.use(helmet({
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
}))

// CORS configuration
const allowedOrigins: (string | RegExp)[] = [
  process.env.FRONTEND_URL,
  process.env.NEXT_PUBLIC_FRONTEND_URL,
  process.env.DOMAIN_URL,
  process.env.ADMIN_URL,
  process.env.BACKEND_URL,
  'https://grovio-gamma.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
].filter((origin): origin is string => !!origin)

// In development, allow all localhost origins
const localhostRegex = /^http:\/\/localhost:\d+$/
if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.push(localhostRegex)
}

// Also allow Vercel preview URLs (always, not just in non-production)
// This covers production, staging, and preview deployments
allowedOrigins.push(/^https:\/\/.*\.vercel\.app$/)

// Custom CORS middleware that can access request path
app.use((req, res, next) => {
  const origin = req.headers.origin
  // // In production, reject no-origin requests unless they're health checks or webhooks
  // if (!origin && process.env.NODE_ENV === 'production') {
  //   if (!isHealthCheck && !isWebhook) {
  //     return res.status(403).json({
  //       success: false,
  //       message: 'CORS: Origin header is required'
  //     })
  //   }
  //   // For webhooks/health checks without origin, allow but don't set CORS headers
  //   res.header('Access-Control-Allow-Origin', '*')
  //   res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  //   res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  //   return next()
  // }

  // Check if origin is in allowed list
  if (origin) {
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        return origin === allowedOrigin
      }
      if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin)
      }
      return false
    })

    if (isAllowed) {
      res.header('Access-Control-Allow-Origin', origin)
      res.header('Access-Control-Allow-Credentials', 'true')
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      res.header('Access-Control-Expose-Headers', 'Content-Type')
    } else {
      console.warn(`CORS blocked origin: ${origin}. Allowed origins:`, allowedOrigins)
      return res.status(403).json({
        success: false,
        message: `Not allowed by CORS. Origin: ${origin}`
      })
    }
  } else {
    // In development, allow no-origin for testing tools
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  }

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(204).send()
  }

  next()
})

// Cookie parser (must come before routes)
app.use(cookieParser())

// Rate limiting - stricter for general API
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60, // limit each IP to 60 requests per windowMs (reduced from 100)
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
})

// Webhook rate limiting - more permissive for payment provider callbacks
const webhookLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Allow more requests for webhooks (payment providers may retry)
  message: 'Too many webhook requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
})

// Apply webhook rate limiting to webhook routes
app.use('/api/webhook', webhookLimiter)

// Apply general rate limiting to all other API routes
app.use('/api/', generalLimiter)

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
app.use('/api/ai-products', aiProductsRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/cart', cartRoutes)
app.use('/api/favorites', favoritesRoutes)
app.use('/api/pricing', pricingRoutes)

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
      aiProducts: '/api/ai-products',
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
    // console.log(`PORT: ${PORT}`)

    app.listen(PORT, () => {
      console.log(` Grovio Backend Server running on port ${PORT}`)
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
      console.log(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3001'}`)
      console.log(`Admin URL: ${process.env.ADMIN_URL || 'http://localhost:3000'}`)
      console.log(` Server URL: http://localhost:${PORT}`)
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

// Start the server
startServer()

export default app
