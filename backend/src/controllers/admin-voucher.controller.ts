import { Request, Response } from 'express'
import { VoucherService } from '../services/voucher.service'
import {
  formatVoucherOfferDescription,
  VoucherImageService,
  type VoucherUsageDisplay,
} from '../services/voucher-image.service'
import { createAdminClient } from '../config/supabase'
import { ApiResponse } from '../types/api.types'

const voucherService = new VoucherService()
const voucherImageService = new VoucherImageService()

/**
 * GET /api/admin/vouchers - List all vouchers (admin).
 */
export async function listVouchers(_req: Request, res: Response): Promise<void> {
  try {
    const list = await voucherService.listAllVouchers()
    res.json({
      success: true,
      data: list,
    } as ApiResponse<typeof list>)
  } catch (e) {
    console.error('Admin list vouchers error:', e)
    res.status(500).json({
      success: false,
      message: 'Failed to list vouchers',
    } as ApiResponse<null>)
  }
}

/**
 * POST /api/admin/vouchers - Create voucher (admin).
 */
export async function createVoucher(req: Request, res: Response): Promise<void> {
  try {
    const {
      code,
      discount_type,
      discount_value,
      description,
      image_type,
      min_order_amount,
      valid_until,
      max_uses,
      usage_type,
    } = req.body
    if (!code || !discount_type || discount_value == null) {
      res.status(400).json({
        success: false,
        message: 'code, discount_type, and discount_value are required',
      } as ApiResponse<null>)
      return
    }
    const result = await voucherService.createVoucher({
      code: String(code).trim(),
      discount_type: discount_type === 'fixed' ? 'fixed' : 'percentage',
      discount_value: Number(discount_value),
      description: description ? String(description) : undefined,
      image_type: image_type === 'nss' ? 'nss' : image_type === 'regular' ? 'regular' : undefined,
      min_order_amount: min_order_amount != null ? Number(min_order_amount) : undefined,
      valid_until: valid_until ? String(valid_until) : undefined,
      max_uses: max_uses != null ? Number(max_uses) : undefined,
      usage_type: usage_type === 'one_time' ? 'one_time' : undefined,
    })
    if ('error' in result) {
      res.status(400).json({
        success: false,
        message: result.error,
      } as ApiResponse<null>)
      return
    }
    res.status(201).json({
      success: true,
      data: result,
    } as ApiResponse<typeof result>)
  } catch (e) {
    console.error('Admin create voucher error:', e)
    res.status(500).json({
      success: false,
      message: 'Failed to create voucher',
    } as ApiResponse<null>)
  }
}

/**
 * PUT /api/admin/vouchers/:id - Update voucher (admin).
 */
export async function updateVoucher(req: Request, res: Response): Promise<void> {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Voucher ID is required',
      } as ApiResponse<null>)
      return
    }

    const {
      code,
      discount_type,
      discount_value,
      description,
      image_type,
      min_order_amount,
      valid_until,
      max_uses,
      usage_type,
    } = req.body
    const result = await voucherService.updateVoucher(id, {
      code: code != null ? String(code) : undefined,
      discount_type: discount_type === 'fixed' ? 'fixed' : discount_type === 'percentage' ? 'percentage' : undefined,
      discount_value: discount_value != null ? Number(discount_value) : undefined,
      description: description !== undefined ? (description ? String(description) : null) : undefined,
      image_type: image_type === 'nss' ? 'nss' : image_type === 'regular' ? 'regular' : image_type === null ? null : undefined,
      min_order_amount: min_order_amount != null ? Number(min_order_amount) : undefined,
      valid_until: valid_until !== undefined ? (valid_until ? String(valid_until) : null) : undefined,
      max_uses: max_uses !== undefined ? (max_uses === null || max_uses === '' ? null : Number(max_uses)) : undefined,
      usage_type:
        usage_type === undefined
          ? undefined
          : usage_type === 'one_time'
            ? 'one_time'
            : usage_type === 'recurring'
              ? 'recurring'
              : undefined,
    })

    if ('error' in result) {
      res.status(400).json({
        success: false,
        message: result.error,
      } as ApiResponse<null>)
      return
    }

    res.json({
      success: true,
      data: result,
    } as ApiResponse<typeof result>)
  } catch (e) {
    console.error('Admin update voucher error:', e)
    res.status(500).json({
      success: false,
      message: 'Failed to update voucher',
    } as ApiResponse<null>)
  }
}

/**
 * POST /api/admin/vouchers/assign - Assign voucher to user (admin).
 */
export async function assignVoucher(req: Request, res: Response): Promise<void> {
  try {
    const { userId, voucherId } = req.body
    if (!userId || !voucherId) {
      res.status(400).json({
        success: false,
        message: 'userId and voucherId are required',
      } as ApiResponse<null>)
      return
    }
    const result = await voucherService.assignToUser(String(userId), String(voucherId))
    if ('error' in result) {
      res.status(400).json({
        success: false,
        message: result.error,
      } as ApiResponse<null>)
      return
    }
    res.json({
      success: true,
      data: result,
    } as ApiResponse<typeof result>)
  } catch (e) {
    console.error('Admin assign voucher error:', e)
    res.status(500).json({
      success: false,
      message: 'Failed to assign voucher',
    } as ApiResponse<null>)
  }
}

/**
 * GET /api/admin/vouchers/users - List users for assign dropdown (admin).
 */
