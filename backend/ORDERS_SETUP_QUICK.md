# 🚀 Orders & Payment - Quick Setup Guide

**Get orders and Paystack payments working in 10 minutes**

---

## ⚡ Super Quick Setup

### Step 1: Install Dependencies (2 min)

```bash
cd backend
npm install
```

**New packages installed:**
- `pdf-lib` - PDF manipulation
- `puppeteer` - PDF to image conversion
- `qrcode` - QR code generation
- `sharp` - Image optimization
- `axios` - HTTP client for Paystack
- `pdfkit` - PDF creation (fallback)

---

### Step 2: Configure Environment (1 min)

Add to `backend/.env`:

```bash
# Paystack Keys (Required)
PAYSTACK_PUBLIC_KEY=pk_test_your_public_key_here
PAYSTACK_SECRET_KEY=sk_test_your_secret_key_here

# Existing (already have these)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
FRONTEND_URL=http://localhost:3001
BACKEND_URL=http://localhost:3000
```

**Get Paystack Keys:**
1. Go to https://dashboard.paystack.com/settings/developer
2. Copy Public Key (pk_test_...)
3. Copy Secret Key (sk_test_...)
4. Add to `.env`

---

### Step 3: Run Database Migration (2 min)

```sql
-- In Supabase SQL Editor, run these files in order:

-- 1. Orders schema
-- Copy from: backend/src/database/orders-schema.sql
-- Paste and run in SQL Editor

-- 2. Stock functions
-- Copy from: backend/src/database/stock-functions.sql
-- Paste and run in SQL Editor
```

**Verify tables created:**
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'orders',
  'pending_orders',
  'order_items',
  'payment_transactions',
  'order_status_history'
);
```

---

### Step 4: Setup Supabase Storage (1 min)

**Option A: Auto-create (Recommended)**
- System automatically creates `invoices` bucket on first PDF generation

**Option B: Manual create**
1. Supabase Dashboard → Storage
2. Create new bucket: `invoices`
3. Make it public
4. Set file size limit: 10MB
5. Allowed types: `application/pdf`, `image/png`

---

### Step 5: Add Template.pdf (1 min)

```bash
# Ensure Template.pdf is in correct location
# Should be at: backend/public/Template.pdf

# If missing, system will generate PDF from scratch
```

---

### Step 6: Configure Paystack Webhook (2 min)

1. Paystack Dashboard → Settings → Webhooks
2. Add webhook URL:
   ```
   Development: http://your-ngrok-url.ngrok.io/api/webhook/paystack
   Production: https://api.yourdomain.com/api/webhook/paystack
   ```
3. Select events:
   - `charge.success`
   - `charge.failed`
4. Save

**For local development:**
```bash
# Install ngrok
npm install -g ngrok

# Expose local server
ngrok http 3000

# Use the https URL for webhook
```

---

### Step 7: Start Server (1 min)

```bash
npm run dev
```

Look for:
```
✅ 🚀 Grovio Backend Server running on port 3000
✅ No Paystack configuration warnings
```

---

### Step 8: Test the System (2 min)

```bash
# Test order creation
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "cartItems": [
      {"productId": "product-uuid-here", "quantity": 2}
    ],
    "deliveryAddress": {
      "street": "123 Test St",
      "city": "Accra",
      "region": "Greater Accra",
      "phone": "+233241234567"
    }
  }'

# Should return authorization_url from Paystack
```

---

## 🎯 What You Get

After setup, your system can:

✅ **Create Orders**
- Validates cart items and stock
- Creates temporary pending order
- Generates unique payment reference

✅ **Process Payments**
- Initializes Paystack payment
- Returns secure payment URL
- Handles payment verification
- Processes webhooks

✅ **Generate Invoices**
- Professional PDF invoices
- PNG image versions
- QR codes for mobile access
- Automatic upload to Supabase storage

✅ **Manage Orders**
- Track order status
- View order history
- Cancel orders
- Restore stock on cancellation

---

## 🧪 Testing Payment Flow

### Use Paystack Test Cards

```
Card Number: 5060 6666 6666 6666 6666
CVV: Any 3 digits
Expiry: Any future date
PIN: 1234
OTP: 123456
```

### Test Flow

```typescript
// 1. Create order
POST /api/orders
→ Returns { authorizationUrl, paymentReference }

// 2. Open payment page
window.open(authorizationUrl)

// 3. Use test card to complete payment

// 4. Verify payment
POST /api/orders/verify-payment
{
  "reference": "payment-reference-here"
}
→ Returns {
  orderNumber: "ORD-AC23-233E",
  invoiceNumber: "4787837473",
  pdfUrl: "https://...",
  imageUrl: "https://..."
}

// 5. View invoice
Open pdfUrl in browser
```

---

## 📦 API Endpoints Quick Reference

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/orders` | POST | ✅ | Create order & initialize payment |
| `/api/orders/verify-payment` | POST | ✅ | Verify payment & get invoice |
| `/api/orders/payment-status` | GET | ✅ | Check payment status |
| `/api/orders` | GET | ✅ | Get user's orders |
| `/api/orders/:id` | GET | ✅ | Get order details |
| `/api/orders/:id/cancel` | POST | ✅ | Cancel order |
| `/api/orders/pending/:id` | GET | ✅ | Get pending order |
| `/api/orders/pending/:id/cancel` | POST | ✅ | Cancel pending order |
| `/api/webhook/paystack` | POST | 🔓 | Paystack webhook |
| `/api/orders/:id/status` | PUT | 👑 Admin | Update status |
| `/api/orders/admin/stats` | GET | 👑 Admin | Get statistics |

---

## 🔍 Verify Everything Works

Run these checks:

```bash
# 1. Server starts
npm run dev
✅ Should show no Paystack errors

# 2. Database tables exist
# In Supabase:
SELECT COUNT(*) FROM orders;
SELECT COUNT(*) FROM pending_orders;
✅ Should not error

# 3. Environment variables loaded
node -e "require('dotenv').config(); console.log(process.env.PAYSTACK_SECRET_KEY)"
✅ Should print your key

# 4. Supabase storage accessible
# Try accessing in browser:
https://your-project.supabase.co/storage/v1/object/public/invoices/
✅ Should not 404
```

---

## 🎉 You're Done!

Your orders and payment system is now:

✅ **Configured** - Paystack keys set  
✅ **Database Ready** - All tables created  
✅ **Storage Ready** - Supabase bucket configured  
✅ **Webhooks Setup** - Real-time payment updates  
✅ **Invoice Generation** - Automatic PDF/image creation  
✅ **Secure** - Authentication, validation, RLS policies  
✅ **Production Ready** - Error handling, stock management  

---

## 📝 Next Steps

1. **Test with real flow:**
   - Create order via API
   - Pay with test card
   - Verify order created
   - Download invoice PDF

2. **Integrate frontend:**
   - Use examples in ORDERS_PAYMENT_DOCUMENTATION.md
   - Implement checkout flow
   - Handle payment callbacks

3. **Configure production:**
   - Switch to live Paystack keys
   - Update webhook URL
   - Test with real card (small amount)

---

**Questions?** See `ORDERS_PAYMENT_DOCUMENTATION.md` for complete reference!

**Happy selling! 🛒💳**

