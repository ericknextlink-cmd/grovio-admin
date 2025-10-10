# Grovio Backend API Documentation

## Overview

This document provides comprehensive documentation for the Grovio Backend API endpoints. The API is built with Express.js and TypeScript, providing secure authentication, admin panel functionality, product management, and AI-powered features.

**🔐 Admin Credentials:**

- Username: `admin`
- Password: `admin123`

## Base URL

```
http://localhost:5000/api
```

## Authentication

### User Authentication

The API uses JWT tokens for user authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Admin Authentication

Admin endpoints require admin JWT tokens with elevated privileges:

```
Authorization: Bearer <your-admin-jwt-token>
```

## Response Format

All API responses follow this standard format:

```json
{
  "success": boolean,
  "message": string,
  "data": object | null,
  "errors": string[] | null,
  "pagination": object | null
}
```

---

## 🏥 Health Check Endpoints

### GET /health

Check if the server is running and healthy.

**Response:**

```json
{
  "success": true,
  "message": "Server is healthy",
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-20T10:00:00Z",
    "version": "1.0.0"
  }
}
```

### GET /health/detailed

Get detailed health information including database connectivity.

**Response:**

```json
{
  "success": true,
  "message": "Detailed health check completed",
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-20T10:00:00Z",
    "version": "1.0.0",
    "database": "connected",
    "uptime": 3600
  }
}
```

---

## 🔐 Admin Authentication Endpoints

### POST /admin/login

Admin login to get access token.

**Request Body:**

```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Success Response:**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "admin": {
      "id": "uuid",
      "username": "admin",
      "email": "admin@grovio.com",
      "full_name": "Grovio Administrator",
      "role": "super_admin",
      "is_active": true,
      "last_login_at": "2024-01-20T10:00:00Z",
      "created_at": "2024-01-20T10:00:00Z",
      "updated_at": "2024-01-20T10:00:00Z"
    },
    "token": "jwt-token-here"
  }
}
```

### GET /admin/profile

Get admin profile information. **Requires Admin Auth**

**Response:**

```json
{
  "success": true,
  "message": "Admin profile retrieved successfully",
  "data": {
    "id": "uuid",
    "username": "admin",
    "email": "admin@grovio.com",
    "full_name": "Grovio Administrator",
    "role": "super_admin",
    "is_active": true,
    "last_login_at": "2024-01-20T10:00:00Z"
  }
}
```

### PUT /admin/profile

Update admin profile. **Requires Admin Auth**

**Request Body:**

```json
{
  "full_name": "Updated Name",
  "email": "newemail@grovio.com"
}
```

### POST /admin/change-password

Change admin password. **Requires Admin Auth**

**Request Body:**

```json
{
  "currentPassword": "admin123",
  "newPassword": "newSecurePassword123"
}
```

### POST /admin/logout

Admin logout. **Requires Admin Auth**

---

## 📦 Products Endpoints

### GET /products

Get all products with optional filtering and pagination.

**Query Parameters:**

- `page` (number, default: 1)
- `limit` (number, default: 20, max: 100)
- `category` (string)
- `subcategory` (string)
- `search` (string)
- `inStock` (boolean)
- `sortBy` (string: created_at, name, price, quantity)
- `sortOrder` (string: asc, desc)

**Response:**

