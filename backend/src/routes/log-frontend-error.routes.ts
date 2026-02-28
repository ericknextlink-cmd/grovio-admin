import { Router } from 'express'
import { logFrontendError } from '../controllers/log-frontend-error.controller'

const router = Router()

/**
 * POST /api/log-frontend-error
 * Body: { message?, name?, stack?, componentStack?, userAgent?, url?, timestamp? }
 * Responds 204. Logs to server stdout for platform logs.
 */
router.post('/', logFrontendError)

export { router as logFrontendErrorRoutes }
