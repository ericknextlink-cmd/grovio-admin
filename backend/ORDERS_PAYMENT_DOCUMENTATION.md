

# 📦 Orders & Payment System Documentation

## Overview

Complete implementation of orders management and Paystack payment integration with automated PDF invoice generation.

**Version:** 1.0.0  
**Payment Provider:** Paystack  
**Invoice Format:** PDF + PNG + QR Code  
**Storage:** Supabase Storage  

---

## 🎯 System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                         FRONTEND                              │
│  1. User adds items to cart                                  │
│  2. Proceeds to checkout                                     │
│  3. Submits delivery address                                 │
└────────────────────┬─────────────────────────────────────────┘
                     │ POST /api/orders
                     ▼
┌──────────────────────────────────────────────────────────────┐
│                    BACKEND - CREATE PENDING ORDER             │
│  1. Validates cart items & stock                             │
│  2. Creates pending_order (UUID)                             │
│  3. Generates payment reference (GROV-timestamp-random)      │
│  4. Initializes Paystack payment                             │
│  5. Returns authorization_url                                │
└────────────────────┬─────────────────────────────────────────┘
                     │ Returns: { authorizationUrl, reference }
                     ▼
┌──────────────────────────────────────────────────────────────┐
│                    FRONTEND - PAYMENT                         │
│  1. Opens Paystack payment page (iframe or popup)            │
│  2. User completes payment                                   │
│  3. Paystack redirects to callback_url                       │
└────────────────────┬─────────────────────────────────────────┘
                     │ Callback: /payment/callback?pending_order_id=xxx
                     ▼
┌──────────────────────────────────────────────────────────────┐
│                    FRONTEND - VERIFY                          │
│  1. Extracts reference from callback                         │
│  2. Calls POST /api/orders/verify-payment                    │
└────────────────────┬─────────────────────────────────────────┘
                     │ POST { reference }
                     ▼
┌──────────────────────────────────────────────────────────────┐
│                 BACKEND - VERIFY & CREATE ORDER               │
│  1. Verifies payment with Paystack API                       │
│  2. Generates Order ID (ORD-AC23-233E)                       │
│  3. Generates Invoice Number (4787837473)                    │
│  4. Creates confirmed order in database                      │
│  5. Creates order_items entries                              │
│  6. Decrements product stock                                 │
│  7. Generates invoice PDF with QR code                       │
│  8. Uploads PDF, PNG, QR to Supabase storage                 │
│  9. Updates order with invoice URLs                          │
│  10. Returns order details with PDF/image links              │
└────────────────────┬─────────────────────────────────────────┘
                     │ Returns: { orderNumber, pdfUrl, imageUrl }
                     ▼
