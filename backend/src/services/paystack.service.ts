import axios, { AxiosInstance } from 'axios'
import { createAdminClient } from '../config/supabase'

/**
 * Paystack Payment Service
 * Handles payment initialization, verification, and webhooks
 */

export interface PaystackInitializeParams {
  email: string
  amount: number  // Amount in kobo (GHS * 100)
  reference: string  // Unique transaction reference
  callback_url?: string
  metadata?: Record<string, any>
  channels?: string[]  // ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer']
}

export interface PaystackInitializeResponse {
  success: boolean
  authorization_url: string
  access_code: string
  reference: string
}

export interface PaystackVerifyResponse {
  success: boolean
  data: {
    id: number
    domain: string
    status: 'success' | 'failed' | 'abandoned'
    reference: string
    amount: number  // In kobo
    message: string | null
    gateway_response: string
    paid_at: string | null
    created_at: string
    channel: string
    currency: string
    ip_address: string
    metadata: Record<string, any>
    fees: number
    customer: {
      id: number
      email: string
      customer_code: string
    }
    authorization: {
      authorization_code: string
      bin: string
      last4: string
      exp_month: string
      exp_year: string
      channel: string
      card_type: string
      bank: string
      country_code: string
      brand: string
    }
  }
}

export class PaystackService {
  private client: AxiosInstance
  private secretKey: string
  private publicKey: string

