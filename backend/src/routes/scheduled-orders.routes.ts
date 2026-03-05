import { Router } from 'express'
import { authenticateToken } from '../middleware/auth.middleware'
import * as scheduledOrderController from '../controllers/scheduled-order.controller'

const router = Router()

// Cron-only: run reminders (no user auth; require CRON_SECRET so only cron can call)
router.post('/run-reminders', scheduledOrderController.runReminders)

router.use(authenticateToken)

router.post('/', scheduledOrderController.createScheduledOrder)
router.get('/', scheduledOrderController.listMyScheduledOrders)
router.post('/:id/cancel', scheduledOrderController.cancelScheduledOrder)
router.post('/:id/order-now', scheduledOrderController.markOrderedNow)

export { router as scheduledOrdersRoutes }