┌──────────────────────────────────────────────────────────────┐
│                    FRONTEND - SUCCESS                         │
│  1. Shows order confirmation                                 │
│  2. Displays invoice (PDF/Image)                             │
│  3. Provides download links                                  │
│  4. Shows QR code for mobile access                          │
└──────────────────────────────────────────────────────────────┘
```

---

## 🔐 Security Features

### Payment Security
- ✅ **Webhook signature verification** - Validates all Paystack webhooks
- ✅ **Amount validation** - Backend recalculates totals (never trusts client)
- ✅ **Stock validation** - Checks availability before charging
- ✅ **User authentication** - JWT required for all order endpoints
- ✅ **RLS policies** - Users can only access their own orders

### Data Privacy
- ✅ **No PII in URLs** - Order IDs are random, not sequential
- ✅ **Secure storage** - Invoices in Supabase with access control
- ✅ **Payment data encryption** - Paystack handles card data
- ✅ **Audit trail** - Order status history tracked

---

## 📊 Database Schema

### Tables Created

#### 1. `orders` - Confirmed orders
```sql
Fields:
- id (UUID) - Primary key
- order_id (TEXT) - Human-readable: ORD-AC23-233E
- invoice_number (TEXT) - Numeric: 4787837473
- user_id (UUID) - Customer
- status - pending, processing, shipped, delivered, cancelled, failed
- payment_status - pending, paid, failed, refunded, cancelled
- payment_reference - Paystack reference
- subtotal, discount, credits, total_amount
- delivery_address (JSONB)
- invoice_pdf_url, invoice_image_url, invoice_qr_code
- created_at, updated_at
```

#### 2. `pending_orders` - Awaiting payment
```sql
Fields:
- id (UUID)
- pending_order_id (UUID) - Temporary identifier
- user_id (UUID)
- cart_items (JSONB) - Cart snapshot
- payment_reference - Paystack reference
- payment_authorization_url - Paystack payment link
- payment_status - initialized, pending, success, failed, cancelled
- converted_to_order_id - Links to final order
- expires_at - Auto-cleanup after 24 hours
```

#### 3. `order_items` - Line items
```sql
Fields:
- order_id (UUID) - Links to order
- product_id (UUID) - Product reference
- product_name - Snapshot at time of order
- unit_price, quantity, total_price
```

#### 4. `payment_transactions` - Payment history
```sql
Fields:
- transaction_id - Unique
- provider_reference - Paystack reference
- order_id, pending_order_id, user_id
- amount, fees, currency
- status, payment_method, channel
- provider_response (JSONB) - Full Paystack data
```

#### 5. `order_status_history` - Audit trail
```sql
Fields:
- order_id
- old_status, new_status
- changed_by, reason
- created_at
```

---

## 🛣️ API Endpoints

### 1. Create Order & Initialize Payment

**POST** `/api/orders`

**Auth:** Required  
**Request:**
```json
{
  "cartItems": [
    {
      "productId": "product-uuid",
      "quantity": 2
    }
  ],
  "deliveryAddress": {
    "street": "123 Main St",
    "city": "Accra",
    "region": "Greater Accra",
    "phone": "+233241234567",
    "additionalInfo": "Gate code: 1234"
  },
  "discount": 10.00,
  "credits": 5.00,
  "deliveryNotes": "Call on arrival"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Order created successfully. Please complete payment.",
  "data": {
    "pendingOrderId": "uuid-here",
    "paymentReference": "GROV-1730000000-ABC123XY",
    "authorizationUrl": "https://checkout.paystack.com/xyz",
    "accessCode": "xyz123abc",
    "amount": 150.00
  }
}
```

**Frontend Action:**
```typescript
// Open payment page
window.open(data.authorizationUrl, 'Paystack', 'width=600,height=700')
// OR
iframe.src = data.authorizationUrl
```

---

### 2. Verify Payment & Complete Order

**POST** `/api/orders/verify-payment`

**Auth:** Required  
**Request:**
```json
{
  "reference": "GROV-1730000000-ABC123XY"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment verified and order created successfully",
  "data": {
    "orderId": "order-uuid",
    "orderNumber": "ORD-AC23-233E",
    "invoiceNumber": "4787837473",
    "pdfUrl": "https://xxxxx.supabase.co/storage/v1/object/public/invoices/pdf/4787837473.pdf",
    "imageUrl": "https://xxxxx.supabase.co/storage/v1/object/public/invoices/images/4787837473.png"
  }
}
```

---

### 3. Check Payment Status

**GET** `/api/orders/payment-status?reference=GROV-xxx`

**Auth:** Required  
**Response:**
```json
{
  "success": true,
  "message": "Payment status retrieved",
  "data": {
    "status": "success",
    "details": {
      "amount": 15000,
      "currency": "GHS",
      "paid_at": "2025-10-10T10:00:00Z",
      "channel": "card",
      "card_type": "visa"
    }
  }
}
```

---

### 4. Get User Orders

**GET** `/api/orders?page=1&limit=20&status=processing`

**Auth:** Required  
**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `status`: Filter by status (optional)

**Response:**
```json
{
  "success": true,
  "message": "Orders retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "order_id": "ORD-AC23-233E",
      "invoice_number": "4787837473",
      "status": "processing",
      "payment_status": "paid",
      "total_amount": 150.00,
      "delivery_address": {...},
      "invoice_pdf_url": "https://...",
      "invoice_image_url": "https://...",
      "order_items": [...],
      "created_at": "2025-10-10T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

---

### 5. Get Order by ID

**GET** `/api/orders/:id`

**Auth:** Required  
**Response:**
```json
{
  "success": true,
  "message": "Order retrieved successfully",
  "data": {
    "id": "uuid",
    "order_id": "ORD-AC23-233E",
    "invoice_number": "4787837473",
    "status": "delivered",
    "payment_status": "paid",
    "subtotal": 140.00,
    "discount": 10.00,
    "credits": 5.00,
    "total_amount": 125.00,
    "delivery_address": {
      "street": "123 Main St",
      "city": "Accra",
      "region": "Greater Accra",
      "phone": "+233241234567"
    },
    "invoice_pdf_url": "https://...",
    "invoice_image_url": "https://...",
    "invoice_qr_code": "https://...",
    "order_items": [
      {
        "id": "item-uuid",
        "product_name": "Royal Basmati Rice",
        "quantity": 2,
        "unit_price": 130.00,
        "total_price": 260.00
      }
    ],
    "paid_at": "2025-10-10T10:00:00Z",
    "created_at": "2025-10-10T10:00:00Z",
    "updated_at": "2025-10-10T11:00:00Z"
  }
}
```

---

### 6. Cancel Order

**POST** `/api/orders/:id/cancel`

**Auth:** Required  
**Request:**
```json
{
  "reason": "Changed my mind"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Order cancelled successfully"
}
```

**Note:** Can only cancel orders in `pending` or `processing` status. Stock is restored automatically.

---

### 7. Get Pending Order

**GET** `/api/orders/pending/:pendingOrderId`

**Auth:** Required  
**Response:**
```json
{
  "success": true,
  "message": "Pending order retrieved successfully",
  "data": {
    "pending_order_id": "uuid",
    "cart_items": [...],
    "total_amount": 150.00,
    "payment_reference": "GROV-xxx",
    "payment_authorization_url": "https://checkout.paystack.com/xxx",
    "payment_status": "pending",
    "expires_at": "2025-10-11T10:00:00Z"
  }
}
```

---

### 8. Cancel Pending Order

**POST** `/api/orders/pending/:pendingOrderId/cancel`

**Auth:** Required  
**Response:**
```json
{
  "success": true,
  "message": "Pending order cancelled successfully"
}
```

---

### 9. Paystack Webhook

**POST** `/api/webhook/paystack`

**Auth:** None (verified by signature)  
**Headers:**
- `x-paystack-signature`: Webhook signature from Paystack

**Body:** (from Paystack)
```json
{
  "event": "charge.success",
  "data": {
    "reference": "GROV-xxx",
    "amount": 15000,
    "status": "success",
    ...
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Webhook processed"
}
```

**Webhook URL to configure in Paystack:**
```
https://your-backend-domain.com/api/webhook/paystack
```

---

### 10. Update Order Status (Admin)

**PUT** `/api/orders/:id/status`

**Auth:** Admin Only  
**Request:**
```json
{
  "status": "shipped",
  "reason": "Package dispatched with courier ABC"
}
```

**Status Values:**
- `pending` - Awaiting processing
- `processing` - Being prepared
- `shipped` - Out for delivery
- `delivered` - Completed
- `cancelled` - Cancelled
- `failed` - Processing failed

---

### 11. Get Order Statistics (Admin)

**GET** `/api/orders/admin/stats`

**Auth:** Admin Only  
**Response:**
```json
{
  "success": true,
  "message": "Order statistics retrieved successfully",
  "data": {
    "totalOrders": 150,
    "pendingOrders": 10,
    "processingOrders": 25,
    "shippedOrders": 30,
    "deliveredOrders": 75,
    "cancelledOrders": 10,
    "totalRevenue": 125000.00,
    "averageOrderValue": 833.33
  }
}
```

---

## 💳 Paystack Integration

### Configuration

**Environment Variables:**
```bash
PAYSTACK_PUBLIC_KEY=pk_test_your_public_key
PAYSTACK_SECRET_KEY=sk_test_your_secret_key
PAYSTACK_CALLBACK_URL=https://your-frontend.com/payment/callback
```

**Get Keys:**
1. Go to https://dashboard.paystack.com/settings/developer
2. Copy Public Key and Secret Key
3. Add to `backend/.env`

### Payment Flow

```typescript
// 1. Initialize payment
const response = await fetch('/api/orders', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    cartItems: [{ productId: 'xxx', quantity: 2 }],
    deliveryAddress: { street: '...', city: '...', region: '...', phone: '...' }
  })
})

const { authorizationUrl, paymentReference } = await response.json().then(r => r.data)

// 2. Open Paystack payment page
window.open(authorizationUrl)

// 3. User completes payment
// Paystack redirects to: your-frontend.com/payment/callback?reference=xxx

// 4. Verify payment
const verifyResponse = await fetch('/api/orders/verify-payment', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ reference: paymentReference })
})

const { orderNumber, pdfUrl, imageUrl } = await verifyResponse.json().then(r => r.data)

// 5. Show order confirmation with invoice
console.log(`Order ${orderNumber} created!`)
console.log(`Invoice PDF: ${pdfUrl}`)
console.log(`Invoice Image: ${imageUrl}`)
```

### Webhook Setup

**Configure in Paystack Dashboard:**
1. Go to Settings → Webhooks
2. Add webhook URL: `https://your-backend.com/api/webhook/paystack`
3. Events to listen for:
   - `charge.success`
   - `charge.failed`

**Purpose:**
- Real-time payment status updates
- Handles edge cases (user closes browser, network issues)
- Ensures order is created even if verify endpoint isn't called

---

## 📄 PDF Invoice Generation

### Features

✅ **Professional PDF invoices** using Template.pdf  
✅ **Automated generation** after payment success  
✅ **QR code** for mobile verification  
✅ **PNG image** version for easy viewing  
✅ **Supabase storage** with public URLs  
✅ **Invoice numbers** in format: 4787837473  
✅ **Order IDs** in format: ORD-AC23-233E  

### Invoice Data Includes

- Invoice Number (4787837473)
- Order Number (ORD-AC23-233E)
- Date
- Billed To (customer name, address, phone)
- Items (description, qty, unit price, total)
- Subtotal
- Discounts
- Credits
- Total Amount
- QR Code (scannable to view invoice online)

### QR Code

Scans to:
```
https://your-frontend.com/invoice/ORD-AC23-233E?inv=4787837473
```

Users can scan to:
- View invoice on mobile
- Share invoice link
- Verify invoice authenticity

### Storage Structure

```
Supabase Storage Bucket: invoices/
├── pdf/
│   └── 4787837473.pdf
├── images/
│   └── 4787837473.png
└── qr/
    └── 4787837473.png
```

---

## 🔄 Order Status Flow

```
[Pending] → [Processing] → [Shipped] → [Delivered]
     ↓             ↓            ↓
[Cancelled] ← [Cancelled] ← [Cancelled]
```

**Status Transitions:**
- `pending` → `processing` (Admin marks as processing)
- `processing` → `shipped` (Admin dispatches)
- `shipped` → `delivered` (Customer receives)
- Any → `cancelled` (Customer or admin cancels)
- Any → `failed` (System failure)

**Automatic Actions:**
- Stock decremented when order created
- Stock restored when order cancelled
- Status history recorded for audit
- Emails sent on status changes (can be implemented)

---

## 🔢 ID Generation

### Order ID Format: `ORD-AC23-233E`

```typescript
// Pattern: ORD-XXXX-XXXX
// X = Random uppercase alphanumeric (A-Z, 0-9)
// Example: ORD-K8J2-9N4M

generateOrderId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = 'ORD-'
  for (let i = 0; i < 8; i++) {
    if (i === 4) result += '-'
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}
```

### Invoice Number Format: `4787837473`

```typescript
// Pattern: 10 digit numeric
// First 8 digits: timestamp
// Last 2 digits: random

generateInvoiceNumber(): string {
  const timestamp = Date.now().toString().slice(-8)
  const random = Math.floor(Math.random() * 100).toString().padStart(2, '0')
  return timestamp + random
}
```

---

## 💰 Payment Amount Handling

### Important: Kobo Conversion

Paystack requires amounts in **kobo** (pesewas for GHS):

```typescript
// GHS to Kobo
const amountInKobo = amount * 100
// Example: GHS 150.00 → 15000 kobo

// Kobo to GHS
const amountInGHS = kobo / 100
// Example: 15000 kobo → GHS 150.00
```

**Always use:**
```typescript
paystack.toKobo(amount)    // Convert to kobo
paystack.fromKobo(kobo)    // Convert from kobo
```

---

## 🧪 Testing

### Test Order Creation

```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "cartItems": [
      {
        "productId": "product-uuid-here",
        "quantity": 2
      }
    ],
    "deliveryAddress": {
      "street": "123 Test Street",
      "city": "Accra",
      "region": "Greater Accra",
      "phone": "+233241234567"
    }
  }'
```

### Test Payment Verification

```bash
curl -X POST http://localhost:3000/api/orders/verify-payment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "reference": "GROV-1730000000-ABC123XY"
  }'
```

### Test Webhook Locally

```bash
# Use Paystack's test webhook feature
# Or use ngrok to expose local server:
ngrok http 3000

# Update Paystack webhook URL to:
https://your-ngrok-url.ngrok.io/api/webhook/paystack
```

---

## 📱 Frontend Integration

### Complete Flow Example

```typescript
'use client'

import { useState } from 'react'

export function CheckoutPage() {
  const [loading, setLoading] = useState(false)
  const [orderResult, setOrderResult] = useState(null)

  const handleCheckout = async (cart, deliveryAddress) => {
    setLoading(true)

    try {
      // Step 1: Create order and get payment URL
      const createRes = await fetch('http://localhost:3000/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          cartItems: cart.map(item => ({
            productId: item.id,
            quantity: item.quantity
          })),
          deliveryAddress,
          discount: 0,
          credits: 0
        })
      })

      const createData = await createRes.json()

      if (!createData.success) {
        throw new Error(createData.message)
      }

      const { authorizationUrl, paymentReference } = createData.data

      // Step 2: Open Paystack payment page
      const paymentWindow = window.open(
        authorizationUrl,
        'Paystack Payment',
        'width=600,height=700'
      )

      // Step 3: Poll for payment completion or listen for callback
      const checkInterval = setInterval(async () => {
        const statusRes = await fetch(
          `http://localhost:3000/api/orders/payment-status?reference=${paymentReference}`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            }
          }
        )

        const statusData = await statusRes.json()

        if (statusData.data.status === 'success') {
          clearInterval(checkInterval)
          paymentWindow?.close()

          // Step 4: Verify payment and get order
          const verifyRes = await fetch('http://localhost:3000/api/orders/verify-payment', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            },
            body: JSON.stringify({ reference: paymentReference })
          })

          const verifyData = await verifyRes.json()

          if (verifyData.success) {
            setOrderResult(verifyData.data)
            // Show success page with invoice
          }
        }
      }, 3000)  // Check every 3 seconds

      // Cleanup after 10 minutes
      setTimeout(() => clearInterval(checkInterval), 600000)
    } catch (error) {
      console.error('Checkout error:', error)
      alert('Failed to complete checkout')
    } finally {
      setLoading(false)
    }
  }

  if (orderResult) {
    return (
      <div>
        <h1>Order Successful!</h1>
        <p>Order Number: {orderResult.orderNumber}</p>
        <p>Invoice Number: {orderResult.invoiceNumber}</p>
        
        <a href={orderResult.pdfUrl} target="_blank">
          Download Invoice PDF
        </a>
        
        <img src={orderResult.imageUrl} alt="Invoice" />
      </div>
    )
  }

  return (
    <button onClick={() => handleCheckout(cart, address)} disabled={loading}>
      {loading ? 'Processing...' : 'Complete Order'}
    </button>
  )
}
```

---

## ⚙️ Configuration

### Environment Variables

```bash
# Paystack
PAYSTACK_PUBLIC_KEY=pk_test_your_public_key
PAYSTACK_SECRET_KEY=sk_test_your_secret_key