  constructor() {
    this.secretKey = process.env.PAYSTACK_SECRET_KEY || ''
    this.publicKey = process.env.PAYSTACK_PUBLIC_KEY || ''

    if (!this.secretKey) {
      console.warn('⚠️  PAYSTACK_SECRET_KEY not set. Payment features will be disabled.')
    }

    if (!this.publicKey) {
      console.warn('⚠️  PAYSTACK_PUBLIC_KEY not set. Payment features will be disabled.')
    }

    this.client = axios.create({
      baseURL: 'https://api.paystack.co',
      headers: {
        'Authorization': `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    })
  }

  /**
   * Initialize payment transaction
   * Returns authorization URL for user to complete payment
   */
  async initializeTransaction(params: PaystackInitializeParams): Promise<PaystackInitializeResponse> {
    try {
      if (!this.secretKey) {
        throw new Error('Paystack is not configured. Please set PAYSTACK_SECRET_KEY.')
      }

      const response = await this.client.post('/transaction/initialize', {
        email: params.email,
        amount: params.amount,  // Must be in kobo (multiply GHS by 100)
        reference: params.reference,
        callback_url: params.callback_url,
        metadata: params.metadata,
        channels: params.channels || ['card', 'bank', 'ussd', 'mobile_money'],
      })

      if (response.data.status) {
        return {
          success: true,
          authorization_url: response.data.data.authorization_url,
          access_code: response.data.data.access_code,
          reference: response.data.data.reference,
        }
      } else {
        throw new Error(response.data.message || 'Failed to initialize payment')
      }
    } catch (error: any) {
      console.error('Paystack initialization error:', error.response?.data || error.message)
      throw new Error(
        error.response?.data?.message || 
        error.message || 
        'Failed to initialize payment with Paystack'
      )
    }
  }

  /**
   * Verify payment transaction
   * Checks if payment was successful
   */
  async verifyTransaction(reference: string): Promise<PaystackVerifyResponse> {
    try {
      if (!this.secretKey) {
        throw new Error('Paystack is not configured')
      }

      const response = await this.client.get(`/transaction/verify/${reference}`)

      if (response.data.status) {
        return {
          success: true,
          data: response.data.data,
        }
      } else {
        throw new Error(response.data.message || 'Payment verification failed')
      }
    } catch (error: any) {
      console.error('Paystack verification error:', error.response?.data || error.message)
      throw new Error(
        error.response?.data?.message || 
        error.message || 
        'Failed to verify payment'
      )
    }
  }

  /**
   * Verify webhook signature
   * Ensures webhook is from Paystack
   */
  verifyWebhookSignature(signature: string, payload: string): boolean {
    try {
      if (!this.secretKey) {
        console.error('Cannot verify webhook: PAYSTACK_SECRET_KEY not set')
        return false
      }

      const crypto = require('crypto')
      const hash = crypto
        .createHmac('sha512', this.secretKey)
        .update(payload)
        .digest('hex')

      return hash === signature
    } catch (error) {
      console.error('Webhook signature verification error:', error)
      return false
    }
  }

  /**
   * Handle webhook event from Paystack
   */
  async handleWebhook(event: any): Promise<{
    success: boolean
    message: string
  }> {
    try {
      const { event: eventType, data } = event

      switch (eventType) {
        case 'charge.success':
          return await this.handleChargeSuccess(data)
        
        case 'charge.failed':
          return await this.handleChargeFailed(data)
        
        case 'transfer.success':
        case 'transfer.failed':
        case 'transfer.reversed':
          // Handle refunds
          console.log(`Transfer event: ${eventType}`, data)
          return { success: true, message: 'Transfer event processed' }
        
        default:
          console.log(`Unhandled webhook event: ${eventType}`)
          return { success: true, message: 'Event ignored' }
      }
    } catch (error) {
      console.error('Webhook handling error:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Webhook processing failed',
      }
    }
  }

  /**
   * Handle successful charge
   */
  private async handleChargeSuccess(data: any): Promise<{ success: boolean; message: string }> {
    try {
      const supabase = createAdminClient()
      const reference = data.reference

      // Update pending order
      const { data: pendingOrder, error: pendingError } = await supabase
        .from('pending_orders')
        .update({
          payment_status: 'success',
          updated_at: new Date().toISOString(),
        })
        .eq('payment_reference', reference)
        .select()
        .single()

      if (pendingError || !pendingOrder) {
        console.error('Pending order not found for reference:', reference)
        return { success: false, message: 'Pending order not found' }
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
        .eq('provider_reference', reference)

      console.log(`✅ Payment successful for reference: ${reference}`)
      return { success: true, message: 'Payment processed' }
    } catch (error) {
      console.error('Handle charge success error:', error)
      return { success: false, message: 'Failed to process successful charge' }
    }
  }

  /**
   * Handle failed charge
   */
  private async handleChargeFailed(data: any): Promise<{ success: boolean; message: string }> {
    try {
      const supabase = createAdminClient()
      const reference = data.reference

      // Update pending order
      await supabase
        .from('pending_orders')
        .update({
          payment_status: 'failed',
          updated_at: new Date().toISOString(),
        })
        .eq('payment_reference', reference)

      // Update payment transaction
      await supabase
        .from('payment_transactions')
        .update({
          status: 'failed',
          provider_response: data,
          updated_at: new Date().toISOString(),
        })
        .eq('provider_reference', reference)

      console.log(`❌ Payment failed for reference: ${reference}`)
      return { success: true, message: 'Payment failure recorded' }
    } catch (error) {
      console.error('Handle charge failed error:', error)
      return { success: false, message: 'Failed to process failed charge' }
    }
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(reference: string): Promise<{
    success: boolean
    status: string
    data?: any
    error?: string
  }> {
    try {
      const verification = await this.verifyTransaction(reference)
      
      return {
        success: true,
        status: verification.data.status,
        data: verification.data,
      }
    } catch (error) {
      return {
        success: false,
        status: 'unknown',
        error: error instanceof Error ? error.message : 'Failed to get status',
      }
    }
  }

  /**
   * Generate unique payment reference
   */
  generateReference(prefix: string = 'PAY'): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 10).toUpperCase()
    return `${prefix}-${timestamp}-${random}`
  }

  /**
   * Convert amount to kobo (Paystack uses kobo for GHS)
   */
  toKobo(amount: number): number {
    return Math.round(amount * 100)
  }

  /**
   * Convert kobo to cedis
   */
  fromKobo(kobo: number): number {
    return kobo / 100
  }
}

