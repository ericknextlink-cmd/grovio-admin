"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listVouchers = listVouchers;
exports.createVoucher = createVoucher;
exports.assignVoucher = assignVoucher;
exports.listUsersForAssign = listUsersForAssign;
exports.previewVoucherImage = previewVoucherImage;
const voucher_service_1 = require("../services/voucher.service");
const voucher_image_service_1 = require("../services/voucher-image.service");
const supabase_1 = require("../config/supabase");
const voucherService = new voucher_service_1.VoucherService();
const voucherImageService = new voucher_image_service_1.VoucherImageService();
/**
 * GET /api/admin/vouchers - List all vouchers (admin).
 */
async function listVouchers(_req, res) {
    try {
        const list = await voucherService.listAllVouchers();
        res.json({
            success: true,
            data: list,
        });
    }
    catch (e) {
        console.error('Admin list vouchers error:', e);
        res.status(500).json({
            success: false,
            message: 'Failed to list vouchers',
        });
    }
}
/**
 * POST /api/admin/vouchers - Create voucher (admin).
 */
async function createVoucher(req, res) {
    try {
        const { code, discount_type, discount_value, description, image_type, min_order_amount, valid_until, max_uses } = req.body;
        if (!code || !discount_type || discount_value == null) {
            res.status(400).json({
                success: false,
                message: 'code, discount_type, and discount_value are required',
            });
            return;
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
        });
        if ('error' in result) {
            res.status(400).json({
                success: false,
                message: result.error,
            });
            return;
        }
        res.status(201).json({
            success: true,
            data: result,
        });
    }
    catch (e) {
        console.error('Admin create voucher error:', e);
        res.status(500).json({
            success: false,
            message: 'Failed to create voucher',
        });
    }
}
/**
 * POST /api/admin/vouchers/assign - Assign voucher to user (admin).
 */
async function assignVoucher(req, res) {
    try {
        const { userId, voucherId } = req.body;
        if (!userId || !voucherId) {
            res.status(400).json({
                success: false,
                message: 'userId and voucherId are required',
            });
            return;
        }
        const result = await voucherService.assignToUser(String(userId), String(voucherId));
        if ('error' in result) {
            res.status(400).json({
                success: false,
                message: result.error,
            });
            return;
        }
        res.json({
            success: true,
            data: result,
        });
    }
    catch (e) {
        console.error('Admin assign voucher error:', e);
        res.status(500).json({
            success: false,
            message: 'Failed to assign voucher',
        });
    }
}
/**
 * GET /api/admin/vouchers/users - List users for assign dropdown (admin).
 */
async function listUsersForAssign(_req, res) {
    try {
        const supabase = (0, supabase_1.createAdminClient)();
        const { data, error } = await supabase
            .from('users')
            .select('id, email, first_name, last_name')
            .order('email')
            .limit(500);
        if (error) {
            res.status(500).json({ success: false, message: error.message });
            return;
        }
        const list = (data || []).map((u) => ({
            id: u.id,
            email: u.email ?? '',
            name: [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email || u.id,
        }));
        res.json({ success: true, data: list });
    }
    catch (e) {
        console.error('Admin list users error:', e);
        res.status(500).json({ success: false, message: 'Failed to list users' });
    }
}
/**
 * GET /api/admin/vouchers/:id/preview-image - Generate voucher image preview (admin).
 * Query: imageType=regular|nss, userName?, expiryText?
 */
async function previewVoucherImage(req, res) {
    try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        if (!id) {
            res.status(400).json({ success: false, message: 'Voucher ID required' });
            return;
        }
        const imageType = req.query.imageType === 'nss' ? 'nss' : 'regular';
        const userName = req.query.userName || undefined;
        const expiryText = req.query.expiryText || undefined;
        const voucher = await voucherService.getVoucherById(id);
        if (!voucher) {
            res.status(404).json({ success: false, message: 'Voucher not found' });
            return;
        }
        const discountText = voucher.discount_type === 'fixed'
            ? `GHC ${voucher.discount_value} OFF`
            : `${voucher.discount_value}% OFF`;
        const offerDescription = voucher.discount_type === 'fixed'
            ? `Get GHC ${voucher.discount_value} off your order${expiryText ? ` ${expiryText}` : ''}`
            : `Get ${voucher.discount_value}% off your order${expiryText ? ` ${expiryText}` : ''}`;
        const buffer = await voucherImageService.generate(imageType, {
            code: voucher.code,
            userName,
            expiryText,
            discountText,
            offerDescription,
        });
        if (!buffer) {
            res.status(503).json({ success: false, message: 'Voucher image template not available' });
            return;
        }
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'no-store');
        res.send(buffer);
    }
    catch (e) {
        console.error('Admin voucher preview image error:', e);
        res.status(500).json({
            success: false,
            message: 'Failed to generate preview',
        });
    }
}
