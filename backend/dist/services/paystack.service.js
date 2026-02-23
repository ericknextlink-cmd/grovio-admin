"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaystackService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const axios_1 = __importDefault(require("axios"));
const supabase_1 = require("../config/supabase");
class PaystackService {
    constructor() {
        this.secretKey = process.env.DEV_PAYSTACK_SECRET_KEY || '';
        this.publicKey = process.env.DEV_PAYSTACK_PUBLIC_KEY || '';
        if (!this.secretKey) {
            console.warn('PAYSTACK_SECRET_KEY not set. Payment features will be disabled.');
        }
        if (!this.publicKey) {
            console.warn('PAYSTACK_PUBLIC_KEY not set. Payment features will be disabled.');
        }
        this.client = axios_1.default.create({
            baseURL: 'https://api.paystack.co',
            headers: {
                'Authorization': `Bearer ${this.secretKey}`,
                'Content-Type': 'application/json',
            },
            timeout: 30000,
        });
    }
    /**
     * Initialize payment transaction
     * Returns authorization URL for user to complete payment
     */
    async initializeTransaction(params) {
        try {
            if (!this.secretKey) {
                throw new Error('Paystack is not configured. Please set PAYSTACK_SECRET_KEY.');
            }
            const response = await this.client.post('/transaction/initialize', {
                email: params.email,
                amount: params.amount, // Must be in kobo (multiply GHS by 100)
                reference: params.reference,
                callback_url: params.callback_url,
                metadata: params.metadata,
                channels: params.channels || ['card', 'bank', 'ussd', 'mobile_money'],
            });
            if (response.data.status) {
                return {
                    success: true,
                    authorization_url: response.data.data.authorization_url,
                    access_code: response.data.data.access_code,
                    reference: response.data.data.reference,
                };
            }
            else {
                throw new Error(response.data.message || 'Failed to initialize payment');
            }
        }
        catch (error) {
            const err = error;
            console.error('Paystack initialization error:', err.response?.data ?? err.message);
            throw new Error(err.response?.data?.message ??
                err.message ??
                'Failed to initialize payment with Paystack');
        }
    }
    /**
     * Verify payment transaction
     * Checks if payment was successful
     */
    async verifyTransaction(reference) {
        try {
            if (!this.secretKey) {
                throw new Error('Paystack is not configured');
            }
            const response = await this.client.get(`/transaction/verify/${reference}`);
            if (response.data.status) {
                return {
                    success: true,
                    data: response.data.data,
                };
            }
            else {
                throw new Error(response.data.message || 'Payment verification failed');
            }
        }
        catch (error) {
            const err = error;
            console.error('Paystack verification error:', err.response?.data ?? err.message);
            throw new Error(err.response?.data?.message ??
                err.message ??
                'Failed to verify payment');
        }
    }
    /**
     * Verify webhook signature
     * Ensures webhook is from Paystack
     */
    verifyWebhookSignature(signature, payload) {
        try {
            if (!this.secretKey) {
                console.error('Cannot verify webhook: PAYSTACK_SECRET_KEY not set');
                return false;
            }
            const hash = crypto_1.default
                .createHmac('sha512', this.secretKey)
                .update(payload)
                .digest('hex');
            return hash === signature;
        }
        catch (error) {
            console.error('Webhook signature verification error:', error);
            return false;
        }
    }
    /**
     * Handle webhook event from Paystack
     */
    async handleWebhook(event) {
        try {
            const { event: eventType, data } = event;
            const chargeData = data;
            switch (eventType) {
                case 'charge.success':
                    return await this.handleChargeSuccess(chargeData);
                case 'charge.failed':
                    return await this.handleChargeFailed(chargeData);
                case 'transfer.success':
                case 'transfer.failed':
                case 'transfer.reversed':
                    // Handle refunds
                    console.log(`Transfer event: ${eventType}`, data);
                    return { success: true, message: 'Transfer event processed' };
                default:
                    console.log(`Unhandled webhook event: ${eventType}`);
                    return { success: true, message: 'Event ignored' };
            }
        }
        catch (error) {
            console.error('Webhook handling error:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Webhook processing failed',
            };
        }
    }
    /**
     * Handle successful charge
     */
    async handleChargeSuccess(data) {
        try {
            const supabase = (0, supabase_1.createAdminClient)();
            const reference = data.reference;
            // Update pending order
            const { data: pendingOrder, error: pendingError } = await supabase
                .from('pending_orders')
                .update({
                payment_status: 'success',
                updated_at: new Date().toISOString(),
            })
                .eq('payment_reference', reference)
                .select()
                .single();
            if (pendingError || !pendingOrder) {
                console.error('Pending order not found for reference:', reference);
                return { success: false, message: 'Pending order not found' };
            }
            // Update payment transaction
            await supabase
                .from('payment_transactions')
                .update({
                status: 'success',
                paid_at: data.paid_at,
                provider_response: data,
                updated_at: new Date().toISOString(),
            })
                .eq('provider_reference', reference);
            console.log(`Payment successful for reference: ${reference}`);
            return { success: true, message: 'Payment processed' };
        }
        catch (error) {
            console.error('Handle charge success error:', error);
            return { success: false, message: 'Failed to process successful charge' };
        }
    }
    /**
     * Handle failed charge
     */
    async handleChargeFailed(data) {
        try {
            const supabase = (0, supabase_1.createAdminClient)();
            const reference = data.reference;
            // Update pending order
            await supabase
                .from('pending_orders')
                .update({
                payment_status: 'failed',
                updated_at: new Date().toISOString(),
            })
                .eq('payment_reference', reference);
            // Update payment transaction
            await supabase
                .from('payment_transactions')
                .update({
                status: 'failed',
                provider_response: data,
                updated_at: new Date().toISOString(),
            })
                .eq('provider_reference', reference);
            console.log(`Payment failed for reference: ${reference}`);
            return { success: true, message: 'Payment failure recorded' };
        }
        catch (error) {
            console.error('Handle charge failed error:', error);
            return { success: false, message: 'Failed to process failed charge' };
        }
    }
    /**
     * Get transaction status
     */
    async getTransactionStatus(reference) {
        try {
            const verification = await this.verifyTransaction(reference);
            return {
                success: true,
                status: verification.data.status,
                data: verification.data,
            };
        }
        catch (error) {
            return {
                success: false,
                status: 'unknown',
                error: error instanceof Error ? error.message : 'Failed to get status',
            };
        }
    }
    /**
     * Generate unique payment reference
     */
    generateReference(prefix = 'PAY') {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 10).toUpperCase();
        return `${prefix}-${timestamp}-${random}`;
    }
    /**
     * Convert amount to kobo (Paystack uses kobo for GHS)
     */
    toKobo(amount) {
        return Math.round(amount * 100);
    }
    /**
     * Convert kobo to cedis
     */
    fromKobo(kobo) {
        return kobo / 100;
    }
}
exports.PaystackService = PaystackService;
