"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoucherService = void 0;
const supabase_1 = require("../config/supabase");
class VoucherService {
    constructor() {
        this.supabase = (0, supabase_1.createAdminClient)();
    }
    async validateVoucher(code, userId, subtotal) {
        if (!code || typeof code !== 'string') {
            return { valid: false, error: 'Voucher code is required' };
        }
        const trimmed = code.trim().toUpperCase();
        if (!trimmed)
            return { valid: false, error: 'Invalid code' };
        const { data: voucher, error: vErr } = await this.supabase
            .from('discount_vouchers')
            .select('*')
            .eq('code', trimmed)
            .maybeSingle();
        if (vErr || !voucher) {
            return { valid: false, error: 'Invalid or expired voucher code' };
        }
        const now = new Date().toISOString();
        if (voucher.valid_from && voucher.valid_from > now) {
            return { valid: false, error: 'Voucher is not yet valid' };
        }
        if (voucher.valid_until && voucher.valid_until < now) {
            return { valid: false, error: 'Voucher has expired' };
        }
        if (voucher.max_uses != null && (voucher.use_count || 0) >= voucher.max_uses) {
            return { valid: false, error: 'Voucher has reached maximum uses' };
        }
        const minOrder = Number(voucher.min_order_amount) || 0;
        if (subtotal < minOrder) {
            return {
                valid: false,
                error: `Minimum order amount for this voucher is GH₵${minOrder.toFixed(2)}`,
            };
        }
        // Check if voucher is assigned to user (user_vouchers) or is global (no row = any user)
        const { data: assignment } = await this.supabase
            .from('user_vouchers')
            .select('id, used_at')
            .eq('voucher_id', voucher.id)
            .eq('user_id', userId)
            .maybeSingle();
        if (assignment) {
            if (assignment.used_at) {
                return { valid: false, error: 'You have already used this voucher' };
            }
        }
        // If no assignment, treat as global voucher (any user can use once per code logic if you track by code+user elsewhere)
        // For simplicity we allow global vouchers; optionally restrict to user_vouchers only by: if (!assignment) return { valid: false }
        let discountAmount = 0;
        if (voucher.discount_type === 'percentage') {
            const pct = Math.min(100, Math.max(0, Number(voucher.discount_value)));
            discountAmount = (subtotal * pct) / 100;
        }
        else {
            discountAmount = Math.min(Number(voucher.discount_value), subtotal);
        }
        discountAmount = Math.round(discountAmount * 100) / 100;
        return {
            valid: true,
            discountAmount,
            voucherId: voucher.id,
        };
    }
    /**
     * List vouchers assigned to the user that are still valid and unused.
     */
    async listForUser(userId) {
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
            .is('used_at', null);
        if (error || !rows)
            return [];
        const now = new Date().toISOString();
        const typedRows = rows;
        return typedRows
            .filter((r) => {
            const v = Array.isArray(r.discount_vouchers) ? r.discount_vouchers[0] : r.discount_vouchers;
            if (!v)
                return false;
            if (v.valid_until && v.valid_until < now)
                return false;
            return true;
        })
            .map((r) => {
            const v = (Array.isArray(r.discount_vouchers) ? r.discount_vouchers[0] : r.discount_vouchers);
            return {
                id: r.id,
                voucherId: v.id,
                code: v.code,
                discountType: v.discount_type,
                discountValue: Number(v.discount_value),
                description: v.description ?? null,
                imageType: v.image_type ?? null,
                validUntil: v.valid_until ?? null,
            };
        });
    }
    /**
     * Admin: create a new voucher (unique code).
     */
    async createVoucher(params) {
        const code = params.code.trim().toUpperCase();
        if (!code)
            return { error: 'Code is required' };
        if (params.discount_value <= 0)
            return { error: 'Discount value must be positive' };
        if (params.discount_type === 'percentage' && params.discount_value > 100)
            return { error: 'Percentage cannot exceed 100' };
        const { data, error } = await this.supabase
            .from('discount_vouchers')
            .insert({
            code,
            discount_type: params.discount_type,
            discount_value: params.discount_value,
            description: params.description ?? null,
            image_type: params.image_type ?? null,
            min_order_amount: params.min_order_amount ?? 0,
            valid_from: params.valid_from ?? new Date().toISOString(),
            valid_until: params.valid_until ?? null,
            max_uses: params.max_uses ?? null,
        })
            .select('id, code')
            .single();
        if (error) {
            if (error.code === '23505')
                return { error: 'Voucher code already exists' };
            return { error: error.message };
        }
        return { id: data.id, code: data.code };
    }
    /**
     * Admin: list all vouchers.
     */
    async listAllVouchers() {
        const { data, error } = await this.supabase
            .from('discount_vouchers')
            .select('id, code, discount_type, discount_value, description, image_type, min_order_amount, valid_from, valid_until, max_uses, use_count, created_at')
            .order('created_at', { ascending: false });
        if (error || !data)
            return [];
        return data.map((r) => ({
            id: r.id,
            code: r.code,
            discount_type: r.discount_type,
            discount_value: Number(r.discount_value),
            description: r.description ?? null,
            image_type: r.image_type ?? null,
            min_order_amount: Number(r.min_order_amount ?? 0),
            valid_from: r.valid_from,
            valid_until: r.valid_until ?? null,
            max_uses: r.max_uses ?? null,
            use_count: Number(r.use_count ?? 0),
            created_at: r.created_at,
        }));
    }
    /**
     * Admin: update an existing voucher.
     */
    async updateVoucher(id, params) {
        if (!id)
            return { error: 'Voucher ID is required' };
        const payload = {};
        if (params.code !== undefined) {
            const code = params.code.trim().toUpperCase();
            if (!code)
                return { error: 'Code cannot be empty' };
            payload.code = code;
        }
        let existingType = null;
        if (params.discount_value !== undefined && params.discount_type === undefined) {
            const { data: existing } = await this.supabase
                .from('discount_vouchers')
                .select('discount_type')
                .eq('id', id)
                .maybeSingle();
            existingType = existing?.discount_type ?? null;
        }
        if (params.discount_type !== undefined)
            payload.discount_type = params.discount_type;
        if (params.discount_value !== undefined) {
            if (params.discount_value <= 0)
                return { error: 'Discount value must be positive' };
            const effectiveType = params.discount_type ?? existingType;
            if (effectiveType === 'percentage' && params.discount_value > 100) {
                return { error: 'Percentage cannot exceed 100' };
            }
            payload.discount_value = params.discount_value;
        }
        if (params.description !== undefined)
            payload.description = params.description;
        if (params.image_type !== undefined)
            payload.image_type = params.image_type;
        if (params.min_order_amount !== undefined)
            payload.min_order_amount = params.min_order_amount;
        if (params.valid_until !== undefined)
            payload.valid_until = params.valid_until;
        if (params.max_uses !== undefined)
            payload.max_uses = params.max_uses;
        if (Object.keys(payload).length === 0) {
            return { error: 'No fields provided to update' };
        }
        payload.updated_at = new Date().toISOString();
        const { data, error } = await this.supabase
            .from('discount_vouchers')
            .update(payload)
            .eq('id', id)
            .select('id, code')
            .single();
        if (error) {
            if (error.code === '23505')
                return { error: 'Voucher code already exists' };
            return { error: error.message };
        }
        return { id: data.id, code: data.code };
    }
    /**
     * Admin: assign a voucher to a user (insert user_vouchers).
     */
    async assignToUser(userId, voucherId) {
        if (!userId || !voucherId)
            return { error: 'User ID and voucher ID are required' };
        const { error } = await this.supabase
            .from('user_vouchers')
            .insert({ user_id: userId, voucher_id: voucherId });
        if (error) {
            if (error.code === '23505')
                return { error: 'Voucher already assigned to this user' };
            if (error.code === '23503')
                return { error: 'Invalid user or voucher' };
            return { error: error.message };
        }
        return { ok: true };
    }
    /**
     * Admin: get voucher by id.
     */
    async getVoucherById(id) {
        const { data, error } = await this.supabase
            .from('discount_vouchers')
            .select('id, code, discount_type, discount_value, description, image_type, valid_until')
            .eq('id', id)
            .maybeSingle();
        if (error || !data)
            return null;
        return {
            id: data.id,
            code: data.code,
            discount_type: data.discount_type,
            discount_value: Number(data.discount_value),
            description: data.description ?? null,
            image_type: data.image_type ?? null,
            valid_until: data.valid_until ?? null,
        };
    }
    /**
     * Admin: list voucher assignments (user_vouchers joined with users).
     */
    async listAssignments(voucherId) {
        let query = this.supabase
            .from('user_vouchers')
            .select(`
        id,
        voucher_id,
        user_id,
        used_at,
        created_at
      `)
            .order('created_at', { ascending: false });
        if (voucherId) {
            query = query.eq('voucher_id', voucherId);
        }
        const { data, error } = await query;
        if (error || !data || data.length === 0)
            return [];
        const userIds = [...new Set(data.map((r) => r.user_id).filter(Boolean))];
        let usersById = {};
        if (userIds.length > 0) {
            const { data: users } = await this.supabase
                .from('users')
                .select('id, email, first_name, last_name')
                .in('id', userIds);
            usersById = (users || []).reduce((acc, u) => {
                acc[u.id] = {
                    email: u.email ?? null,
                    name: [u.first_name, u.last_name].filter(Boolean).join(' ') || null,
                };
                return acc;
            }, {});
        }
        return data.map((r) => ({
            id: r.id,
            voucher_id: r.voucher_id,
            user_id: r.user_id,
            used_at: r.used_at,
            created_at: r.created_at,
            user_email: usersById[r.user_id]?.email ?? null,
            user_name: usersById[r.user_id]?.name ?? null,
        }));
    }
    /**
     * Admin: revoke a user-voucher assignment.
     */
    async revokeAssignment(assignmentId) {
        if (!assignmentId)
            return { error: 'Assignment ID is required' };
        const { error } = await this.supabase
            .from('user_vouchers')
            .delete()
            .eq('id', assignmentId);
        if (error)
            return { error: error.message };
        return { ok: true };
    }
}
exports.VoucherService = VoucherService;
