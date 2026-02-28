import { Router } from 'express'
import { authenticateToken } from '../middleware/auth.middleware'
import * as scheduledOrderController from '../controllers/scheduled-order.controller'

const router = Router()

router.use(authenticateToken)

router.post('/', scheduledOrderController.createScheduledOrder)
router.get('/', scheduledOrderController.listMyScheduledOrders)
router.post('/:id/cancel', scheduledOrderController.cancelScheduledOrder)
router.post('/:id/order-now', scheduledOrderController.markOrderedNow)

router.post('/run-reminders', scheduledOrderController.runReminders)

export { router as scheduledOrdersRoutes }