```json
{
  "success": true,
  "message": "Products retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "name": "Royal White Basmati Rice",
      "slug": "royal-white-basmati-rice",
      "brand": "Royal",
      "description": "Premium quality basmati rice",
      "category_name": "Rice & Grains",
      "subcategory": "Imported Rice",
      "price": 130.0,
      "currency": "GHS",
      "quantity": 50,
      "weight": 5.0,
      "volume": null,
      "type": "Long-Grain",
      "packaging": "Bag",
      "in_stock": true,
      "rating": 4.6,
      "reviews_count": 124,
      "images": ["/products/royal-rice.png"],
      "created_at": "2024-01-20T10:00:00Z",
      "updated_at": "2024-01-20T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### GET /products/:id

Get product by ID.

**Response:**

```json
{
  "success": true,
  "message": "Product retrieved successfully",
  "data": {
    "id": "uuid",
    "name": "Royal White Basmati Rice"
    // ... full product object
  }
}
```

### POST /products

Create new product. **Requires Admin Auth**

**Request Body:**

```json
{
  "name": "New Product Name",
  "brand": "Brand Name",
  "description": "Product description",
  "category_name": "Category Name",
  "subcategory": "Subcategory Name",
  "price": 25.5,
  "currency": "GHS",
  "quantity": 100,
  "weight": 1.5,
  "type": "Type",
  "packaging": "Bottle",
  "in_stock": true,
  "rating": 0,
  "reviews_count": 0,
  "images": ["url1", "url2"]
}
```

### PUT /products/:id

Update product. **Requires Admin Auth**

**Request Body:** (partial product object)

### DELETE /products/:id

Delete product. **Requires Admin Auth**

### PATCH /products/:id/stock

Update product stock. **Requires Admin Auth**

**Request Body:**

```json
{
  "quantity": 50,
  "inStock": true
}
```

### GET /products/admin/stats

Get product statistics. **Requires Admin Auth**

**Response:**

```json
{
  "success": true,
  "message": "Product statistics retrieved successfully",
  "data": {
    "totalProducts": 150,
    "inStock": 120,
    "outOfStock": 30,
    "categories": 12,
    "averagePrice": 45.5,
    "totalValue": 15000.0,
    "lowStockProducts": 5
  }
}
```

---

## 🏷️ Categories Endpoints

### GET /categories

Get all categories with optional search.

**Query Parameters:**

- `search` (string)

**Response:**

```json
{
  "success": true,
  "message": "Categories retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "name": "Rice & Grains",
      "slug": "rice-grains",
      "description": "All types of rice and grains",
      "icon": "https://example.com/icon.jpg",
      "subcategories": ["Local Rice", "Imported Rice", "Other Grains"],
      "created_at": "2024-01-20T10:00:00Z",
      "updated_at": "2024-01-20T10:00:00Z"
    }
  ]
}
```

### GET /categories/:id

Get category by ID.

### POST /categories

Create new category. **Requires Admin Auth**

**Request Body:**

```json
{
  "name": "New Category",
  "slug": "new-category",
  "description": "Category description",
  "icon": "https://example.com/icon.jpg",
  "subcategories": ["Sub1", "Sub2"]
}
```

### PUT /categories/:id

Update category. **Requires Admin Auth**

### DELETE /categories/:id

Delete category. **Requires Admin Auth**

### POST /categories/:id/subcategories

Add subcategory. **Requires Admin Auth**

**Request Body:**

```json
{
  "subcategory": "New Subcategory"
}
```

### DELETE /categories/:id/subcategories

Remove subcategory. **Requires Admin Auth**

**Request Body:**

```json
{
  "subcategory": "Subcategory to Remove"
}
```

### GET /categories/admin/stats

Get category statistics. **Requires Admin Auth**

---

## 📊 Dashboard Endpoints

All dashboard endpoints require Admin Authentication.

### GET /dashboard/stats

Get comprehensive dashboard statistics.

**Response:**

```json
{
  "success": true,
  "message": "Dashboard statistics retrieved successfully",
  "data": {
    "totalProducts": 150,
    "inStockProducts": 120,
    "outOfStockProducts": 30,
    "lowStockProducts": 5,
    "totalCategories": 12,
    "totalOrders": 500,
    "pendingOrders": 25,
    "completedOrders": 450,
    "cancelledOrders": 25,
    "totalTransactions": 500,
    "pendingTransactions": 20,
    "completedTransactions": 470,
    "failedTransactions": 10,
    "totalRevenue": 45000.0,
    "monthlyRevenue": 5000.0,
    "dailyRevenue": 200.0,
    "orderGrowth": 15.5,
    "revenueGrowth": 12.3,
    "topCategory": "Rice & Grains",
    "topSellingProduct": "Royal Basmati Rice"
  }
}
```

### GET /dashboard/activities

Get recent activities.

**Query Parameters:**

- `limit` (number, default: 10, max: 50)

**Response:**

```json
{
  "success": true,
  "message": "Recent activities retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "type": "order",
      "action": "created",
      "description": "New order from John Doe for ₵125.50",
      "timestamp": "2024-01-20T10:00:00Z"
    }
  ]
}
```

### GET /dashboard/analytics

Get sales analytics.

**Query Parameters:**

- `period` (number, days, default: 30)

**Response:**

```json
{
  "success": true,
  "message": "Sales analytics retrieved successfully",
  "data": {
    "totalSales": 15000.0,
    "totalOrders": 300,
    "averageOrderValue": 50.0,
    "dailySales": [
      {
        "date": "2024-01-20",
        "sales": 500.0,
        "orders": 10
      }
    ],
    "topProducts": [
      {
        "productId": "uuid",
        "productName": "Royal Basmati Rice",
        "totalSold": 50,
        "revenue": 2500.0
      }
    ],
    "salesByCategory": [
      {
        "category": "Rice & Grains",
        "sales": 5000.0,
        "percentage": 33.3
      }
    ]
  }
}
```

### GET /dashboard/alerts

Get low stock alerts.

**Query Parameters:**

- `threshold` (number, default: 10)

**Response:**

```json
{
  "success": true,
  "message": "Low stock alerts retrieved successfully",
  "data": [
    {
      "productId": "uuid",
      "productName": "Royal Basmati Rice",
      "currentStock": 5,
      "category": "Rice & Grains",
      "lastRestocked": "2024-01-15T10:00:00Z",
      "urgency": "high"
    }
  ]
}
```

---

## 🤖 AI Endpoints

### POST /ai/chat

Get AI chat response.

**Request Body:**

```json
{
  "message": "I have ₵50 for groceries for a family of 4",
  "role": "parent",
  "familySize": 4,
  "budget": 50
}
```

**Response:**

```json
{
  "success": true,
  "message": "AI response generated successfully",
  "data": {
    "message": "**Recommended Basket** (Budget: ₵50.00):\n\n• Rice Olonka x2 - ₵45.00\n• Cooking Oil x1 - ₵5.00\n\n**Total: ₵50.00**\n**Savings: ₵0.00**\n\n**Reasoning:** Optimized a budget-friendly basket for a parent (family size 4). Selected 2 essential items prioritizing staples to maximize nutritional value within your budget."
  }
}
```

### POST /ai/recommendations

Get product recommendations.

**Request Body:**

```json
{
  "budget": 100,
  "familySize": 3,
  "role": "student",
  "preferences": ["vegetarian", "healthy"],
  "categories": ["Rice & Grains", "Vegetables"]
}
```

**Response:**

```json
{
  "success": true,
  "message": "Recommendations generated successfully",
  "data": {
    "items": [
      {
        "id": "uuid",
        "name": "Royal Basmati Rice",
        "price": 45.0,
        "quantity": 1,
        "category": "Rice & Grains",
        "subcategory": "Imported Rice",
        "images": ["/products/royal-rice.png"],
        "rating": 4.6,
        "inStock": true,
        "subtotal": 45.0
      }
    ],
    "total": 95.0,
    "savings": 5.0,
    "rationale": "Optimized a budget-friendly basket for a student (family size 3). Selected 5 essential items prioritizing staples, proteins, and fresh produce to maximize nutritional value within your budget.",
    "budgetUtilization": 95.0
  }
}
```

### GET /ai/search

Search products with AI.

**Query Parameters:**

- `query` (string, required)
- `limit` (number, default: 10, max: 50)

**Response:**

```json
{
  "success": true,
  "message": "Product search completed successfully",
  "data": [
    {
      "id": "uuid",
      "name": "Royal Basmati Rice",
      "price": 45.0,
      "quantity": 1,
      "category": "Rice & Grains",
      "subcategory": "Imported Rice",
      "images": ["/products/royal-rice.png"],
      "rating": 4.6,
      "inStock": true,
      "subtotal": 45.0
    }
  ]
}
```

### POST /ai/budget-analysis

Analyze budget and provide insights.

**Request Body:**

```json
{
  "budget": 200,
  "familySize": 4,
  "duration": "week"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Budget analysis completed successfully",
  "data": {
    "recommendedAllocation": {
      "essentials": 80,
      "proteins": 50,
      "vegetables": 40,
      "grains": 20,
      "other": 10
    },
    "estimatedMeals": 8,
    "costPerMeal": 25.0,
    "suggestions": [
      "Include fresh proteins like chicken or fish",
      "Add variety with seasonal vegetables and fruits",
      "Plan meals in advance to avoid food waste"
    ],
    "warnings": []
  }
}
```

### POST /ai/meal-suggestions

Get meal suggestions based on ingredients.

**Request Body:**

```json
{
  "ingredients": ["rice", "chicken", "tomatoes"],
  "mealType": "dinner",
  "dietaryRestrictions": ["no-pork"],
  "familySize": 4
}
```

**Response:**

```json
{
  "success": true,
  "message": "Meal suggestions generated successfully",
  "data": [
    {
      "name": "Jollof Rice",
      "description": "Traditional Ghanaian rice dish with vegetables and spices",
      "ingredients": ["Rice", "Tomatoes", "Onions", "Spices"],
      "estimatedCost": 100,
      "servings": 4,
      "difficulty": "medium",
      "cookingTime": 45
    }
  ]
}
```

---

## 👤 User Authentication Endpoints

### POST /auth/signup

User registration with email and password.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+233123456789"
}
```

