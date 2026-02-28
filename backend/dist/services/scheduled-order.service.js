"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScheduledOrderService = void 0;
const supabase_1 = require("../config/supabase");
const email_service_1 = require("./email.service");
class ScheduledOrderService {
    constructor() {
        this.supabase = (0, supabase_1.createAdminClient)();
        this.emailService = new email_service_1.EmailService();
    }
    async create(params) {
        try {
            const { data, error } = await this.supabase
                .from('scheduled_orders')
                .insert({
                user_id: params.userId,
                bundle_id: params.bundleId,
                bundle_title: params.bundleTitle,
                scheduled_at: params.scheduledAt,
                recurrence: params.recurrence,
                custom_days: params.customDays ?? null,
                status: 'active',
                updated_at: new Date().toISOString(),
            })
                .select()
                .single();
            if (error) {
                return { success: false, error: error.message };
            }
            return { success: true, data: data };
        }
        catch (e) {
            return { success: false, error: e instanceof Error ? e.message : 'Failed to create scheduled order' };
        }
    }
    async listByUser(userId) {
        try {
            const { data, error } = await this.supabase
                .from('scheduled_orders')
                .select('*')
                .eq('user_id', userId)
                .in('status', ['active'])
                .order('scheduled_at', { ascending: true });
            if (error)
                return { success: false, error: error.message };
            return { success: true, data: (data ?? []) };
        }
        catch (e) {
            return { success: false, error: e instanceof Error ? e.message : 'Failed to list scheduled orders' };
        }
    }
    async cancel(scheduledOrderId, userId) {
        try {
            const { error } = await this.supabase
                .from('scheduled_orders')
                .update({ status: 'cancelled', updated_at: new Date().toISOString() })
                .eq('id', scheduledOrderId)
                .eq('user_id', userId);
            if (error)
                return { success: false, error: error.message };
            return { success: true };
        }
        catch (e) {
            return { success: false, error: e instanceof Error ? e.message : 'Failed to cancel' };
        }
    }
    /** Mark as ordered_now so no reminder is sent; user placed order early. */
    async markOrderedNow(scheduledOrderId, userId) {
        try {
            const { error } = await this.supabase
                .from('scheduled_orders')
                .update({ status: 'ordered_now', updated_at: new Date().toISOString() })
                .eq('id', scheduledOrderId)
                .eq('user_id', userId);
            if (error)
                return { success: false, error: error.message };
            return { success: true };
        }
        catch (e) {
            return { success: false, error: e instanceof Error ? e.message : 'Failed to update' };
        }
    }
    /** Find active scheduled orders due tomorrow and send reminder email; set reminder_sent_at. */
    async sendDueReminders() {
        const errors = [];
        let sent = 0;
        try {
            const tomorrowStart = new Date();
            tomorrowStart.setDate(tomorrowStart.getDate() + 1);
            tomorrowStart.setHours(0, 0, 0, 0);
            const tomorrowEnd = new Date(tomorrowStart);
            tomorrowEnd.setHours(23, 59, 59, 999);
            const { data: rows, error } = await this.supabase
                .from('scheduled_orders')
                .select('*')
                .eq('status', 'active')
                .is('reminder_sent_at', null)
                .gte('scheduled_at', tomorrowStart.toISOString())
                .lte('scheduled_at', tomorrowEnd.toISOString());
            if (error) {
                return { sent: 0, errors: [error.message] };
            }
            const toSend = (rows ?? []);
            const { data: users } = await this.supabase.from('users').select('id, email, first_name').in('id', toSend.map((r) => r.user_id));
            for (const row of toSend) {
                const user = (users ?? []).find((u) => u.id === row.user_id);
                const email = user?.email;
                if (!email) {
                    errors.push(`No email for user ${row.user_id}`);
                    continue;
                }
                const result = await this.emailService.sendScheduledOrderReminder(email, {
                    userName: user?.first_name,
                    scheduledDate: row.scheduled_at,
                    bundleTitle: row.bundle_title ?? row.bundle_id,
                });
                if (result.success) {
                    await this.supabase
                        .from('scheduled_orders')
                        .update({ reminder_sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
                        .eq('id', row.id);
                    sent++;
                }
                else {
                    errors.push(...(result.errors ?? [result.message]));
                }
            }
        }
        catch (e) {
            errors.push(e instanceof Error ? e.message : 'Send reminders failed');
        }
        return { sent, errors };
    }
}
exports.ScheduledOrderService = ScheduledOrderService;
