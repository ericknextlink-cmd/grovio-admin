import { createAdminClient } from '../config/supabase'

/**
 * Validates a voucher code for a user and subtotal.
 * Returns discount amount in GHS (never trust client-supplied discount).
 */
export interface ValidateVoucherResult {
  valid: boolean
  discountAmount?: number
  voucherId?: string
  error?: string
}

export class VoucherService {
  private supabase = createAdminClient()

  async validateVoucher(
    code: string,
    userId: string,
    subtotal: number
  ): Promise<ValidateVoucherResult> {
    if (!code || typeof code !== 'string') {
      return { valid: false, error: 'Voucher code is required' }
    }
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) return { valid: false, error: 'Invalid code' }

    const { data: voucher, error: vErr } = await this.supabase
      .from('discount_vouchers')
      .select('*')
      .eq('code', trimmed)
      .maybeSingle()

    if (vErr || !voucher) {
      return { valid: false, error: 'Invalid or expired voucher code' }
    }

    const now = new Date().toISOString()
    if (voucher.valid_from && voucher.valid_from > now) {
      return { valid: false, error: 'Voucher is not yet valid' }
    }
    if (voucher.valid_until && voucher.valid_until < now) {
      return { valid: false, error: 'Voucher has expired' }
    }
    if (voucher.max_uses != null && (voucher.use_count || 0) >= voucher.max_uses) {
      return { valid: false, error: 'Voucher has reached maximum uses' }
    }

    const minOrder = Number(voucher.min_order_amount) || 0
    if (subtotal < minOrder) {
      return {
        valid: false,
        error: `Minimum order amount for this voucher is GH₵${minOrder.toFixed(2)}`,
      }
    }

    // Check if voucher is assigned to user (user_vouchers) or is global (no row = any user)
    const { data: assignment } = await this.supabase
      .from('user_vouchers')
      .select('id, used_at')
      .eq('voucher_id', voucher.id)
      .eq('user_id', userId)
      .maybeSingle()

    if (assignment) {
      if (assignment.used_at) {
        return { valid: false, error: 'You have already used this voucher' }
      }
    }
    // If no assignment, treat as global voucher (any user can use once per code logic if you track by code+user elsewhere)
    // For simplicity we allow global vouchers; optionally restrict to user_vouchers only by: if (!assignment) return { valid: false }

    let discountAmount = 0
    if (voucher.discount_type === 'percentage') {
      const pct = Math.min(100, Math.max(0, Number(voucher.discount_value)))
      discountAmount = (subtotal * pct) / 100
    } else {
      discountAmount = Math.min(Number(voucher.discount_value), subtotal)
    }
    discountAmount = Math.round(discountAmount * 100) / 100

    return {
      valid: true,
      discountAmount,
      voucherId: voucher.id,
    }
  }

  /**
   * List vouchers assigned to the user that are still valid and unused.
   */
  async listForUser(userId: string): Promise<
    Array<{
      id: string
      voucherId: string
      code: string
      discountType: string
      discountValue: number
      description: string | null
      imageType: string | null
      validUntil: string | null
    }>
  > {
    const { data: rows, error } = await this.supabase
      .from('user_vouchers')
      .select(`
        id,
        voucher_id,
        used_at,
        discount_vouchers (
          id,
          code,
          discount_type,
          discount_value,
          description,
          image_type,
          valid_until
        )
      `)
      .eq('user_id', userId)
      .is('used_at', null)

    if (error || !rows) return []

    const now = new Date().toISOString()
    type VoucherData = {
      id: string
      code: string
      discount_type: string
      discount_value: number
      description: string | null
      image_type: string | null
      valid_until: string | null
    }
    type UserVoucherRow = {
      id: string
      voucher_id: string
      used_at: string | null
      discount_vouchers: VoucherData[] | VoucherData | null
    }
    const typedRows = rows as unknown as UserVoucherRow[]
    return typedRows
      .filter((r) => {
        const v = Array.isArray(r.discount_vouchers) ? r.discount_vouchers[0] : r.discount_vouchers
        if (!v) return false
        if (v.valid_until && v.valid_until < now) return false
        return true
      })
      .map((r) => {
        const v = (Array.isArray(r.discount_vouchers) ? r.discount_vouchers[0] : r.discount_vouchers)!
        return {
          id: r.id,
          voucherId: v.id,
          code: v.code,
          discountType: v.discount_type,
          discountValue: Number(v.discount_value),
          description: v.description ?? null,
          imageType: v.image_type ?? null,
          validUntil: v.valid_until ?? null,
        }
      })
  }
}
