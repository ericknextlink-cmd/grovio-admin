import rateLimit, { ipKeyGenerator } from 'express-rate-limit'
import { AuthRequest } from './auth.middleware'

/**
 * Rate limit by authenticated user id when present, else by IP.
 * Use after authenticateToken so req.user is set for protected routes.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 80,
  message: 'Too many requests. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const userId = (req as AuthRequest).user?.id
    if (userId) return `user:${userId}`
    // express-rate-limit requires using ipKeyGenerator for IPv6-safe behavior
    const ip = req.ip || req.socket?.remoteAddress || 'anon'
    return ipKeyGenerator(ip)
  },
})
