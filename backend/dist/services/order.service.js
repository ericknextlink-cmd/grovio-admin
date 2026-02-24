"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderService = void 0;
const supabase_1 = require("../config/supabase");
const paystack_service_1 = require("./paystack.service");
const pdf_invoice_service_1 = require("./pdf-invoice.service");
const email_service_1 = require("./email.service");
const uuid_1 = require("uuid");
class OrderService {
    constructor() {
        this.paystack = new paystack_service_1.PaystackService();
        this.pdfService = new pdf_invoice_service_1.PDFInvoiceService();
        this.emailService = new email_service_1.EmailService();
        this.supabase = (0, supabase_1.createAdminClient)();
    }
    /**
     * Create pending order and initialize payment
     */
    async createPendingOrder(params) {
        try {
            const { userId, cartItems, deliveryAddress, discount = 0, credits = 0, deliveryNotes } = params;
            // 1. Get user details
            const { data: user, error: userError } = await this.supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();
            if (userError || !user) {
                return {
                    success: false,
                    error: 'User not found',
                };
            }
            // 2. Validate and fetch products
            const productIds = cartItems.map(item => item.productId);
            const { data: products, error: productsError } = await this.supabase
                .from('products')
                .select('*')
                .in('id', productIds);
            if (productsError || !products || products.length === 0) {
                return {
                    success: false,
                    error: 'Products not found',
                };
            }
            // 3. Validate stock availability
            for (const cartItem of cartItems) {
                const product = products.find(p => p.id === cartItem.productId);
                if (!product) {
                    return {
                        success: false,
                        error: `Product ${cartItem.productId} not found`,
                    };
                }
                if (!product.in_stock || product.quantity < cartItem.quantity) {
                    return {
                        success: false,
                        error: `Product "${product.name}" is out of stock or insufficient quantity`,
                    };
                }
            }
            // 4. Calculate totals
            let subtotal = 0;
            const cartSnapshot = cartItems.map(cartItem => {
                const product = products.find(p => p.id === cartItem.productId);
                const itemTotal = product.price * cartItem.quantity;
                subtotal += itemTotal;
                return {
                    productId: product.id,
                    name: product.name,
                    description: product.description,
                    price: product.price,
                    quantity: cartItem.quantity,
                    total: itemTotal,
                    category: product.category_name,
                    image: product.images?.[0] || null,
                };
            });
            const totalAmount = subtotal - discount - credits;
            if (totalAmount <= 0) {
                return {
                    success: false,
                    error: 'Total amount must be greater than 0',
                };
            }
            // 5. Create pending order
            const pendingOrderId = (0, uuid_1.v4)();
            const paymentReference = this.paystack.generateReference('GROV');
            const { data: pendingOrder, error: pendingError } = await this.supabase
                .from('pending_orders')
                .insert({
                pending_order_id: pendingOrderId,
                user_id: userId,
                cart_items: cartSnapshot,
                subtotal,
                discount,
                credits,
                total_amount: totalAmount,
                delivery_address: deliveryAddress,
                delivery_notes: deliveryNotes,
                payment_reference: paymentReference,
                payment_status: 'initialized',
                metadata: {
                    userEmail: user.email,
                    userName: `${user.first_name} ${user.last_name}`,
                },
            })
                .select()
                .single();
            if (pendingError) {
                console.error('Failed to create pending order:', pendingError);
                return {
                    success: false,
                    error: 'Failed to create order',
                };
            }
            // 6. Initialize payment with Paystack
            const frontendUrl = process.env.FRONTEND_URL || '';
            const paystackResult = await this.paystack.initializeTransaction({
                email: user.email,
                amount: this.paystack.toKobo(totalAmount), // Convert to kobo
                reference: paymentReference,
                callback_url: `${frontendUrl}/payment/callback?pending_order_id=${pendingOrderId}`,
                metadata: {
                    pending_order_id: pendingOrderId,
                    user_id: userId,
                    custom_fields: [
                        {
                            display_name: 'Order Reference',
                            variable_name: 'order_reference',
                            value: pendingOrderId,
                        },
                        {
                            display_name: 'Customer Name',
                            variable_name: 'customer_name',
                            value: `${user.first_name} ${user.last_name}`,
                        },
                    ],
                },
            });
            // 7. Update pending order with payment details
            await this.supabase
                .from('pending_orders')
                .update({
                payment_access_code: paystackResult.access_code,
                payment_authorization_url: paystackResult.authorization_url,
                payment_status: 'pending',
            })
                .eq('pending_order_id', pendingOrderId);
            // 8. Create payment transaction record
            await this.supabase
                .from('payment_transactions')
                .insert({
                transaction_id: paymentReference,
                pending_order_id: pendingOrder.id,
                user_id: userId,
                provider: 'paystack',
                provider_reference: paymentReference,
                provider_access_code: paystackResult.access_code,
                amount: totalAmount,
                currency: 'GHS',
                status: 'pending',
                customer_email: user.email,
            });
            return {
                success: true,
                pendingOrderId,
                paymentReference,
                authorizationUrl: paystackResult.authorization_url,
                accessCode: paystackResult.access_code,
                amount: totalAmount,
            };
        }
        catch (error) {
            console.error('Create pending order error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to create order',
            };
        }
    }
    /**
     * Verify payment and convert to confirmed order
     */
    async verifyPaymentAndCreateOrder(paymentReference) {
        try {
            // 1. Verify payment with Paystack
            const paymentVerification = await this.paystack.verifyTransaction(paymentReference);
            if (!paymentVerification.success || paymentVerification.data.status !== 'success') {
                return {
                    success: false,
                    error: 'Payment not successful',
                };
            }
            const paymentData = paymentVerification.data;
            // 2. Get pending order
            const { data: pendingOrder, error: pendingError } = await this.supabase
                .from('pending_orders')
                .select('*')
                .eq('payment_reference', paymentReference)
                .single();
            if (pendingError || !pendingOrder) {
                return {
                    success: false,
                    error: 'Pending order not found',
                };
            }
            // 3. Check if already converted
            if (pendingOrder.converted_to_order_id) {
                const { data: existingOrder } = await this.supabase
                    .from('orders')
                    .select('id, order_id, invoice_number, invoice_pdf_url, invoice_image_url')
                    .eq('id', pendingOrder.converted_to_order_id)
                    .single();
                if (existingOrder) {
                    return {
                        success: true,
                        orderId: existingOrder.id,
                        orderNumber: existingOrder.order_id,
                        invoiceNumber: existingOrder.invoice_number,
                        pdfUrl: existingOrder.invoice_pdf_url,
                        imageUrl: existingOrder.invoice_image_url,
                    };
                }
            }
            // 4. Generate order and invoice numbers
            const orderNumber = this.pdfService.generateOrderId();
            const invoiceNumber = this.pdfService.generateInvoiceNumber();
            // 5. Create confirmed order
            const { data: order, error: orderError } = await this.supabase
                .from('orders')
                .insert({
                order_id: orderNumber,
                invoice_number: invoiceNumber,
                user_id: pendingOrder.user_id,
                status: 'processing',
                subtotal: pendingOrder.subtotal,
                discount: pendingOrder.discount,
                credits: pendingOrder.credits,
                total_amount: pendingOrder.total_amount,
                currency: 'GHS',
                payment_method: 'paystack',
                payment_status: 'paid',
                payment_reference: paymentReference,
                payment_access_code: pendingOrder.payment_access_code,
                paid_at: paymentData.paid_at,
                delivery_address: pendingOrder.delivery_address,
                delivery_notes: pendingOrder.delivery_notes,
                metadata: {
                    paystack_transaction_id: paymentData.id,
                    payment_channel: paymentData.channel,
                    payment_fees: this.paystack.fromKobo(paymentData.fees),
                },
            })
                .select()
                .single();
            if (orderError) {
                console.error('Failed to create order:', orderError);
                return {
                    success: false,
                    error: 'Failed to create order',
                };
            }
            // 6. Create order items
            const orderItems = pendingOrder.cart_items.map((item) => ({
                order_id: order.id,
                product_id: item.productId,
                product_name: item.name,
                product_description: item.description ?? '',
                product_image: item.image,
                category_name: item.category,
                unit_price: item.price,
                quantity: item.quantity,
                total_price: item.total,
            }));
            await this.supabase
                .from('order_items')
                .insert(orderItems);
            // 7. Update product stock
            for (const item of pendingOrder.cart_items) {
                await this.supabase
                    .rpc('decrement_product_stock', {
                    product_id: item.productId,
                    quantity: item.quantity,
                });
            }
            // 8. Update payment transaction
            await this.supabase
                .from('payment_transactions')
                .update({
                order_id: order.id,
                status: 'success',
                provider_transaction_id: paymentData.id.toString(),
                payment_method: paymentData.authorization?.card_type || 'unknown',
                channel: paymentData.channel,
                card_type: paymentData.authorization?.card_type,
                bank: paymentData.authorization?.bank,
                fees: this.paystack.fromKobo(paymentData.fees),
                paid_at: paymentData.paid_at,
                provider_response: paymentData,
            })
                .eq('provider_reference', paymentReference);
            // 9. Mark pending order as converted
            await this.supabase
                .from('pending_orders')
                .update({
                payment_status: 'success',
                converted_to_order_id: order.id,
                converted_at: new Date().toISOString(),
            })
                .eq('id', pendingOrder.id);
            // 10. Generate invoice PDF
            const invoiceData = {
                invoiceNumber,
                orderNumber,
                date: new Date(),
                customerName: `${pendingOrder.metadata.userName}`,
                customerAddress: `${pendingOrder.delivery_address.street}, ${pendingOrder.delivery_address.city}, ${pendingOrder.delivery_address.region}`,
                customerPhone: pendingOrder.delivery_address.phone,
                customerEmail: pendingOrder.metadata.userEmail,
                items: pendingOrder.cart_items.map((item) => ({
                    description: item.name ?? '',
                    quantity: item.quantity ?? 0,
                    unitPrice: item.price ?? 0,
                    total: item.total ?? 0,
                })),
                subtotal: pendingOrder.subtotal,
                discount: pendingOrder.discount,
                credits: pendingOrder.credits,
                totalAmount: pendingOrder.total_amount,
                currency: 'GHS',
            };
            const invoiceResult = await this.pdfService.generateInvoice(invoiceData);
            if (invoiceResult.success) {
                // Update order with invoice URLs
                await this.supabase
                    .from('orders')
                    .update({
                    invoice_pdf_url: invoiceResult.pdfUrl,
                    invoice_image_url: invoiceResult.imageUrl,
                    invoice_qr_code: invoiceResult.qrCodeUrl,
                })
                    .eq('id', order.id);
                // Send invoice to customer email via Resend (non-blocking; don't fail order if email fails)
                const customerEmail = pendingOrder.metadata?.userEmail;
                if (customerEmail?.trim()) {
                    this.emailService
                        .sendInvoiceEmail(customerEmail, {
                        customerName: `${pendingOrder.metadata?.userName ?? 'Customer'}`,
                        orderNumber,
                        invoicePdfUrl: invoiceResult.pdfUrl ?? '',
                    })
                        .then((r) => {
                        if (!r.success)
                            console.warn('Invoice email failed:', r.errors);
                    })
                        .catch((err) => console.error('Invoice email error:', err));
                }
            }
            // 11. Record status history
            await this.supabase
                .from('order_status_history')
                .insert({
                order_id: order.id,
                old_status: null,
                new_status: 'processing',
                reason: 'Order created after successful payment',
            });
            return {
                success: true,
                orderId: order.id,
                orderNumber,
                invoiceNumber,
                pdfUrl: invoiceResult.pdfUrl,
                imageUrl: invoiceResult.imageUrl,
            };
        }
        catch (error) {
            console.error('Verify payment and create order error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Payment verification failed',
            };
        }
    }
    /**
     * Get order by ID
     */
    async getOrderById(orderId, userId) {
        try {
            const { data: order, error } = await this.supabase
                .from('orders')
                .select(`
          *,
          order_items (
            *,
            products (name, images)
          )
        `)
                .eq('id', orderId)
                .eq('user_id', userId)
                .single();
            if (error) {
                return null;
            }
            return order;
        }
        catch (error) {
            console.error('Get order error:', error);
            return null;
        }
    }
    /**
     * Get order by order number
     */
    async getOrderByOrderNumber(orderNumber, userId) {
        try {
            const { data: order, error } = await this.supabase
                .from('orders')
                .select(`
          *,
          order_items (
            *
          )
        `)
                .eq('order_id', orderNumber)
                .eq('user_id', userId)
                .single();
            if (error) {
                return null;
            }
            return order;
        }
        catch (error) {
            console.error('Get order by number error:', error);
            return null;
        }
    }
    /**
     * Get all orders for a user
     */
    async getUserOrders(userId, options = {}) {
        try {
            const { page = 1, limit = 20, status } = options;
            const offset = (page - 1) * limit;
            let query = this.supabase
                .from('orders')
                .select(`
          *,
          order_items (
            *
          )
        `, { count: 'exact' })
                .eq('user_id', userId)
                .order('created_at', { ascending: false });
            if (status) {
                query = query.eq('status', status);
            }
            const { data: orders, error, count } = await query
                .range(offset, offset + limit - 1);
            if (error) {
                return {
                    success: false,
                    error: error.message,
                };
            }
            return {
                success: true,
                data: orders || [],
                pagination: {
                    page,
                    limit,
                    total: count || 0,
                    totalPages: Math.ceil((count || 0) / limit),
                },
            };
        }
        catch (error) {
            console.error('Get user orders error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to fetch orders',
            };
        }
    }
    /**
     * Update order status
     */
    async updateOrderStatus(orderId, newStatus, userId, reason) {
        try {
            // Get current order
            const { data: order } = await this.supabase
                .from('orders')
                .select('*')
                .eq('id', orderId)
                .single();
            if (!order) {
                return {
                    success: false,
                    error: 'Order not found',
                };
            }
            const oldStatus = order.status;
            // Update status
            const { error: updateError } = await this.supabase
                .from('orders')
                .update({ status: newStatus })
                .eq('id', orderId);
            if (updateError) {
                return {
                    success: false,
                    error: updateError.message,
                };
            }
            // Record status history
            await this.supabase
                .from('order_status_history')
                .insert({
                order_id: orderId,
                old_status: oldStatus,
                new_status: newStatus,
                changed_by: userId || null,
                reason,
            });
            return { success: true };
        }
        catch (error) {
            console.error('Update order status error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to update status',
            };
        }
    }
    /**
     * Cancel order
     */
    async cancelOrder(orderId, userId, reason) {
        try {
            const { data: order } = await this.supabase
                .from('orders')
                .select('*')
                .eq('id', orderId)
                .eq('user_id', userId)
                .single();
            if (!order) {
                return {
                    success: false,
                    error: 'Order not found',
                };
            }
            // Can only cancel pending/processing orders
            if (!['pending', 'processing'].includes(order.status)) {
                return {
                    success: false,
                    error: `Cannot cancel order in ${order.status} status`,
                };
            }
            // Update status to cancelled
            const result = await this.updateOrderStatus(orderId, 'cancelled', userId, reason || 'Cancelled by customer');
            if (!result.success) {
                return result;
            }
            // Restore product stock
            const { data: orderItems } = await this.supabase
                .from('order_items')
                .select('*')
                .eq('order_id', orderId);
            if (orderItems) {
                for (const item of orderItems) {
                    await this.supabase
                        .rpc('increment_product_stock', {
                        product_id: item.product_id,
                        quantity: item.quantity,
                    });
                }
            }
            return { success: true };
        }
        catch (error) {
            console.error('Cancel order error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to cancel order',
            };
        }
    }
    /**
     * Cancel pending order (before payment)
     */
    async cancelPendingOrder(pendingOrderId, userId) {
        try {
            const { error } = await this.supabase
                .from('pending_orders')
                .update({
                payment_status: 'cancelled',
            })
                .eq('pending_order_id', pendingOrderId)
                .eq('user_id', userId);
            if (error) {
                return {
                    success: false,
                    error: error.message,
                };
            }
            // Update payment transaction
            await this.supabase
                .from('payment_transactions')
                .update({ status: 'cancelled' })
                .eq('pending_order_id', pendingOrderId);
            return { success: true };
        }
        catch (error) {
            console.error('Cancel pending order error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to cancel',
            };
        }
    }
    /**
     * Get pending order details
     */
    async getPendingOrder(pendingOrderId, userId) {
        try {
            const { data: pendingOrder, error } = await this.supabase
                .from('pending_orders')
                .select('*')
                .eq('pending_order_id', pendingOrderId)
                .eq('user_id', userId)
                .single();
            if (error) {
                return null;
            }
            return pendingOrder;
        }
        catch (error) {
            console.error('Get pending order error:', error);
            return null;
        }
    }
    /**
     * Check payment status
     */
    async checkPaymentStatus(reference) {
        try {
            const result = await this.paystack.getTransactionStatus(reference);
            return result;
        }
        catch (error) {
            return {
                success: false,
                status: 'unknown',
                error: error instanceof Error ? error.message : 'Failed to check status',
            };
        }
    }
    /**
     * Get order statistics for admin
     */
    async getOrderStats() {
        try {
            const { data: orders } = await this.supabase
                .from('orders')
                .select('*');
            if (!orders) {
                return null;
            }
            const stats = {
                totalOrders: orders.length,
                pendingOrders: orders.filter(o => o.status === 'pending').length,
                processingOrders: orders.filter(o => o.status === 'processing').length,
                shippedOrders: orders.filter(o => o.status === 'shipped').length,
                deliveredOrders: orders.filter(o => o.status === 'delivered').length,
                cancelledOrders: orders.filter(o => o.status === 'cancelled').length,
                totalRevenue: orders
                    .filter(o => o.payment_status === 'paid')
                    .reduce((sum, o) => sum + parseFloat(o.total_amount), 0),
                averageOrderValue: orders.length > 0
                    ? orders.reduce((sum, o) => sum + parseFloat(o.total_amount), 0) / orders.length
                    : 0,
            };
            return stats;
        }
        catch (error) {
            console.error('Get order stats error:', error);
            return null;
        }
    }
    /**
     * Cleanup expired pending orders (run periodically)
     */
    async cleanupExpiredPendingOrders() {
        try {
            await this.supabase.rpc('cleanup_expired_pending_orders');
            console.log('Cleaned up expired pending orders');
        }
        catch (error) {
            console.error('Cleanup expired orders error:', error);
        }
    }
}
exports.OrderService = OrderService;
