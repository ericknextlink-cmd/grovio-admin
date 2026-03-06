"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listVouchers = listVouchers;
exports.createVoucher = createVoucher;
exports.updateVoucher = updateVoucher;
exports.assignVoucher = assignVoucher;
exports.listUsersForAssign = listUsersForAssign;
exports.listVoucherAssignments = listVoucherAssignments;
exports.revokeVoucherAssignment = revokeVoucherAssignment;
exports.listVoucherTemplates = listVoucherTemplates;
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
 * PUT /api/admin/vouchers/:id - Update voucher (admin).
 */
async function updateVoucher(req, res) {
    try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        if (!id) {
            res.status(400).json({
                success: false,
                message: 'Voucher ID is required',
            });
            return;
        }
        const { code, discount_type, discount_value, description, image_type, min_order_amount, valid_until, max_uses } = req.body;
        const result = await voucherService.updateVoucher(id, {
            code: code != null ? String(code) : undefined,
            discount_type: discount_type === 'fixed' ? 'fixed' : discount_type === 'percentage' ? 'percentage' : undefined,
            discount_value: discount_value != null ? Number(discount_value) : undefined,
            description: description !== undefined ? (description ? String(description) : null) : undefined,
            image_type: image_type === 'nss' ? 'nss' : image_type === 'regular' ? 'regular' : image_type === null ? null : undefined,
            min_order_amount: min_order_amount != null ? Number(min_order_amount) : undefined,
            valid_until: valid_until !== undefined ? (valid_until ? String(valid_until) : null) : undefined,
            max_uses: max_uses !== undefined ? (max_uses === null || max_uses === '' ? null : Number(max_uses)) : undefined,
        });
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
        console.error('Admin update voucher error:', e);
        res.status(500).json({
            success: false,
            message: 'Failed to update voucher',
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
 * GET /api/admin/vouchers/assignments - List voucher assignments (admin).
 */
async function listVoucherAssignments(req, res) {
    try {
        const voucherId = typeof req.query.voucherId === 'string' ? req.query.voucherId : undefined;
        const rows = await voucherService.listAssignments(voucherId);
        res.json({ success: true, data: rows });
    }
    catch (e) {
        console.error('Admin list voucher assignments error:', e);
        res.status(500).json({ success: false, message: 'Failed to list voucher assignments' });
    }
}
/**
 * DELETE /api/admin/vouchers/assignments/:id - Revoke voucher assignment (admin).
 */
async function revokeVoucherAssignment(req, res) {
    try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        if (!id) {
            res.status(400).json({ success: false, message: 'Assignment ID is required' });
            return;
        }
        const result = await voucherService.revokeAssignment(id);
        if ('error' in result) {
            res.status(400).json({ success: false, message: result.error });
            return;
        }
        res.json({ success: true, data: result });
    }
    catch (e) {
        console.error('Admin revoke voucher assignment error:', e);
        res.status(500).json({ success: false, message: 'Failed to revoke voucher assignment' });
    }
}
/**
 * GET /api/admin/vouchers/templates - List template files in storage templates/ dir (admin).
 */
async function listVoucherTemplates(_req, res) {
    try {
        const supabase = (0, supabase_1.createAdminClient)();
        const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'invoices';
        const { data, error } = await supabase.storage
            .from(bucket)
            .list('templates', { limit: 200 });
        if (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to list template files',
                errors: [error.message],
            });
            return;
        }
        const files = (data || []).map((f) => ({
            name: f.name,
            id: f.id ?? null,
            updated_at: f.updated_at ?? null,
            created_at: f.created_at ?? null,
        }));
        res.json({
            success: true,
            data: {
                bucket,
                prefix: 'templates/',
                files,
            },
        });
    }
    catch (e) {
        console.error('Admin list voucher templates error:', e);
        res.status(500).json({ success: false, message: 'Failed to list template files' });
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
        const templateName = typeof req.query.templateName === 'string' ? req.query.templateName : undefined;
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
        const renderOptions = {
            code: voucher.code,
            userName,
            expiryText,
            discountText,
            offerDescription,
        };
        const buffer = templateName
            ? await voucherImageService.generateFromTemplateName(templateName, renderOptions)
            : await voucherImageService.generate(imageType, renderOptions);
        if (!buffer) {
            res.status(503).json({
                success: false,
                message: 'Voucher image template not available',
                errors: [
                    `Could not load voucher template from ${process.env.SUPABASE_STORAGE_BUCKET || 'invoices'}/templates/`,
                    'Expected voucher template files (orange/blue variants) were not found.',
                ],
            });
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