### POST /auth/signin

User login with email and password.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

### POST /auth/google

Google OAuth authentication.

### POST /auth/signout

User logout.

### GET /auth/me

Get current user profile. **Requires User Auth**

### POST /auth/refresh

Refresh access token.

---

## 📧 OTP Endpoints

### POST /otp/send

Send OTP for email verification.

**Request Body:**

```json
{
  "email": "user@example.com",
  "type": "signup"
}
```

### POST /otp/verify

Verify OTP code.

**Request Body:**

```json
{
  "email": "user@example.com",
  "token": "123456",
  "type": "signup"
}
```

### POST /otp/verify-hash

Verify OTP hash (PKCE flow).

### POST /otp/reset-password

Reset password with OTP.

---

## 👥 Account Management Endpoints

### POST /account/check-email

Check email status (available, exists, deleted).

**Request Body:**

```json
{
  "email": "user@example.com"
}
```

### DELETE /account/delete

Soft delete user account. **Requires User Auth**

### POST /account/recovery/initiate

Initiate account recovery for deleted accounts.

### POST /account/recovery/complete

Complete account recovery process.

---

## 👤 Profile Endpoints

### GET /profile

Get user profile. **Requires User Auth**

### PUT /profile

Update user profile. **Requires User Auth**

### POST /profile/picture/upload

Upload profile picture. **Requires User Auth**

### DELETE /profile/picture

Delete profile picture. **Requires User Auth**

---

## Error Codes

### Common HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Validation Error
- `429` - Too Many Requests
- `500` - Internal Server Error

### Error Response Format

```json
{
  "success": false,
  "message": "Error description",
  "errors": ["Specific validation error 1", "Specific validation error 2"]
}
```

---

## Rate Limiting

- **General Limit:** 100 requests per 15 minutes per IP
- **Authentication Endpoints:** Additional rate limiting may apply
- **Admin Endpoints:** Higher limits for authenticated admin users

---

## Notes

1. **Admin Setup:** The default admin user is created automatically with username `admin` and password `admin123`
2. **Environment Variables:** Ensure all required environment variables are set in `.env.local`
3. **Database:** Run the SQL schema file to set up the required database tables
4. **Security:** Change default admin credentials in production
5. **AI Features:** Some AI endpoints may require additional configuration or API keys