# Supabase (already configured)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# Frontend URL (for QR codes and callbacks)
FRONTEND_URL=https://your-frontend.com
BACKEND_URL=https://your-backend.com
```

### Supabase Storage Setup

```bash
# 1. Create storage bucket in Supabase dashboard
# - Name: invoices
# - Public: Yes
# - File size limit: 10MB
# - Allowed MIME types: application/pdf, image/png

# 2. Or let the system create it automatically on first invoice generation
```

### Paystack Dashboard Setup

1. **Get API Keys:**
   - Dashboard → Settings → API Keys & Webhooks
   - Copy Test/Live keys

2. **Configure Webhook:**
   - URL: `https://your-backend.com/api/webhook/paystack`
   - Events: `charge.success`, `charge.failed`

3. **Test Payment:**
   - Use test cards: https://paystack.com/docs/payments/test-payments
   - Test card: `5060 6666 6666 6666 6666`
   - CVV: Any 3 digits
   - Expiry: Any future date
   - PIN: `1234`

---

## 🗄️ Database Migration

Run these SQL files in Supabase SQL Editor (in order):

1. **backend/src/database/orders-schema.sql**
   - Creates tables: orders, pending_orders, order_items, payment_transactions, order_status_history
   - Sets up RLS policies
   - Creates indexes

