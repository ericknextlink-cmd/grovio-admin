"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createScheduledOrder = createScheduledOrder;
exports.listMyScheduledOrders = listMyScheduledOrders;
exports.cancelScheduledOrder = cancelScheduledOrder;
exports.markOrderedNow = markOrderedNow;
exports.runReminders = runReminders;
const scheduled_order_service_1 = require("../services/scheduled-order.service");
const service = new scheduled_order_service_1.ScheduledOrderService();
async function createScheduledOrder(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ success: false, message: 'Unauthorized', errors: ['Sign in required'] });
            return;
        }
        const { bundleId, bundleTitle, scheduledAt, recurrence, customDays } = req.body;
        if (!bundleId || !scheduledAt || !recurrence) {
            res.status(400).json({ success: false, message: 'Missing bundleId, scheduledAt, or recurrence', errors: ['Validation failed'] });
            return;
        }
        const result = await service.create({
            userId,
            bundleId,
            bundleTitle: bundleTitle ?? '',
            scheduledAt,
            recurrence: recurrence,
            customDays,
        });
        if (!result.success) {
            res.status(400).json({ success: false, message: result.error ?? 'Failed to create', errors: [result.error ?? ''] });
            return;
        }
        res.status(201).json({ success: true, message: 'Scheduled order created', data: result.data });
    }
    catch {
        res.status(500).json({ success: false, message: 'Internal server error', errors: ['Failed to create scheduled order'] });
    }
}
async function listMyScheduledOrders(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ success: false, message: 'Unauthorized', errors: ['Sign in required'] });
            return;
        }
        const result = await service.listByUser(userId);
        if (!result.success) {
            res.status(500).json({ success: false, message: result.error ?? 'Failed to list', errors: [result.error ?? ''] });
            return;
        }
        res.json({ success: true, data: result.data ?? [] });
    }
    catch {
        res.status(500).json({ success: false, message: 'Internal server error', errors: ['Failed to list scheduled orders'] });
    }
}
async function cancelScheduledOrder(req, res) {
    try {
        const userId = req.user?.id;
        const rawId = req.params.id;
        const id = typeof rawId === 'string' ? rawId : Array.isArray(rawId) ? rawId[0] : '';
        if (!userId || !id) {
            res.status(401).json({ success: false, message: 'Unauthorized', errors: ['Sign in required'] });
            return;
        }
        const result = await service.cancel(id, userId);
        if (!result.success) {
            res.status(400).json({ success: false, message: result.error ?? 'Failed to cancel', errors: [result.error ?? ''] });
            return;
        }
        res.json({ success: true, message: 'Scheduled order cancelled' });
    }
    catch {
        res.status(500).json({ success: false, message: 'Internal server error', errors: ['Failed to cancel'] });
    }
}
async function markOrderedNow(req, res) {
    try {
        const userId = req.user?.id;
        const rawId = req.params.id;
        const id = typeof rawId === 'string' ? rawId : Array.isArray(rawId) ? rawId[0] : '';
        if (!userId || !id) {
            res.status(401).json({ success: false, message: 'Unauthorized', errors: ['Sign in required'] });
            return;
        }
        const result = await service.markOrderedNow(id, userId);
        if (!result.success) {
            res.status(400).json({ success: false, message: result.error ?? 'Failed to update', errors: [result.error ?? ''] });
            return;
        }
        res.json({ success: true, message: 'Marked as ordered. No reminder will be sent.' });
    }
    catch {
        res.status(500).json({ success: false, message: 'Internal server error', errors: ['Failed to update'] });
    }
}
/** Run reminder job (call from cron daily). Optional: protect with CRON_SECRET. */
async function runReminders(_req, res) {
    try {
        const { sent, errors } = await service.sendDueReminders();
        res.json({ success: true, sent, errors });
    }
    catch {
        res.status(500).json({ success: false, message: 'Internal server error', errors: ['Run reminders failed'] });
    }
}
