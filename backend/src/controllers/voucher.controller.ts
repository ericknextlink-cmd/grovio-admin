import { Response } from 'express'
import { VoucherService } from '../services/voucher.service'
import {
  formatVoucherOfferDescription,
  VoucherImageService,
  VoucherImageType,
  type VoucherUsageDisplay,
} from '../services/voucher-image.service'
import { ApiResponse } from '../types/api.types'

export interface AuthRequest {
  user?: { id: string }
  body: { code?: string; subtotal?: number }
  params?: { code?: string }
}

const voucherService = new VoucherService()
const voucherImageService = new VoucherImageService()

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

/**
 * Return generated voucher image for the current user's voucher code.
 */
export async function getMyVoucherImage(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      } as ApiResponse)
      return
    }

    const code = String(req.params?.code || '').trim().toUpperCase()
    if (!code) {
      res.status(400).json({
        success: false,
        message: 'Voucher code is required',
      } as ApiResponse)
      return
    }

    const userVouchers = await voucherService.listForUser(userId)
    const match = userVouchers.find((v) => v.code?.toUpperCase() === code)
    if (!match) {
      res.status(404).json({
        success: false,
        message: 'Voucher not found for current user',
      } as ApiResponse)
      return
    }

    const voucher = await voucherService.getVoucherById(match.voucherId)
    if (!voucher) {
      res.status(404).json({
        success: false,
        message: 'Voucher details not found',
      } as ApiResponse)
      return
    }

    const imageType: VoucherImageType = voucher.image_type === 'nss' ? 'nss' : 'regular'
    const discountValue = Number(voucher.discount_value || 0)
    const amountText =
      voucher.discount_type === 'percentage'
        ? `${discountValue}% OFF`
        : `GHC ${discountValue.toFixed(0)} OFF`
    const usageDisplay: VoucherUsageDisplay =
      voucher.usage_type === 'one_time' ? 'one_time' : 'recurring'
    const customDesc = voucher.description?.trim()
    const expiryText =
      customDesc && voucher.valid_until
        ? `Until ${new Date(voucher.valid_until).toLocaleDateString()}`
        : undefined
    const offerDescription =
      customDesc ??
      formatVoucherOfferDescription({
        discountType: voucher.discount_type,
        discountValue,
        validUntil: voucher.valid_until,
        usageDisplay,
      })

    const imageBuffer = await voucherImageService.generate(imageType, {
      code: voucher.code,
      upToText: 'UP TO',
      expiryText: customDesc ? expiryText : undefined,
      amountText,
      offerDescription,
      textColor: '#ffffff',
      websiteText: 'WWW.GROVIOGHANA.COM',
    })

    if (!imageBuffer) {
      res.status(404).json({
        success: false,
        message: 'Voucher image template not available',
      } as ApiResponse)
      return
    }

    res.setHeader('Content-Type', 'image/png')
    res.setHeader('Cache-Control', 'private, max-age=300')
    res.status(200).send(imageBuffer)
  } catch (e) {
    console.error('Get my voucher image error:', e)
    res.status(500).json({
      success: false,
      message: 'Failed to load voucher image',
    } as ApiResponse)
  }
}