2. **backend/src/database/stock-functions.sql**
   - Creates stock management functions
   - increment_product_stock()
   - decrement_product_stock()

---

## 📋 Order Lifecycle

### 1. Order Creation
```
User submits checkout
   ↓
Backend creates pending_order (UUID)
   ↓
Initializes Paystack payment
   ↓
Returns authorization_url
```

### 2. Payment Processing
```
User pays on Paystack
   ↓
Paystack sends webhook (charge.success)
   ↓
Backend updates pending_order.payment_status = 'success'
```

### 3. Order Confirmation
```
Frontend calls verify-payment
   ↓
Backend verifies with Paystack
   ↓
Generates Order ID (ORD-AC23-233E)
   ↓
Generates Invoice Number (4787837473)
   ↓
Creates confirmed order
   ↓
Decrements product stock
   ↓
Generates PDF invoice with QR code
   ↓
Uploads to Supabase storage
   ↓
Returns order details with PDF URLs
```

### 4. Order Fulfillment
```
Admin updates status: processing → shipped → delivered
   ↓
Status history recorded
   ↓
Customer notified (email/push - can be implemented)
```

---

## 🛡️ Error Handling

### Stock Validation
```typescript
// Before payment, check stock
if (product.quantity < cartItem.quantity) {
  return { error: 'Insufficient stock' }
}

// Prevents overselling
```

