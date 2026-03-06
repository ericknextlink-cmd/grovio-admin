import { Response } from 'express'
import { VoucherService } from '../services/voucher.service'
import { ApiResponse } from '../types/api.types'

export interface AuthRequest {
  user?: { id: string }
  body: { code?: string; subtotal?: number }
}

const voucherService = new VoucherService()

/**
 * Validate a voucher code and return discount amount (for checkout preview).
 * Frontend calls this so user sees correct discount before submitting order.
 */
export async function validateVoucher(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      } as ApiResponse)
      return
    }
    const { code, subtotal } = req.body ?? {}
    const sub = typeof subtotal === 'number' && subtotal >= 0 ? subtotal : 0
    const result = await voucherService.validateVoucher(code ?? '', userId, sub)
    if (result.valid) {
      res.json({
        success: true,
        data: {
          valid: true,
          discountAmount: result.discountAmount,
          voucherId: result.voucherId,
        },
      } as ApiResponse)
    } else {
      res.json({
        success: true,
        data: {
          valid: false,
          error: result.error,
        },
      } as ApiResponse)
    }
  } catch (e) {
    console.error('Validate voucher error:', e)
    res.status(500).json({
      success: false,
      message: 'Failed to validate voucher',
    } as ApiResponse)
  }
}

/**
 * List vouchers assigned to the current user (for profile and checkout).
 */
export async function listMyVouchers(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      } as ApiResponse)
      return
    }
    const list = await voucherService.listForUser(userId)
    res.json({
      success: true,
      data: list,
    } as ApiResponse)
  } catch (e) {
    console.error('List vouchers error:', e)
    res.status(500).json({
      success: false,
      message: 'Failed to load vouchers',
    } as ApiResponse)
  }
}
