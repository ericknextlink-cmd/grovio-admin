# AI Products System - Setup Guide

## 🎯 Overview

A complete system for AI-generated products that require admin review and publishing before being available to the frontend. This is separate from regular products and provides a workflow for generating, reviewing, and publishing AI-created products.

## 📁 Files Created

### Backend
1. **Service:** `backend/src/services/ai-products.service.ts`
   - AI product generation using OpenAI
   - CRUD operations (create, read, update, delete)
   - Publishing workflow (draft → published → archived)
   
2. **Controller:** `backend/src/controllers/ai-products.controller.ts`
   - Handles all HTTP requests for AI products
   - Endpoints for generate, list, update, delete, publish, unpublish, archive

3. **Routes:** `backend/src/routes/ai-products.routes.ts`
   - All routes require admin authentication
   - Validation middleware for all endpoints

4. **Database Schema:** `backend/src/database/ai-products-schema.sql`
   - Table structure for `ai_products`
   - Indexes for performance
   - Triggers for automatic timestamp updates

### Frontend
1. **API Client:** Updated `frontend/src/lib/api.ts`
   - Added `aiProductsApi` with all CRUD and publish operations

2. **Admin Page:** `frontend/src/app/admin/ai-products/page.tsx`
   - List all AI products with filtering
   - Generate button to create new AI products
   - Edit, delete, publish, unpublish, archive actions
   - Status filtering (draft, published, archived)

3. **Sidebar:** Updated `frontend/src/components/AdminSidebar.tsx`
   - Added "AI Products" navigation link

## 🚀 Setup Instructions

### 1. Database Setup

Run the SQL schema in your Supabase SQL Editor:

```sql
-- Copy and paste the contents of:
-- backend/src/database/ai-products-schema.sql
```

This will create:
- `ai_products` table
- Indexes for performance
- Triggers for automatic timestamp updates

### 2. Environment Variables

Make sure your backend has:
```env
OPENAI_API_KEY=your_openai_api_key_here
```

### 3. Backend Routes

The routes are already registered in `backend/src/server.ts`:
- `/api/ai-products` - All AI product endpoints

### 4. Frontend Access

Navigate to: `/admin/ai-products` in your admin panel

## 📡 API Endpoints

All endpoints require **Admin Authentication**:

### Generate Products
```
POST /api/ai-products/generate
Body: { count?: number } // Default: 10
```

### List Products
```
GET /api/ai-products?page=1&limit=20&status=draft&category=...&search=...
Query Params:
  - page: number (default: 1)
  - limit: number (default: 20, max: 100)
  - status: 'draft' | 'published' | 'archived'
  - category: string
  - search: string
```

### Get Product by ID
```
GET /api/ai-products/:id
```

### Update Product
```
PUT /api/ai-products/:id
Body: { name, brand, description, price, ... }
```

### Delete Product
```
DELETE /api/ai-products/:id
```

### Publish Product
```
POST /api/ai-products/:id/publish
Changes status from 'draft' to 'published'
```

### Unpublish Product
```
POST /api/ai-products/:id/unpublish
Changes status from 'published' to 'draft'
```

### Archive Product
```
POST /api/ai-products/:id/archive
Changes status to 'archived'
```

## 🔄 Product Workflow

1. **Generate** → AI creates products with `status: 'draft'`
2. **Review** → Admin reviews products in the admin panel
3. **Edit** (optional) → Admin can edit product details
4. **Publish** → Admin publishes products, changing status to `'published'`
5. **Unpublish** (optional) → Admin can unpublish if needed
6. **Archive** → Admin can archive products to hide them

## 📊 Product Status

- **draft**: Newly generated, pending review
- **published**: Approved and available for frontend use
- **archived**: Hidden from frontend, kept for records

## 🎨 Frontend Features

The AI Products admin page includes:
- ✅ List all AI products with pagination
- ✅ Search by name, brand, or description
- ✅ Filter by status (draft, published, archived)
- ✅ Generate new products button
- ✅ Quick actions:
  - Publish (draft → published)
  - Unpublish (published → draft)
  - Archive
  - Edit
  - Delete
- ✅ Status badges (color-coded)
- ✅ Loading states and error handling

## 🔐 Security

- All endpoints require admin authentication
- Products are separate from regular products
- Only published products should be exposed to frontend
- Draft and archived products are admin-only

## 📝 Next Steps

1. **Run the database schema** in Supabase
2. **Test the generate endpoint** to create AI products
3. **Review and publish** products in the admin panel
4. **Create frontend endpoint** to fetch only published AI products (if needed for frontend display)

## 🐛 Troubleshooting

### OpenAI API Key Missing
- Ensure `OPENAI_API_KEY` is set in backend environment
- Check backend logs for API key errors

### Database Errors
- Verify `ai_products` table exists
- Check Supabase RLS policies if needed
- Ensure admin client has proper permissions

### Products Not Generating
- Check OpenAI API key validity
- Check backend logs for errors
- Verify categories exist in database (AI uses them for context)

## 📚 Related Files

- Regular Products: `backend/src/services/products.service.ts`
- AI Bundles: `backend/src/services/ai-bundles.service.ts`
- Admin Routes: `backend/src/routes/admin.routes.ts`

---

**Note:** AI products are completely separate from regular products. They use a different table (`ai_products` vs `products`) and different endpoints. This allows for a clear workflow where AI-generated content is reviewed before being published.