### Payment Failures
```typescript
// Paystack sends charge.failed webhook
// System updates pending_order.payment_status = 'failed'
// Stock not decremented
// User can retry payment
```

### Duplicate Orders
```typescript
// If verify-payment called twice with same reference:
// System checks if order already exists
// Returns existing order (idempotent)
```

### Expired Pending Orders
```typescript
// Cleanup function runs periodically
// Marks orders >24 hours old as 'abandoned'
// Can be run via cron job:
await orderService.cleanupExpiredPendingOrders()
```

---

## 🎨 Invoice Customization

### Template.pdf

The system uses `backend/public/Template.pdf` as the base template.

**What gets filled in:**
- Invoice Number
- Date
- Customer Name
- Customer Address
- Customer Phone
- Item descriptions
- Quantities
- Unit Prices
- Totals
- Subtotal
- Discounts
- Credits
- Total Amount
- QR Code

**Customization:**
- Replace `Template.pdf` with your branded template
- Adjust coordinates in `pdf-invoice.service.ts`
- Modify fonts, colors, sizes as needed

---

## 📊 Analytics & Reporting

### Track Order Metrics

```sql
-- Total revenue
SELECT SUM(total_amount) 
FROM orders 
WHERE payment_status = 'paid';

-- Average order value
SELECT AVG(total_amount) 
FROM orders 
WHERE payment_status = 'paid';

-- Orders by status
SELECT status, COUNT(*) 
FROM orders 
GROUP BY status;

-- Top selling products
SELECT 
  oi.product_name,
  SUM(oi.quantity) as total_sold,
  SUM(oi.total_price) as revenue
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
WHERE o.payment_status = 'paid'
GROUP BY oi.product_name
ORDER BY total_sold DESC
LIMIT 10;
```

