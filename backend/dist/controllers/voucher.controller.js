"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateVoucher = validateVoucher;
exports.listMyVouchers = listMyVouchers;
exports.getMyVoucherImage = getMyVoucherImage;
const voucher_service_1 = require("../services/voucher.service");
const voucher_image_service_1 = require("../services/voucher-image.service");
const voucherService = new voucher_service_1.VoucherService();
const voucherImageService = new voucher_image_service_1.VoucherImageService();
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
/**
 * Return generated voucher image for the current user's voucher code.
 */
async function getMyVoucherImage(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Authentication required',
            });
            return;
        }
        const code = String(req.params?.code || '').trim().toUpperCase();
        if (!code) {
            res.status(400).json({
                success: false,
                message: 'Voucher code is required',
            });
            return;
        }
        const userVouchers = await voucherService.listForUser(userId);
        const match = userVouchers.find((v) => v.code?.toUpperCase() === code);
        if (!match) {
            res.status(404).json({
                success: false,
                message: 'Voucher not found for current user',
            });
            return;
        }
        const voucher = await voucherService.getVoucherById(match.voucherId);
        if (!voucher) {
            res.status(404).json({
                success: false,
                message: 'Voucher details not found',
            });
            return;
        }
        const imageType = voucher.image_type === 'nss' ? 'nss' : 'regular';
        const discountValue = Number(voucher.discount_value || 0);
        const amountText = voucher.discount_type === 'percentage'
            ? `${discountValue}% OFF`
            : `GHC ${discountValue.toFixed(0)} OFF`;
        const usageDisplay = voucher.usage_type === 'one_time' ? 'one_time' : 'recurring';
        const customDesc = voucher.description?.trim();
        const expiryText = customDesc && voucher.valid_until
            ? `Until ${new Date(voucher.valid_until).toLocaleDateString()}`
            : undefined;
        const offerDescription = customDesc ??
            (0, voucher_image_service_1.formatVoucherOfferDescription)({
                discountType: voucher.discount_type,
                discountValue,
                validUntil: voucher.valid_until,
                usageDisplay,
            });
        const imageBuffer = await voucherImageService.generate(imageType, {
            code: voucher.code,
            upToText: 'UP TO',
            expiryText: customDesc ? expiryText : undefined,
            amountText,
            offerDescription,
            textColor: '#ffffff',
            websiteText: 'WWW.GROVIOGHANA.COM',
        });
        if (!imageBuffer) {
            res.status(404).json({
                success: false,
                message: 'Voucher image template not available',
            });
            return;
        }
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'private, max-age=300');
        res.status(200).send(imageBuffer);
    }
    catch (e) {
        console.error('Get my voucher image error:', e);
        res.status(500).json({
            success: false,
            message: 'Failed to load voucher image',
        });
    }
}
