import { Response } from 'express'
import { ScheduledOrderService } from '../services/scheduled-order.service'
import { ApiResponse } from '../types/api.types'
import { AuthRequest } from '../middleware/auth.middleware'

const service = new ScheduledOrderService()

export async function createScheduledOrder(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized', errors: ['Sign in required'] } as ApiResponse)
      return
    }
    const { bundleId, bundleTitle, scheduledAt, recurrence, customDays } = req.body
    if (!bundleId || !scheduledAt || !recurrence) {
      res.status(400).json({ success: false, message: 'Missing bundleId, scheduledAt, or recurrence', errors: ['Validation failed'] } as ApiResponse)
      return
    }
    const result = await service.create({
      userId,
      bundleId,
      bundleTitle: bundleTitle ?? '',
      scheduledAt,
      recurrence: recurrence as 'weekly' | 'biweekly' | 'monthly' | 'custom_days',
      customDays,
    })
    if (!result.success) {
      res.status(400).json({ success: false, message: result.error ?? 'Failed to create', errors: [result.error ?? ''] } as ApiResponse)
      return
    }
    res.status(201).json({ success: true, message: 'Scheduled order created', data: result.data })
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error', errors: ['Failed to create scheduled order'] } as ApiResponse)
  }
}

export async function listMyScheduledOrders(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized', errors: ['Sign in required'] } as ApiResponse)
      return
    }
    const result = await service.listByUser(userId)
    if (!result.success) {
      res.status(500).json({ success: false, message: result.error ?? 'Failed to list', errors: [result.error ?? ''] } as ApiResponse)
      return
    }
    res.json({ success: true, data: result.data ?? [] })
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error', errors: ['Failed to list scheduled orders'] } as ApiResponse)
  }
}

export async function cancelScheduledOrder(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id
    const rawId = req.params.id
    const id = typeof rawId === 'string' ? rawId : Array.isArray(rawId) ? rawId[0] : ''
    if (!userId || !id) {
      res.status(401).json({ success: false, message: 'Unauthorized', errors: ['Sign in required'] } as ApiResponse)
      return
    }
    const result = await service.cancel(id, userId)
    if (!result.success) {
      res.status(400).json({ success: false, message: result.error ?? 'Failed to cancel', errors: [result.error ?? ''] } as ApiResponse)
      return
    }
    res.json({ success: true, message: 'Scheduled order cancelled' })
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error', errors: ['Failed to cancel'] } as ApiResponse)
  }
}

export async function markOrderedNow(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id
    const rawId = req.params.id
    const id = typeof rawId === 'string' ? rawId : Array.isArray(rawId) ? rawId[0] : ''
    if (!userId || !id) {
      res.status(401).json({ success: false, message: 'Unauthorized', errors: ['Sign in required'] } as ApiResponse)
      return
    }
    const result = await service.markOrderedNow(id, userId)
    if (!result.success) {
      res.status(400).json({ success: false, message: result.error ?? 'Failed to update', errors: [result.error ?? ''] } as ApiResponse)
      return
    }
    res.json({ success: true, message: 'Marked as ordered. No reminder will be sent.' })
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error', errors: ['Failed to update'] } as ApiResponse)
  }
}

/** Run reminder job (call from cron daily). Optional: protect with CRON_SECRET. */
export async function runReminders(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const { sent, errors } = await service.sendDueReminders()
    res.json({ success: true, sent, errors })
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error', errors: ['Run reminders failed'] } as ApiResponse)
  }
}
