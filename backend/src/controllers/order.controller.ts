import { Request, Response } from 'express'
import { OrderService } from '../services/order.service'
import { PaystackService } from '../services/paystack.service'
import { ApiResponse } from '../types/api.types'

export interface AuthRequest extends Request {
  user?: {
    id: string
    email: string
    role: string
  }
}

export class OrderController {
  private orderService: OrderService
  private paystackService: PaystackService

  constructor() {
    this.orderService = new OrderService()
    this.paystackService = new PaystackService()
  }

  /**
   * Create pending order and initialize payment
   */
  createOrder = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          errors: ['Please sign in to create an order'],
        } as ApiResponse)
        return
      }

      const { cartItems, deliveryAddress, discount, credits, deliveryNotes } = req.body

      if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Cart items are required',
          errors: ['Cart cannot be empty'],
        } as ApiResponse)
        return
      }

      if (!deliveryAddress || !deliveryAddress.street || !deliveryAddress.city || !deliveryAddress.phone) {
        res.status(400).json({
          success: false,
          message: 'Complete delivery address is required',
          errors: ['Missing delivery address fields'],
        } as ApiResponse)
        return
      }

      const result = await this.orderService.createPendingOrder({
        userId,
        cartItems,
        deliveryAddress,
        discount,
        credits,
        deliveryNotes,
      })

      if (result.success) {
        res.status(201).json({
          success: true,
          message: 'Order created successfully. Please complete payment.',
          data: {
            pendingOrderId: result.pendingOrderId,
            paymentReference: result.paymentReference,
            authorizationUrl: result.authorizationUrl,
            accessCode: result.accessCode,
            amount: result.amount,
          },
        })
      } else {
        res.status(400).json({
          success: false,
          message: result.error || 'Failed to create order',
          errors: [result.error || 'Order creation failed'],
        } as ApiResponse)
      }
    } catch (error) {
      console.error('Create order controller error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: ['Failed to create order'],
      } as ApiResponse)
    }
  }

  /**
   * Verify payment and complete order
   */
  verifyPayment = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { reference } = req.body

      if (!reference) {
        res.status(400).json({
          success: false,
          message: 'Payment reference is required',
          errors: ['Missing reference parameter'],
        } as ApiResponse)
        return
      }

      const result = await this.orderService.verifyPaymentAndCreateOrder(reference)

      if (result.success) {
        res.json({
          success: true,
          message: 'Payment verified and order created successfully',
          data: {
            orderId: result.orderId,
            orderNumber: result.orderNumber,
            invoiceNumber: result.invoiceNumber,
            pdfUrl: result.pdfUrl,
            imageUrl: result.imageUrl,
          },
        })
      } else {
        res.status(400).json({
          success: false,
          message: result.error || 'Payment verification failed',
          errors: [result.error || 'Verification failed'],
        } as ApiResponse)
      }
    } catch (error) {
      console.error('Verify payment controller error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: ['Payment verification failed'],
      } as ApiResponse)
    }
  }

  /**
   * Check payment status
   */
  checkPaymentStatus = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { reference } = req.query

      if (!reference || typeof reference !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Payment reference is required',
          errors: ['Missing reference parameter'],
        } as ApiResponse)
        return
      }

      const result = await this.orderService.checkPaymentStatus(reference)

      res.json({
        success: result.success,
        message: result.success ? 'Payment status retrieved' : 'Failed to get status',
        data: {
          status: result.status,
          details: result.data,
        },
      })
    } catch (error) {
      console.error('Check payment status controller error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: ['Failed to check payment status'],
      } as ApiResponse)
    }
  }

  /**
   * Paystack webhook handler
   */
  handleWebhook = async (req: Request, res: Response): Promise<void> => {
    try {
      const signature = req.headers['x-paystack-signature'] as string
      const payload = JSON.stringify(req.body)

      // Verify webhook signature
      const isValid = this.paystackService.verifyWebhookSignature(signature, payload)

      if (!isValid) {
        console.error('Invalid webhook signature')
        res.status(400).json({
          success: false,
          message: 'Invalid signature',
        })
        return
      }

      // Process webhook
      const result = await this.paystackService.handleWebhook(req.body)

      res.json({
        success: result.success,
        message: result.message,
      })
    } catch (error) {
      console.error('Webhook handler error:', error)
      res.status(500).json({
        success: false,
        message: 'Webhook processing failed',
      })
    }
  }

  /**
   * Get user's orders
   */
  getUserOrders = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          errors: ['Please sign in'],
        } as ApiResponse)
        return
      }

      const { page, limit, status } = req.query

      const result = await this.orderService.getUserOrders(userId, {
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
        status: status as string,
      })

      if (result.success) {
        res.json({
          success: true,
          message: 'Orders retrieved successfully',
          data: result.data,
          pagination: result.pagination,
        })
      } else {
        res.status(500).json({
          success: false,
          message: result.error || 'Failed to fetch orders',
          errors: [result.error || 'Fetch failed'],
        } as ApiResponse)
      }
    } catch (error) {
      console.error('Get user orders controller error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: ['Failed to fetch orders'],
      } as ApiResponse)
    }
  }

  /**
   * Get single order details
   */
  getOrderById = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id
      const { id } = req.params
      const orderId = Array.isArray(id) ? id[0] : id

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          errors: ['Please sign in'],
        } as ApiResponse)
        return
      }

      const order = await this.orderService.getOrderById(orderId, userId)

      if (order) {
        res.json({
          success: true,
          message: 'Order retrieved successfully',
          data: order,
        })
      } else {
        res.status(404).json({
          success: false,
          message: 'Order not found',
          errors: ['Order does not exist or access denied'],
        } as ApiResponse)
      }
    } catch (error) {
      console.error('Get order by ID controller error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: ['Failed to fetch order'],
      } as ApiResponse)
    }
  }

  /**
   * Get order by order number
   */
  getOrderByNumber = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id
      const { orderNumber } = req.params
      const number = Array.isArray(orderNumber) ? orderNumber[0] : orderNumber

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          errors: ['Please sign in'],
        } as ApiResponse)
        return
      }

      const order = await this.orderService.getOrderByOrderNumber(number, userId)

      if (order) {
        res.json({
          success: true,
          message: 'Order retrieved successfully',
          data: order,
        })
      } else {
        res.status(404).json({
          success: false,
          message: 'Order not found',
          errors: ['Order does not exist or access denied'],
        } as ApiResponse)
      }
    } catch (error) {
      console.error('Get order by number controller error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: ['Failed to fetch order'],
      } as ApiResponse)
    }
  }

  /**
   * Cancel order
   */
  cancelOrder = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id
      const { id } = req.params
      const orderId = Array.isArray(id) ? id[0] : id
      const { reason } = req.body

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          errors: ['Please sign in'],
        } as ApiResponse)
        return
      }

      const result = await this.orderService.cancelOrder(orderId, userId, reason)

      if (result.success) {
        res.json({
          success: true,
          message: 'Order cancelled successfully',
        })
      } else {
        res.status(400).json({
          success: false,
          message: result.error || 'Failed to cancel order',
          errors: [result.error || 'Cancellation failed'],
        } as ApiResponse)
      }
    } catch (error) {
      console.error('Cancel order controller error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: ['Failed to cancel order'],
      } as ApiResponse)
    }
  }

  /**
   * Cancel pending order
   */
  cancelPendingOrder = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id
      const { pendingOrderId } = req.params
      const id = Array.isArray(pendingOrderId) ? pendingOrderId[0] : pendingOrderId

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          errors: ['Please sign in'],
        } as ApiResponse)
        return
      }

      const result = await this.orderService.cancelPendingOrder(id, userId)

      if (result.success) {
        res.json({
          success: true,
          message: 'Pending order cancelled successfully',
        })
      } else {
        res.status(400).json({
          success: false,
          message: result.error || 'Failed to cancel pending order',
          errors: [result.error || 'Cancellation failed'],
        } as ApiResponse)
      }
    } catch (error) {
      console.error('Cancel pending order controller error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: ['Failed to cancel pending order'],
      } as ApiResponse)
    }
  }

  /**
   * Get pending order details
   */
  getPendingOrder = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id
      const { pendingOrderId } = req.params
      const id = Array.isArray(pendingOrderId) ? pendingOrderId[0] : pendingOrderId

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          errors: ['Please sign in'],
        } as ApiResponse)
        return
      }

      const pendingOrder = await this.orderService.getPendingOrder(id, userId)

      if (pendingOrder) {
        res.json({
          success: true,
          message: 'Pending order retrieved successfully',
          data: pendingOrder,
        })
      } else {
        res.status(404).json({
          success: false,
          message: 'Pending order not found',
          errors: ['Order does not exist or access denied'],
        } as ApiResponse)
      }
    } catch (error) {
      console.error('Get pending order controller error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: ['Failed to fetch pending order'],
      } as ApiResponse)
    }
  }

  /**
   * Update order status (Admin only)
   */
  updateOrderStatus = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params
      const orderId = Array.isArray(id) ? id[0] : id
      const { status, reason } = req.body
      const userId = req.user?.id

      const result = await this.orderService.updateOrderStatus(orderId, status, userId, reason)

      if (result.success) {
        res.json({
          success: true,
          message: 'Order status updated successfully',
        })
      } else {
        res.status(400).json({
          success: false,
          message: result.error || 'Failed to update status',
          errors: [result.error || 'Update failed'],
        } as ApiResponse)
      }
    } catch (error) {
      console.error('Update order status controller error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: ['Failed to update order status'],
      } as ApiResponse)
    }
  }

  /**
   * Get order statistics (Admin only)
   */
  getOrderStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = await this.orderService.getOrderStats()

      res.json({
        success: true,
        message: 'Order statistics retrieved successfully',
        data: stats,
      })
    } catch (error) {
      console.error('Get order stats controller error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: ['Failed to fetch statistics'],
      } as ApiResponse)
    }
  }
}

