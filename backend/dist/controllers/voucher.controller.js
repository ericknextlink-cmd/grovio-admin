"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateVoucher = validateVoucher;
exports.listMyVouchers = listMyVouchers;
const voucher_service_1 = require("../services/voucher.service");
const voucherService = new voucher_service_1.VoucherService();
/**
 * Validate a voucher code and return discount amount (for checkout preview).
 * Frontend calls this so user sees correct discount before submitting order.
 */
async function validateVoucher(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Authentication required',
            });
            return;
        }
        const { code, subtotal } = req.body ?? {};
        const sub = typeof subtotal === 'number' && subtotal >= 0 ? subtotal : 0;
        const result = await voucherService.validateVoucher(code ?? '', userId, sub);
        if (result.valid) {
            res.json({
                success: true,
                data: {
                    valid: true,
                    discountAmount: result.discountAmount,
                    voucherId: result.voucherId,
                },
            });
        }
        else {
            res.json({
                success: true,
                data: {
                    valid: false,
                    error: result.error,
                },
            });
        }
    }
    catch (e) {
        console.error('Validate voucher error:', e);
        res.status(500).json({
            success: false,
            message: 'Failed to validate voucher',
        });
    }
}
/**
 * List vouchers assigned to the current user (for profile and checkout).
 */
async function listMyVouchers(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Authentication required',
            });
            return;
        }
        const list = await voucherService.listForUser(userId);
        res.json({
            success: true,
            data: list,
        });
    }
    catch (e) {
        console.error('List vouchers error:', e);
        res.status(500).json({
            success: false,
            message: 'Failed to load vouchers',
        });
    }
}