export async function listUsersForAssign(_req: Request, res: Response): Promise<void> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('users')
      .select('id, email, first_name, last_name')
      .order('email')
      .limit(500)
    if (error) {
      res.status(500).json({ success: false, message: error.message } as ApiResponse<null>)
      return
    }
    const list = (data || []).map((u: { id: string; email?: string; first_name?: string; last_name?: string }) => ({
      id: u.id,
      email: u.email ?? '',
      name: [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email || u.id,
    }))
    res.json({ success: true, data: list } as ApiResponse<typeof list>)
  } catch (e) {
    console.error('Admin list users error:', e)
    res.status(500).json({ success: false, message: 'Failed to list users' } as ApiResponse<null>)
  }
}

/**
 * GET /api/admin/vouchers/assignments - List voucher assignments (admin).
 */
export async function listVoucherAssignments(req: Request, res: Response): Promise<void> {
  try {
    const voucherId = typeof req.query.voucherId === 'string' ? req.query.voucherId : undefined
    const rows = await voucherService.listAssignments(voucherId)
    res.json({ success: true, data: rows } as ApiResponse<typeof rows>)
  } catch (e) {
    console.error('Admin list voucher assignments error:', e)
    res.status(500).json({ success: false, message: 'Failed to list voucher assignments' } as ApiResponse<null>)
  }
}

/**
 * DELETE /api/admin/vouchers/assignments/:id - Revoke voucher assignment (admin).
 */
export async function revokeVoucherAssignment(req: Request, res: Response): Promise<void> {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    if (!id) {
      res.status(400).json({ success: false, message: 'Assignment ID is required' } as ApiResponse<null>)
      return
    }
    const result = await voucherService.revokeAssignment(id)
    if ('error' in result) {
      res.status(400).json({ success: false, message: result.error } as ApiResponse<null>)
      return
    }
    res.json({ success: true, data: result } as ApiResponse<typeof result>)
  } catch (e) {
    console.error('Admin revoke voucher assignment error:', e)
    res.status(500).json({ success: false, message: 'Failed to revoke voucher assignment' } as ApiResponse<null>)
  }
}

/**
 * GET /api/admin/vouchers/templates - List template files in storage templates/ dir (admin).
 */
export async function listVoucherTemplates(_req: Request, res: Response): Promise<void> {
  try {
    const supabase = createAdminClient()
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'invoices'
    const { data, error } = await supabase.storage
      .from(bucket)
      .list('templates', { limit: 200 })
    if (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to list template files',
        errors: [error.message],
      } as ApiResponse<null>)
      return
    }
    const files = (data || []).map((f) => ({
      name: f.name,
      id: f.id ?? null,
      updated_at: f.updated_at ?? null,
      created_at: f.created_at ?? null,
    }))
    res.json({
      success: true,
      data: {
        bucket,
        prefix: 'templates/',
        files,
      },
    } as ApiResponse<{ bucket: string; prefix: string; files: typeof files }>)
  } catch (e) {
    console.error('Admin list voucher templates error:', e)
    res.status(500).json({ success: false, message: 'Failed to list template files' } as ApiResponse<null>)
  }
}

/**
 * GET /api/admin/vouchers/:id/preview-image - Generate voucher image preview (admin).
 * Query: imageType=regular|nss, expiryText?, usageType=recurring|one_time (overrides DB for preview)
 */
export async function previewVoucherImage(req: Request, res: Response): Promise<void> {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    if (!id) {
      res.status(400).json({ success: false, message: 'Voucher ID required' } as ApiResponse<null>)
      return
    }
    const imageType = (req.query.imageType as string) === 'nss' ? 'nss' : 'regular'
    const templateName = typeof req.query.templateName === 'string' ? req.query.templateName : undefined
    const expiryText = (req.query.expiryText as string) || undefined
    const usageTypeQ = typeof req.query.usageType === 'string' ? req.query.usageType : undefined

    const voucher = await voucherService.getVoucherById(id)
    if (!voucher) {
      res.status(404).json({ success: false, message: 'Voucher not found' } as ApiResponse<null>)
      return
    }

    const amountText =
      voucher.discount_type === 'fixed'
        ? `GHC ${voucher.discount_value} OFF`
        : `${voucher.discount_value}% OFF`
    const customDesc = voucher.description?.trim()
    const validForOffer = expiryText ?? voucher.valid_until
    const usageDisplay: VoucherUsageDisplay =
      usageTypeQ === 'one_time'
        ? 'one_time'
        : usageTypeQ === 'recurring'
          ? 'recurring'
          : voucher.usage_type === 'one_time'
            ? 'one_time'
            : 'recurring'
    const offerDescription =
      customDesc ??
      formatVoucherOfferDescription({
        discountType: voucher.discount_type,
        discountValue: Number(voucher.discount_value),
        validUntil: validForOffer,
        usageDisplay,
      })

    const renderOptions = {
      code: voucher.code,
      upToText: 'UP TO',
      expiryText: customDesc ? expiryText : undefined,
      amountText,
      offerDescription,
      websiteText: 'WWW.GROVIOGHANA.COM',
    }
    const buffer = templateName
      ? await voucherImageService.generateFromTemplateName(templateName, renderOptions)
      : await voucherImageService.generate(imageType, renderOptions)

    if (!buffer) {
      res.status(503).json({
        success: false,
        message: 'Voucher image template not available',
        errors: [
          `Could not load voucher template from ${process.env.SUPABASE_STORAGE_BUCKET || 'invoices'}/templates/`,
          'Expected voucher art PNGs in templates/ (e.g. regular-organge.png, nss-orange.png).',
        ],
      } as ApiResponse<null>)
      return
    }

    res.setHeader('Content-Type', 'image/png')
    res.setHeader('Cache-Control', 'no-store')
    res.send(buffer)
  } catch (e) {
    console.error('Admin voucher preview image error:', e)
    res.status(500).json({
      success: false,
      message: 'Failed to generate preview',
    } as ApiResponse<null>)
  }
}
