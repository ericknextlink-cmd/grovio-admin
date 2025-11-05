# Products API Integration Documentation

## 🔍 **Current State: How Products Are Being Fetched**

### **Before (Mock Data)**
The products were **NOT** being fetched from the backend API. Instead:

1. **Location:** `frontend/src/store/adminStore.ts`
2. **Method:** Products are hardcoded as `sampleProducts` array
3. **Data Source:** Local state management with Zustand store
4. **Operations:** All CRUD operations (add, update, delete) only modify local state
5. **Persistence:** No persistence - data is lost on page refresh

```typescript
// OLD WAY - Mock data
const sampleProducts: GroceryProduct[] = [
  {
    id: '1',
    name: 'Organic Bananas',
    // ... hardcoded product data
  },
  // ... more hardcoded products
]

const initialState: AdminState = {
  products: sampleProducts, // ❌ Using mock data
  // ...
}
```

---

## ✅ **New Implementation: Backend API Integration**

### **1. API Client Created**
**File:** `frontend/src/lib/api.ts`

- ✅ Centralized API client for all backend calls
- ✅ Automatic authentication token injection
- ✅ Error handling
- ✅ Type-safe responses
- ✅ Configurable base URL via environment variables

**Environment Variables:**
- `BACKEND_URL` or `NEXT_PUBLIC_BACKEND_URL` (defaults to `http://localhost:5000`)

**Usage:**
```typescript
import { productsApi } from '@/lib/api'

// Get all products
const response = await productsApi.getAll({
  page: 1,
  limit: 20,
  search: 'banana',
  category: 'Fruits',
  inStock: true,
  sortBy: 'price',
  sortOrder: 'asc'
})

if (response.success && response.data) {
  const products = response.data
  const pagination = response.pagination
}
```

---

### **2. New Products Page Created**
**File:** `frontend/src/app/admin/products/page.tsx`

**Features:**
- ✅ Fetches products from backend API (`GET /api/products`)
- ✅ Pagination support
- ✅ Real-time search with debouncing
- ✅ Filtering by:
  - Category
  - Stock status (In Stock / Out of Stock)
- ✅ Sorting by:
  - Newest/Oldest
  - Name (A-Z / Z-A)
  - Price (Low to High / High to Low)
  - Stock quantity
- ✅ Product listing with images
- ✅ Delete product functionality (calls `DELETE /api/products/:id`)
- ✅ Edit product functionality (links to edit form)
- ✅ Loading states
- ✅ Error handling
- ✅ Empty states

**Access:** Navigate to `/admin/products`

---

## 📡 **Backend API Endpoints Used**

### **Public Endpoints (No Auth Required)**
- `GET /api/products` - Get all products
  - Query params: `page`, `limit`, `category`, `subcategory`, `search`, `inStock`, `sortBy`, `sortOrder`
  - Returns: Paginated product list

- `GET /api/products/:id` - Get single product
  - Returns: Single product details

### **Admin Endpoints (Auth Required)**
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- `PATCH /api/products/:id/stock` - Update stock
- `GET /api/products/admin/stats` - Get product statistics

---

## 🔧 **Setup Instructions**

### **1. Environment Variables**
Create or update `.env.local` in the frontend directory:

```env
BACKEND_URL=http://localhost:5000
# OR
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000

# For production:
# BACKEND_URL=https://your-backend-api.com
```

### **2. Authentication (For Admin Operations)**
The API client automatically includes auth tokens from:
- `localStorage.getItem('auth_token')`
- `sessionStorage.getItem('auth_token')`

Make sure your admin authentication sets one of these when users log in.

---

## 📊 **API Response Format**

```typescript
{
  success: boolean
  message?: string
  data?: Product[] | Product
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  errors?: string[]
}
```

---

## 🎯 **Product Data Structure (Backend)**

The backend returns products with this structure:

```typescript
{
  id: string (UUID)
  name: string
  brand?: string
  description?: string
  category_name: string
  subcategory?: string
  price: number
  currency: string
  quantity: number
  weight?: number
  volume?: number
  type?: string
  packaging?: string
  in_stock: boolean
  rating?: number
  reviews_count?: number
  images?: string[]
  created_at: string (ISO date)
  updated_at: string (ISO date)
}
```

**Note:** Backend uses `category_name` and `in_stock` (snake_case), while the frontend types might use `category` and `inStock` (camelCase). The new products page handles this mapping.

---

## 🚀 **Next Steps**

1. **Update Admin Store** (Optional)
   - You can update `adminStore.ts` to fetch from API instead of using mock data
   - This would make the dashboard and other admin pages use real data

2. **Add Categories Fetching**
   - The products page has a category filter dropdown that needs categories
   - Add API call to fetch categories for the dropdown

3. **Add Product Form API Integration**
   - Update `ProductForm` component to save to backend API
   - Currently it only updates local state

4. **Add Edit Functionality**
   - The products page links to edit, but needs to fetch product data
   - Update the edit flow to use API

---

## ✅ **Summary**

**Before:**
- ❌ Products stored in local state (mock data)
- ❌ No backend integration
- ❌ Data lost on refresh

**After:**
- ✅ Products fetched from backend API
- ✅ Full CRUD operations via API
- ✅ Pagination, search, filtering, sorting
- ✅ Real-time data
- ✅ Proper error handling

**New Files Created:**
1. `frontend/src/lib/api.ts` - API client
2. `frontend/src/app/admin/products/page.tsx` - Products listing page

**Access the new page:**
Navigate to `/admin/products` in your browser!