---

## 🐛 Troubleshooting

### Issue: "Paystack is not configured"

**Solution:**
```bash
# Add to .env
PAYSTACK_SECRET_KEY=sk_test_your_key

# Restart server
npm run dev
```

### Issue: "Insufficient stock"

**Cause:** Product quantity in database is less than requested

**Solution:**
- Check product stock: `SELECT * FROM products WHERE id = 'xxx'`
- Update stock: `UPDATE products SET quantity = 100 WHERE id = 'xxx'`

### Issue: "Failed to generate invoice"

**Possible causes:**
1. Template.pdf not found
2. Supabase storage bucket doesn't exist
3. Puppeteer dependencies missing

**Solutions:**
```bash
# Check template exists
ls backend/public/Template.pdf

# Create bucket manually in Supabase dashboard
# Or let system create it automatically

# For Puppeteer on Linux:
sudo apt-get install -y \
  chromium-browser \
  libx11-xcb1 \
  libxcomposite1 \
  libxcursor1 \
  libxdamage1
```

### Issue: Webhook not working

**Solution:**
1. Verify webhook URL in Paystack dashboard
2. Check signature verification
3. Test locally with ngrok
4. Check server logs for webhook requests

---

## 🚀 Deployment Checklist

- [ ] Add Paystack keys to production environment
- [ ] Configure Paystack webhook with production URL
- [ ] Set up Supabase storage bucket
- [ ] Upload Template.pdf to server
- [ ] Test payment flow end-to-end
- [ ] Test webhook with Paystack test events
- [ ] Verify invoice generation works
- [ ] Check PDF/image URLs are accessible
- [ ] Test QR code scanning
- [ ] Set up order status change notifications
- [ ] Configure automated cleanup of expired pending orders
- [ ] Set up monitoring for failed payments
- [ ] Test refund flow (if needed)

---

## 📞 Support Resources

**Paystack Documentation:**
- API Reference: https://paystack.com/docs/api/
- Test Cards: https://paystack.com/docs/payments/test-payments
- Webhooks: https://paystack.com/docs/payments/webhooks

**Related Files:**
- `src/services/paystack.service.ts` - Payment logic
- `src/services/order.service.ts` - Order management
- `src/services/pdf-invoice.service.ts` - Invoice generation
- `src/controllers/order.controller.ts` - API handlers
- `src/routes/order.routes.ts` - Route definitions
- `src/database/orders-schema.sql` - Database schema

---

**Version:** 1.0.0  
**Last Updated:** October 2025  
**Status:** Production Ready ✅

