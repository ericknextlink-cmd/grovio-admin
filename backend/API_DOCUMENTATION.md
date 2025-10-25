# Grovio Backend API Documentation

## Overview

This document provides comprehensive documentation for the Grovio Backend API. The API is built with Express.js and TypeScript, providing secure authentication, admin panel functionality, product management, and AI-powered features.

**Version:** 1.0.0  
**Last Updated:** October 10, 2025

## Base URL

```
Development: http://localhost:3000/api
Production: https://your-backend-domain.com/api
```

**Note:** The server automatically finds an available port starting from 3000. If 3000 is busy, it will try 3001, 3002, etc.

## Table of Contents

1. [Authentication](#authentication)
2. [Health Check](#health-check-endpoints)
3. [Admin Endpoints](#admin-endpoints)
4. [Product Management](#product-endpoints)
5. [Category Management](#category-endpoints)
6. [Dashboard & Analytics](#dashboard-endpoints)
7. [AI Features](#ai-endpoints)
8. [User Authentication](#user-authentication-endpoints)
9. [Account Management](#account-management-endpoints)
10. [OTP & Email Verification](#otp-endpoints)
11. [User Profile](#profile-endpoints)
12. [Error Handling](#error-codes--responses)
13. [Examples](#request-examples)

---

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

**Default Admin Credentials:**
- Username: `admin`
- Password: `admin123`

⚠️ **Change these credentials in production!**

---

## Response Format

All API responses follow this standard format:

```json
{
  "success": boolean,
  "message": string,
  "data": object | array | null,
  "errors": string[] | null,
  "pagination": {
    "page": number,
    "limit": number,
    "total": number,
    "totalPages": number
  } | null
}
```

---

## Health Check Endpoints

### GET /health

Check if the server is running and healthy.

**Access:** Public  
**Response:**

```json
{
  "status": "healthy",
  "message": "Grovio Backend Server is running",
  "timestamp": "2025-10-10T10:00:00Z",
  "uptime": "5m 30s",
  "version": "1.0.0",
  "environment": "development"
}
```

### GET /health/detailed

Get detailed health information including database connectivity.

**Access:** Public  
**Response:**

```json
{
  "success": true,
  "message": "Detailed health check completed",
  "data": {
    "status": "healthy",
    "timestamp": "2025-10-10T10:00:00Z",
    "version": "1.0.0",
    "database": "connected",
    "uptime": 3600
  }
}
```

---

## Admin Endpoints

### POST /admin/login

Admin login to get access token.

**Access:** Public  
**Request Body:**

```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Validation:**
- `username`: Required, 3-50 characters
- `password`: Required, minimum 6 characters

**Success Response (200):**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "admin": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "username": "admin",
      "email": "admin@grovio.com",
      "full_name": "Grovio Administrator",
      "role": "super_admin",
      "is_active": true,
      "last_login_at": "2025-10-10T10:00:00Z",
      "created_at": "2025-01-20T10:00:00Z",
      "updated_at": "2025-10-10T10:00:00Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Response (401):**

```json
{
  "success": false,
  "message": "Invalid credentials",
  "errors": ["Username or password is incorrect"]
}
```

---

### GET /admin/profile

Get admin profile information.

**Access:** Admin Only  
**Headers:** `Authorization: Bearer <admin-token>`

**Success Response (200):**

```json
{
  "success": true,
  "message": "Admin profile retrieved successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "admin",
    "email": "admin@grovio.com",
    "full_name": "Grovio Administrator",
    "role": "super_admin",
    "is_active": true,
    "last_login_at": "2025-10-10T10:00:00Z"
  }
}
```

---

### PUT /admin/profile

Update admin profile information.

**Access:** Admin Only  
**Headers:** `Authorization: Bearer <admin-token>`  
**Request Body:**

```json
{
  "full_name": "Updated Admin Name",
  "email": "newemail@grovio.com"
}
```

**Validation:**
- `full_name`: Optional, 2-100 characters
- `email`: Optional, valid email format

**Success Response (200):**

```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "admin",
    "email": "newemail@grovio.com",
    "full_name": "Updated Admin Name",
    "role": "super_admin"
  }
}
```

---

### POST /admin/change-password

Change admin password.

**Access:** Admin Only  
**Headers:** `Authorization: Bearer <admin-token>`  
**Request Body:**

```json
{
  "currentPassword": "admin123",
  "newPassword": "NewSecurePassword123!"
}
```

**Validation:**
- `currentPassword`: Required
- `newPassword`: Minimum 8 characters, must contain at least one lowercase, one uppercase, and one number

**Success Response (200):**

```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

---

### POST /admin/logout

Admin logout.

**Access:** Admin Only  
**Headers:** `Authorization: Bearer <admin-token>`

**Success Response (200):**

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## Product Endpoints

### GET /products

Get all products with optional filtering and pagination.

**Access:** Public  
**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page (max 100) |
| `category` | string | - | Filter by category name |
| `subcategory` | string | - | Filter by subcategory |
| `search` | string | - | Search in product name/description |
| `inStock` | boolean | - | Filter by stock status |
| `sortBy` | string | created_at | Sort by field: `created_at`, `name`, `price`, `quantity` |
| `sortOrder` | string | desc | Sort order: `asc` or `desc` |

**Example Request:**
```
GET /api/products?page=1&limit=20&category=Rice%20%26%20Grains&inStock=true&sortBy=price&sortOrder=asc
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Products retrieved successfully",
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Royal White Basmati Rice",
      "slug": "royal-white-basmati-rice",
      "brand": "Royal",
      "description": "Premium quality basmati rice imported from India",
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
      "images": ["/products/royal-rice.png", "/products/royal-rice-2.png"],
      "created_at": "2025-01-20T10:00:00Z",
      "updated_at": "2025-10-10T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

---

### GET /products/:id

Get a specific product by ID.

**Access:** Public  
**URL Parameters:**
- `id`: Product UUID

**Success Response (200):**

```json
{
  "success": true,
  "message": "Product retrieved successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Royal White Basmati Rice",
    "slug": "royal-white-basmati-rice",
    "brand": "Royal",
    "description": "Premium quality basmati rice imported from India",
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
    "created_at": "2025-01-20T10:00:00Z",
    "updated_at": "2025-10-10T10:00:00Z"
  }
}
```

**Error Response (404):**

```json
{
  "success": false,
  "message": "Product not found",
  "errors": ["Product with ID 550e8400-e29b-41d4-a716-446655440000 does not exist"]
}
```

---

### POST /products

Create a new product.

**Access:** Admin Only  
**Headers:** `Authorization: Bearer <admin-token>`  
**Request Body:**

```json
{
  "name": "Tilda Pure Basmati Rice",
  "brand": "Tilda",
  "description": "Premium basmati rice with authentic aroma",
  "category_name": "Rice & Grains",
  "subcategory": "Imported Rice",
  "price": 145.50,
  "currency": "GHS",
  "quantity": 100,
  "weight": 5.0,
  "volume": null,
  "type": "Long-Grain",
  "packaging": "Bag",
  "in_stock": true,
  "rating": 0,
  "reviews_count": 0,
  "images": ["https://example.com/tilda-rice.png"]
}
```

**Validation:**
- `name`: Required, 2-200 characters
- `brand`: Optional, max 100 characters
- `description`: Optional, max 1000 characters
- `category_name`: Required
- `subcategory`: Optional, max 100 characters
- `price`: Required, positive number
- `currency`: Optional, one of: `GHS`, `USD`, `EUR`, `GBP`
- `quantity`: Required, non-negative integer
- `weight`: Optional, positive number
- `volume`: Optional, positive number
- `type`: Optional, max 100 characters
- `packaging`: Optional, max 100 characters
- `in_stock`: Optional, boolean
- `rating`: Optional, 0-5
- `reviews_count`: Optional, non-negative integer
- `images`: Optional, array of valid URLs

**Success Response (201):**

```json
{
  "success": true,
  "message": "Product created successfully",
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "Tilda Pure Basmati Rice",
    "slug": "tilda-pure-basmati-rice",
    "brand": "Tilda",
    "price": 145.50,
    "quantity": 100,
    "in_stock": true,
    "created_at": "2025-10-10T10:00:00Z"
  }
}
```

---

### PUT /products/:id

Update an existing product.

**Access:** Admin Only  
**Headers:** `Authorization: Bearer <admin-token>`  
**URL Parameters:**
- `id`: Product UUID

**Request Body:** (all fields optional)

```json
{
  "name": "Updated Product Name",
  "price": 150.00,
  "quantity": 75,
  "in_stock": true
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Product updated successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Updated Product Name",
    "price": 150.00,
    "quantity": 75,
    "in_stock": true,
    "updated_at": "2025-10-10T10:30:00Z"
  }
}
```

---

### DELETE /products/:id

Delete a product.

**Access:** Admin Only  
**Headers:** `Authorization: Bearer <admin-token>`  
**URL Parameters:**
- `id`: Product UUID

**Success Response (200):**

```json
{
  "success": true,
  "message": "Product deleted successfully"
}
```

---

### PATCH /products/:id/stock

Update product stock quantity and availability.

**Access:** Admin Only  
**Headers:** `Authorization: Bearer <admin-token>`  
**URL Parameters:**
- `id`: Product UUID

**Request Body:**

```json
{
  "quantity": 50,
  "inStock": true
}
```

**Validation:**
- `quantity`: Required, non-negative integer
- `inStock`: Required, boolean

**Success Response (200):**

```json
{
  "success": true,
  "message": "Stock updated successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "quantity": 50,
    "in_stock": true,
    "updated_at": "2025-10-10T10:30:00Z"
  }
}
```

---

### GET /products/admin/stats

Get product statistics for admin dashboard.

**Access:** Admin Only  
**Headers:** `Authorization: Bearer <admin-token>`

**Success Response (200):**

```json
{
  "success": true,
  "message": "Product statistics retrieved successfully",
  "data": {
    "totalProducts": 150,
    "inStock": 120,
    "outOfStock": 30,
    "lowStock": 15,
    "categories": 12,
    "averagePrice": 75.50,
    "totalValue": 125000.00,
    "topSellingProduct": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Royal White Basmati Rice",
      "totalSold": 500
    }
  }
}
```

---

## Category Endpoints

### GET /categories

Get all categories with optional search.

**Access:** Public  
**Query Parameters:**
- `search`: Optional, search term (1-100 characters)

**Success Response (200):**

```json
{
  "success": true,
  "message": "Categories retrieved successfully",
  "data": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440010",
      "name": "Rice & Grains",
      "slug": "rice-grains",
      "description": "All types of rice, grains, and cereals",
      "icon": "https://example.com/icons/rice.png",
      "subcategories": ["Local Rice", "Imported Rice", "Other Grains", "Cereals"],
      "product_count": 45,
      "created_at": "2025-01-20T10:00:00Z",
      "updated_at": "2025-10-10T10:00:00Z"
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440011",
      "name": "Cooking Oils",
      "slug": "cooking-oils",
      "description": "Various cooking and vegetable oils",
      "icon": "https://example.com/icons/oil.png",
      "subcategories": ["Vegetable Oil", "Palm Oil", "Olive Oil"],
      "product_count": 28,
      "created_at": "2025-01-20T10:00:00Z",
      "updated_at": "2025-10-10T10:00:00Z"
    }
  ]
}
```

---

### GET /categories/:id

Get a specific category by ID.

**Access:** Public  
**URL Parameters:**
- `id`: Category UUID

**Success Response (200):**

```json
{
  "success": true,
  "message": "Category retrieved successfully",
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440010",
    "name": "Rice & Grains",
    "slug": "rice-grains",
    "description": "All types of rice, grains, and cereals",
    "icon": "https://example.com/icons/rice.png",
    "subcategories": ["Local Rice", "Imported Rice", "Other Grains", "Cereals"],
    "product_count": 45,
    "created_at": "2025-01-20T10:00:00Z",
    "updated_at": "2025-10-10T10:00:00Z"
  }
}
```

---

### POST /categories

Create a new category.

**Access:** Admin Only  
**Headers:** `Authorization: Bearer <admin-token>`  
**Request Body:**

```json
{
  "name": "Fresh Vegetables",
  "slug": "fresh-vegetables",
  "description": "Farm-fresh vegetables and greens",
  "icon": "https://example.com/icons/vegetables.png",
  "subcategories": ["Leafy Greens", "Root Vegetables", "Peppers & Tomatoes"]
}
```

**Validation:**
- `name`: Required, 2-100 characters
- `slug`: Optional, 2-100 characters, lowercase letters, numbers, and hyphens only
- `description`: Optional, max 500 characters
- `icon`: Optional, valid URL
- `subcategories`: Optional, array of strings (1-100 characters each)

**Success Response (201):**

```json
{
  "success": true,
  "message": "Category created successfully",
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440020",
    "name": "Fresh Vegetables",
    "slug": "fresh-vegetables",
    "description": "Farm-fresh vegetables and greens",
    "icon": "https://example.com/icons/vegetables.png",
    "subcategories": ["Leafy Greens", "Root Vegetables", "Peppers & Tomatoes"],
    "created_at": "2025-10-10T10:00:00Z"
  }
}
```

---

### PUT /categories/:id

Update an existing category.

**Access:** Admin Only  
**Headers:** `Authorization: Bearer <admin-token>`  
**URL Parameters:**
- `id`: Category UUID

**Request Body:** (all fields optional)

```json
{
  "name": "Updated Category Name",
  "description": "Updated description",
  "subcategories": ["New Sub1", "New Sub2"]
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Category updated successfully",
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440010",
    "name": "Updated Category Name",
    "description": "Updated description",
    "updated_at": "2025-10-10T10:30:00Z"
  }
}
```

---

### DELETE /categories/:id

Delete a category.

**Access:** Admin Only  
**Headers:** `Authorization: Bearer <admin-token>`  
**URL Parameters:**
- `id`: Category UUID

**Success Response (200):**

```json
{
  "success": true,
  "message": "Category deleted successfully"
}
```

---

### POST /categories/:id/subcategories

Add a subcategory to an existing category.

**Access:** Admin Only  
**Headers:** `Authorization: Bearer <admin-token>`  
**URL Parameters:**
- `id`: Category UUID

**Request Body:**

```json
{
  "subcategory": "New Subcategory Name"
}
```

**Validation:**
- `subcategory`: Required, 1-100 characters

**Success Response (200):**

```json
{
  "success": true,
  "message": "Subcategory added successfully",
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440010",
    "subcategories": ["Local Rice", "Imported Rice", "Other Grains", "Cereals", "New Subcategory Name"]
  }
}
```

---

### DELETE /categories/:id/subcategories

Remove a subcategory from a category.

**Access:** Admin Only  
**Headers:** `Authorization: Bearer <admin-token>`  
**URL Parameters:**
- `id`: Category UUID

**Request Body:**

```json
{
  "subcategory": "Subcategory to Remove"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Subcategory removed successfully",
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440010",
    "subcategories": ["Local Rice", "Imported Rice", "Other Grains"]
  }
}
```

---

### GET /categories/admin/stats

Get category statistics for admin dashboard.

**Access:** Admin Only  
**Headers:** `Authorization: Bearer <admin-token>`

**Success Response (200):**

```json
{
  "success": true,
  "message": "Category statistics retrieved successfully",
  "data": {
    "totalCategories": 12,
    "totalSubcategories": 48,
    "categoriesWithProducts": 10,
    "emptyCategories": 2,
    "mostPopularCategory": {
      "id": "660e8400-e29b-41d4-a716-446655440010",
      "name": "Rice & Grains",
      "product_count": 45
    }
  }
}
```

---

## Dashboard Endpoints

All dashboard endpoints require admin authentication.

### GET /dashboard/stats

Get comprehensive dashboard statistics.

**Access:** Admin Only  
**Headers:** `Authorization: Bearer <admin-token>`

**Success Response (200):**

```json
{
  "success": true,
  "message": "Dashboard statistics retrieved successfully",
  "data": {
    "totalProducts": 150,
    "inStockProducts": 120,
    "outOfStockProducts": 30,
    "lowStockProducts": 15,
    "totalCategories": 12,
    "totalOrders": 500,
    "pendingOrders": 25,
    "completedOrders": 450,
    "cancelledOrders": 25,
    "totalTransactions": 500,
    "pendingTransactions": 20,
    "completedTransactions": 470,
    "failedTransactions": 10,
    "totalRevenue": 125000.00,
    "monthlyRevenue": 15000.00,
    "weeklyRevenue": 3500.00,
    "dailyRevenue": 500.00,
    "orderGrowth": 15.5,
    "revenueGrowth": 12.3,
    "topCategory": "Rice & Grains",
    "topSellingProduct": "Royal Basmati Rice",
    "averageOrderValue": 250.00,
    "totalCustomers": 350,
    "activeCustomers": 280
  }
}
```

---

### GET /dashboard/activities

Get recent activities and system events.

**Access:** Admin Only  
**Headers:** `Authorization: Bearer <admin-token>`  
**Query Parameters:**
- `limit`: Optional, 1-50 (default: 10)

**Success Response (200):**

```json
{
  "success": true,
  "message": "Recent activities retrieved successfully",
  "data": [
    {
      "id": "880e8400-e29b-41d4-a716-446655440030",
      "type": "order",
      "action": "created",
      "description": "New order #12345 from John Doe for ₵250.50",
      "user": {
        "id": "990e8400-e29b-41d4-a716-446655440040",
        "name": "John Doe"
      },
      "timestamp": "2025-10-10T10:25:00Z",
      "metadata": {
        "orderId": "12345",
        "amount": 250.50
      }
    },
    {
      "id": "880e8400-e29b-41d4-a716-446655440031",
      "type": "product",
      "action": "stock_low",
      "description": "Low stock alert: Royal Basmati Rice (5 remaining)",
      "timestamp": "2025-10-10T10:20:00Z",
      "metadata": {
        "productId": "550e8400-e29b-41d4-a716-446655440000",
        "productName": "Royal Basmati Rice",
        "quantity": 5
      }
    }
  ]
}
```

---

### GET /dashboard/analytics

Get sales analytics and performance metrics.

**Access:** Admin Only  
**Headers:** `Authorization: Bearer <admin-token>`  
**Query Parameters:**
- `period`: Optional, 1-365 days (default: 30)

**Success Response (200):**

```json
{
  "success": true,
  "message": "Sales analytics retrieved successfully",
  "data": {
    "totalSales": 45000.00,
    "totalOrders": 180,
    "averageOrderValue": 250.00,
    "dailySales": [
      {
        "date": "2025-10-10",
        "sales": 1500.00,
        "orders": 6,
        "averageOrderValue": 250.00
      },
      {
        "date": "2025-10-09",
        "sales": 2000.00,
        "orders": 8,
        "averageOrderValue": 250.00
      }
    ],
    "topProducts": [
      {
        "productId": "550e8400-e29b-41d4-a716-446655440000",
        "productName": "Royal Basmati Rice",
        "totalSold": 150,
        "revenue": 19500.00,
        "averagePrice": 130.00
      }
    ],
    "salesByCategory": [
      {
        "category": "Rice & Grains",
        "sales": 25000.00,
        "percentage": 55.6,
        "orders": 100
      },
      {
        "category": "Cooking Oils",
        "sales": 15000.00,
        "percentage": 33.3,
        "orders": 60
      }
    ],
    "revenueGrowth": {
      "current": 45000.00,
      "previous": 39000.00,
      "growthPercentage": 15.4
    }
  }
}
```

---

### GET /dashboard/alerts

Get low stock alerts and warnings.

**Access:** Admin Only  
**Headers:** `Authorization: Bearer <admin-token>`  
**Query Parameters:**
- `threshold`: Optional, 0-100 (default: 10) - minimum quantity for alert

**Success Response (200):**

```json
{
  "success": true,
  "message": "Low stock alerts retrieved successfully",
  "data": [
    {
      "productId": "550e8400-e29b-41d4-a716-446655440000",
      "productName": "Royal Basmati Rice",
      "currentStock": 5,
      "category": "Rice & Grains",
      "subcategory": "Imported Rice",
      "price": 130.00,
      "lastRestocked": "2025-10-05T10:00:00Z",
      "urgency": "high",
      "daysUntilOutOfStock": 2
    },
    {
      "productId": "550e8400-e29b-41d4-a716-446655440001",
      "productName": "Tilda Rice",
      "currentStock": 8,
      "category": "Rice & Grains",
      "subcategory": "Imported Rice",
      "price": 145.50,
      "lastRestocked": "2025-10-08T10:00:00Z",
      "urgency": "medium",
      "daysUntilOutOfStock": 4
    }
  ]
}
```

---

## AI Endpoints

### POST /ai/chat

Get AI-powered chat response with product recommendations.

**Access:** Public  
**Request Body:**

```json
{
  "message": "I have ₵100 for groceries for a family of 4",
  "role": "parent",
  "familySize": 4,
  "budget": 100
}
```

**Validation:**
- `message`: Required, 1-1000 characters
- `role`: Optional, max 50 characters
- `familySize`: Optional, 1-20
- `budget`: Optional, positive number

**Success Response (200):**

```json
{
  "success": true,
  "message": "AI response generated successfully",
  "data": {
    "message": "**Recommended Basket** (Budget: ₵100.00):\n\n• Rice Olonka x2 - ₵70.00\n• Cooking Oil 1L x1 - ₵25.00\n• Salt 500g x1 - ₵5.00\n\n**Total: ₵100.00**\n**Savings: ₵0.00**\n\n**Reasoning:** Optimized a budget-friendly basket for a parent (family size 4). Selected 3 essential items prioritizing staples to maximize nutritional value within your budget.",
    "products": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Rice Olonka",
        "quantity": 2,
        "price": 35.00,
        "subtotal": 70.00
      }
    ],
    "total": 100.00
  }
}
```

---

### POST /ai/recommendations

Get AI-powered product recommendations based on budget and preferences.

**Access:** Public  
**Request Body:**

```json
{
  "budget": 150,
  "familySize": 3,
  "role": "student",
  "preferences": ["vegetarian", "healthy"],
  "categories": ["Rice & Grains", "Fresh Vegetables"]
}
```

**Validation:**
- `budget`: Required, minimum 1
- `familySize`: Optional, 1-20
- `role`: Optional, max 50 characters
- `preferences`: Optional, array of strings (1-100 characters each)
- `categories`: Optional, array of strings (1-100 characters each)

**Success Response (200):**

```json
{
  "success": true,
  "message": "Recommendations generated successfully",
  "data": {
    "items": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Royal Basmati Rice",
        "price": 45.00,
        "quantity": 1,
        "category": "Rice & Grains",
        "subcategory": "Imported Rice",
        "images": ["/products/royal-rice.png"],
        "rating": 4.6,
        "inStock": true,
        "subtotal": 45.00
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440010",
        "name": "Fresh Spinach",
        "price": 15.00,
        "quantity": 2,
        "category": "Fresh Vegetables",
        "subcategory": "Leafy Greens",
        "images": ["/products/spinach.png"],
        "rating": 4.8,
        "inStock": true,
        "subtotal": 30.00
      }
    ],
    "total": 145.00,
    "savings": 5.00,
    "rationale": "Optimized a budget-friendly basket for a student (family size 3). Selected 5 essential items prioritizing vegetarian options and healthy choices to maximize nutritional value within your ₵150 budget.",
    "budgetUtilization": 96.7,
    "nutritionalBalance": {
      "carbohydrates": "high",
      "proteins": "medium",
      "vitamins": "high",
      "minerals": "high"
    }
  }
}
```

---

### GET /ai/search

AI-powered product search with natural language understanding.

**Access:** Public  
**Query Parameters:**
- `query`: Required, 1-200 characters
- `limit`: Optional, 1-50 (default: 10)

**Example Request:**
```
GET /api/ai/search?query=cheap rice for a family&limit=10
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Product search completed successfully",
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Rice Olonka (Local Rice)",
      "price": 35.00,
      "quantity": 100,
      "category": "Rice & Grains",
      "subcategory": "Local Rice",
      "images": ["/products/rice-olonka.png"],
      "rating": 4.5,
      "inStock": true,
      "relevanceScore": 0.95
    }
  ]
}
```

---

### POST /ai/budget-analysis

Analyze budget and provide shopping insights.

**Access:** Public  
**Request Body:**

```json
{
  "budget": 200,
  "familySize": 4,
  "duration": "week"
}
```

**Validation:**
- `budget`: Required, minimum 1
- `familySize`: Optional, 1-20
- `duration`: Optional, one of: `day`, `week`, `month`

**Success Response (200):**

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
    "estimatedMeals": 21,
    "costPerMeal": 9.52,
    "costPerPerson": 50.00,
    "suggestions": [
      "Include fresh proteins like chicken or fish (₵50)",
      "Add variety with seasonal vegetables and fruits (₵40)",
      "Stock up on staples like rice and cooking oil (₵80)",
      "Plan meals in advance to avoid food waste"
    ],
    "warnings": [],
    "budgetAdequacy": "good",
    "comparisonToAverage": {
      "percentage": 95,
      "message": "Your budget is 5% below the average for a family of 4"
    }
  }
}
```

---

### POST /ai/meal-suggestions

Get meal suggestions based on available ingredients.

**Access:** Public  
**Request Body:**

```json
{
  "ingredients": ["rice", "chicken", "tomatoes", "onions"],
  "mealType": "dinner",
  "dietaryRestrictions": ["no-pork"],
  "familySize": 4
}
```

**Validation:**
- `ingredients`: Optional, array of strings (1-100 characters each)
- `mealType`: Optional, one of: `breakfast`, `lunch`, `dinner`, `snack`, `any`
- `dietaryRestrictions`: Optional, array of strings (1-100 characters each)
- `familySize`: Optional, 1-20

**Success Response (200):**

```json
{
  "success": true,
  "message": "Meal suggestions generated successfully",
  "data": [
    {
      "name": "Jollof Rice with Grilled Chicken",
      "description": "Traditional Ghanaian jollof rice with perfectly seasoned grilled chicken",
      "ingredients": ["Rice", "Chicken", "Tomatoes", "Onions", "Spices", "Oil"],
      "estimatedCost": 120,
      "servings": 4,
      "difficulty": "medium",
      "cookingTime": 60,
      "cuisine": "Ghanaian",
      "mealType": "dinner",
      "nutritionalInfo": {
        "calories": 450,
        "protein": "25g",
        "carbs": "55g",
        "fat": "12g"
      },
      "instructions": [
        "Prepare and season the chicken",
        "Make the tomato base",
        "Cook the rice in the tomato sauce",
        "Grill the chicken",
        "Serve hot"
      ]
    },
    {
      "name": "Chicken Fried Rice",
      "description": "Quick and easy fried rice with chicken and vegetables",
      "ingredients": ["Rice", "Chicken", "Onions", "Vegetables", "Soy Sauce", "Oil"],
      "estimatedCost": 80,
      "servings": 4,
      "difficulty": "easy",
      "cookingTime": 30,
      "cuisine": "Asian",
      "mealType": "dinner"
    }
  ]
}
```

---

## User Authentication Endpoints

### POST /auth/signup

Register a new user account with email and password.

**Access:** Public  
**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!@",
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+233241234567"
}
```

**Validation:**
- `email`: Required, valid email format
- `password`: Required, minimum 8 characters, must contain uppercase, lowercase, number, and special character
- `firstName`: Required, 2-50 characters
- `lastName`: Required, 2-50 characters
- `phoneNumber`: Required, international format (e.g., +233241234567)

**Success Response (201):**

```json
{
  "success": true,
  "message": "Account created successfully. Please verify your email.",
  "user": {
    "id": "990e8400-e29b-41d4-a716-446655440050",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "+233241234567",
    "countryCode": "+233",
    "isEmailVerified": false,
    "isPhoneVerified": false,
    "role": "customer",
    "created_at": "2025-10-10T10:00:00Z"
  }
}
```

**Error Response (409):**

```json
{
  "success": false,
  "message": "Email already registered",
  "errors": ["An account with this email already exists"]
}
```

---

### POST /auth/signin

Sign in user with email and password.

**Access:** Public  
**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!@"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Signed in successfully",
  "user": {
    "id": "990e8400-e29b-41d4-a716-446655440050",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "+233241234567",
    "profilePicture": "https://storage.example.com/profiles/user.jpg",
    "isEmailVerified": true,
    "isPhoneVerified": false,
    "role": "customer",
    "preferences": {
      "language": "en",
      "currency": "GHS",
      "familySize": 4
    }
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "refresh_token_string_here"
}
```

**Error Response (401):**

```json
{
  "success": false,
  "message": "Invalid credentials",
  "errors": ["Email or password is incorrect"]
}
```

---

### POST /auth/google

Authenticate user with Google OAuth.

**Access:** Public  
**Request Body:**

```json
{
  "idToken": "google_id_token_from_oauth",
  "nonce": "optional_nonce_for_security"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Signed in with Google successfully",
  "user": {
    "id": "990e8400-e29b-41d4-a716-446655440051",
    "email": "user@gmail.com",
    "firstName": "John",
    "lastName": "Doe",
    "profilePicture": "https://lh3.googleusercontent.com/...",
    "isEmailVerified": true,
    "role": "customer"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "refresh_token_string_here"
}
```

---

### POST /auth/signout

Sign out current user and invalidate tokens.

**Access:** Private  
**Headers:** `Authorization: Bearer <user-token>`

**Success Response (200):**

```json
{
  "success": true,
  "message": "Signed out successfully"
}
```

---

### GET /auth/me

Get current authenticated user profile.

**Access:** Private  
**Headers:** `Authorization: Bearer <user-token>`

**Success Response (200):**

```json
{
  "success": true,
  "message": "User data retrieved successfully",
  "user": {
    "id": "990e8400-e29b-41d4-a716-446655440050",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "+233241234567",
    "countryCode": "+233",
    "profilePicture": "https://storage.example.com/profiles/user.jpg",
    "isEmailVerified": true,
    "isPhoneVerified": false,
    "role": "customer",
    "preferences": {
      "language": "en",
      "currency": "GHS",
      "familySize": 4,
      "dietaryRestrictions": ["vegetarian"],
      "preferredCategories": ["Rice & Grains", "Fresh Vegetables"]
    },
    "created_at": "2025-09-01T10:00:00Z",
    "updated_at": "2025-10-10T10:00:00Z"
  }
}
```

---

### PUT /auth/me

Update current user profile.

**Access:** Private  
**Headers:** `Authorization: Bearer <user-token>`  
**Request Body:**

```json
{
  "firstName": "Updated Name",
  "lastName": "Updated Last",
  "phoneNumber": "+233241234567",
  "preferences": {
    "familySize": 5,
    "language": "en",
    "currency": "GHS"
  }
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Profile updated successfully",
  "user": {
    "id": "990e8400-e29b-41d4-a716-446655440050",
    "firstName": "Updated Name",
    "lastName": "Updated Last",
    "phoneNumber": "+233241234567",
    "preferences": {
      "familySize": 5,
      "language": "en",
      "currency": "GHS"
    },
    "updated_at": "2025-10-10T10:30:00Z"
  }
}
```

---

### POST /auth/refresh

Refresh access token using refresh token.

**Access:** Public  
**Request Body:**

```json
{
  "refreshToken": "refresh_token_string_here"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "accessToken": "new_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "new_refresh_token_string_here"
}
```

**Error Response (401):**

```json
{
  "success": false,
  "message": "Invalid refresh token",
  "errors": ["Refresh token is expired or invalid"]
}
```

---

## Account Management Endpoints

### POST /account/check-email

Check email status (available, exists, or deleted).

**Access:** Public  
**Request Body:**

```json
{
  "email": "user@example.com"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "status": "available",
  "message": "Email is available for registration",
  "canRegister": true
}
```

**Possible status values:**
- `available`: Email is not registered
- `exists`: Email is registered and active
- `deleted`: Email was registered but account was deleted

**For deleted accounts:**

```json
{
  "success": true,
  "status": "deleted",
  "message": "Email was previously registered but account was deleted",
  "canRecover": true,
  "deletedAt": "2025-10-05T10:00:00Z"
}
```

---

### DELETE /account/delete

Soft delete user account (can be recovered within 30 days).

**Access:** Private  
**Headers:** `Authorization: Bearer <user-token>`  
**Request Body:**

```json
{
  "reason": "No longer need the service"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Account deleted successfully. You can recover your account within 30 days if needed.",
  "data": {
    "deletedAt": "2025-10-10T10:00:00Z",
    "recoveryDeadline": "2025-11-09T10:00:00Z"
  }
}
```

---

### POST /account/recovery/initiate

Initiate account recovery for deleted accounts.

**Access:** Public  
**Request Body:**

```json
{
  "email": "user@example.com"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Account recovery initiated. Please check your email for recovery instructions.",
  "data": {
    "email": "user@example.com",
    "expiresIn": "24 hours"
  }
}
```

---

### POST /account/recovery/complete

Complete account recovery process.

**Access:** Public  
**Request Body:**

```json
{
  "email": "user@example.com",
  "recoveryToken": "recovery_token_from_email",
  "newPassword": "NewSecurePass123!@"
}
```

**Validation:**
- `email`: Required, valid email
- `recoveryToken`: Required
- `newPassword`: Required, minimum 8 characters, must contain uppercase, lowercase, number, and special character

**Success Response (200):**

```json
{
  "success": true,
  "message": "Account recovered successfully. Please verify your email address.",
  "user": {
    "id": "990e8400-e29b-41d4-a716-446655440050",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

---

## OTP Endpoints

### POST /otp/send

Send email verification OTP code.

**Access:** Public  
**Request Body:**

```json
{
  "email": "user@example.com",
  "type": "signup"
}
```

**Validation:**
- `email`: Required, valid email
- `type`: Optional, one of: `signup`, `recovery`, `email_change`

**Success Response (200):**

```json
{
  "success": true,
  "message": "Verification email sent successfully",
  "data": {
    "email": "user@example.com",
    "expiresIn": "10 minutes"
  }
}
```

---

### POST /otp/verify

Verify email OTP code.

**Access:** Public  
**Request Body:**

```json
{
  "email": "user@example.com",
  "token": "123456"
}
```

**Validation:**
- `email`: Required, valid email
- `token`: Required, exactly 6 digits

**Success Response (200):**

```json
{
  "success": true,
  "message": "Email verified successfully",
  "data": {
    "session": {
      "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refresh_token": "refresh_token_string",
      "user": {
        "id": "990e8400-e29b-41d4-a716-446655440050",
        "email": "user@example.com",
        "email_confirmed_at": "2025-10-10T10:00:00Z"
      }
    }
  }
}
```

**Error Response (400):**

```json
{
  "success": false,
  "message": "Invalid or expired OTP",
  "errors": ["The OTP code is incorrect or has expired"]
}
```

---

### GET /otp/verify-hash

Verify email with token hash (PKCE flow for email links).

**Access:** Public  
**Query Parameters:**
- `token_hash`: Required, token hash from email link
- `type`: Optional, `email` or `recovery`

**Example Request:**
```
GET /api/otp/verify-hash?token_hash=abc123def456&type=email
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Email verified successfully",
  "data": {
    "session": {
      "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refresh_token": "refresh_token_string",
      "user": {
        "id": "990e8400-e29b-41d4-a716-446655440050",
        "email": "user@example.com"
      }
    }
  }
}
```

---

### POST /otp/reset-password

Send password reset email with OTP.

**Access:** Public  
**Request Body:**

```json
{
  "email": "user@example.com"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Password reset email sent successfully",
  "data": {
    "email": "user@example.com",
    "expiresIn": "10 minutes"
  }
}
```

---

## Profile Endpoints

### GET /profile

Get current user profile with full details.

**Access:** Private  
**Headers:** `Authorization: Bearer <user-token>`

**Success Response (200):**

```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "user": {
    "id": "990e8400-e29b-41d4-a716-446655440050",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "+233241234567",
    "countryCode": "+233",
    "profilePicture": "https://storage.example.com/profiles/user.jpg",
    "isEmailVerified": true,
    "isPhoneVerified": false,
    "role": "customer",
    "preferences": {
      "language": "en",
      "currency": "GHS",
      "familySize": 4,
      "dietaryRestrictions": ["vegetarian"],
      "preferredCategories": ["Rice & Grains", "Fresh Vegetables"]
    },
    "created_at": "2025-09-01T10:00:00Z",
    "updated_at": "2025-10-10T10:00:00Z"
  }
}
```

---

### PUT /profile

Update user profile information.

**Access:** Private  
**Headers:** `Authorization: Bearer <user-token>`  
**Request Body:**

```json
{
  "firstName": "Updated Name",
  "lastName": "Updated Last",
  "phoneNumber": "+233241234567",
  "preferences": {
    "familySize": 4,
    "language": "en",
    "currency": "GHS",
    "dietaryRestrictions": ["vegetarian", "no-pork"],
    "preferredCategories": ["Rice & Grains", "Fresh Vegetables"]
  }
}
```

**Validation:**
- `firstName`: Optional, 2-50 characters
- `lastName`: Optional, 2-50 characters
- `phoneNumber`: Optional, international format
- `preferences.familySize`: Optional, 1-20
- `preferences.language`: Optional, one of: `en`, `tw`, `fr`
- `preferences.currency`: Optional, one of: `GHS`, `USD`

**Success Response (200):**

```json
{
  "success": true,
  "message": "Profile updated successfully",
  "user": {
    "id": "990e8400-e29b-41d4-a716-446655440050",
    "firstName": "Updated Name",
    "lastName": "Updated Last",
    "phoneNumber": "+233241234567",
    "preferences": {
      "familySize": 4,
      "language": "en",
      "currency": "GHS",
      "dietaryRestrictions": ["vegetarian", "no-pork"],
      "preferredCategories": ["Rice & Grains", "Fresh Vegetables"]
    },
    "updated_at": "2025-10-10T10:30:00Z"
  }
}
```

---

### POST /profile/picture

Upload profile picture.

**Access:** Private  
**Headers:** `Authorization: Bearer <user-token>`  
**Content-Type:** `multipart/form-data`

**Form Data:**
- `profilePicture`: Image file (JPEG, PNG, WebP, max 5MB)

**Success Response (200):**

```json
{
  "success": true,
  "message": "Profile picture uploaded successfully",
  "profilePictureUrl": "https://storage.example.com/profiles/990e8400-e29b-41d4-a716-446655440050.jpg",
  "data": {
    "url": "https://storage.example.com/profiles/990e8400-e29b-41d4-a716-446655440050.jpg",
    "size": 245678,
    "mimeType": "image/jpeg"
  }
}
```

**Error Response (400):**

```json
{
  "success": false,
  "message": "Invalid file type",
  "errors": ["Only JPEG, PNG, and WebP images are allowed"]
}
```

---

### DELETE /profile/picture

Delete profile picture.

**Access:** Private  
**Headers:** `Authorization: Bearer <user-token>`

**Success Response (200):**

```json
{
  "success": true,
  "message": "Profile picture deleted successfully"
}
```

---

## Error Codes & Responses

### HTTP Status Codes

| Code | Status | Description |
|------|--------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request data or validation error |
| 401 | Unauthorized | Authentication required or invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Duplicate data or conflicting state |
| 422 | Unprocessable Entity | Validation error |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

### Error Response Format

All error responses follow this format:

```json
{
  "success": false,
  "message": "Error description",
  "errors": ["Specific error detail 1", "Specific error detail 2"]
}
```

### Common Error Responses

**Validation Error (400):**

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    "Email is required",
    "Password must be at least 8 characters long",
    "Phone number must be in international format"
  ]
}
```

**Authentication Error (401):**

```json
{
  "success": false,
  "message": "Not authenticated",
  "errors": ["Please sign in to access this resource"]
}
```

**Authorization Error (403):**

```json
{
  "success": false,
  "message": "Forbidden",
  "errors": ["You do not have permission to perform this action"]
}
```

**Not Found Error (404):**

```json
{
  "success": false,
  "message": "Resource not found",
  "errors": ["Product with ID 550e8400-e29b-41d4-a716-446655440000 does not exist"]
}
```

**Rate Limit Error (429):**

```json
{
  "success": false,
  "message": "Too many requests from this IP, please try again later.",
  "errors": ["Rate limit exceeded. Try again in 15 minutes."]
}
```

**Server Error (500):**

```json
{
  "success": false,
  "message": "Internal server error",
  "errors": ["An unexpected error occurred. Please try again later."]
}
```

---

## Request Examples

### JavaScript/Fetch

```javascript
// Sign up
const response = await fetch("http://localhost:3000/api/auth/signup", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    phoneNumber: "+233241234567",
    password: "SecurePass123!@",
  }),
});

const data = await response.json();
console.log(data);

// Authenticated request
const token = "your_access_token_here";
const response = await fetch("http://localhost:3000/api/profile", {
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
});

// File upload
const formData = new FormData();
formData.append("profilePicture", fileInput.files[0]);

const response = await fetch("http://localhost:3000/api/profile/picture", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
  },
  body: formData,
});

// Get products with filters
const response = await fetch(
  "http://localhost:3000/api/products?page=1&limit=20&category=Rice%20%26%20Grains&inStock=true&sortBy=price&sortOrder=asc"
);

// AI recommendations
const response = await fetch("http://localhost:3000/api/ai/recommendations", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    budget: 150,
    familySize: 4,
    role: "parent",
    preferences: ["vegetarian"],
    categories: ["Rice & Grains", "Fresh Vegetables"],
  }),
});
```

### cURL

```bash
# Sign up
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phoneNumber": "+233241234567",
    "password": "SecurePass123!@"
  }'

# Admin login
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'

# Get products (public)
curl -X GET "http://localhost:3000/api/products?page=1&limit=20"

# Get profile (authenticated)
curl -X GET http://localhost:3000/api/profile \
  -H "Authorization: Bearer your_access_token"

# Create product (admin)
curl -X POST http://localhost:3000/api/products \
  -H "Authorization: Bearer your_admin_token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Royal Basmati Rice",
    "brand": "Royal",
    "description": "Premium basmati rice",
    "category_name": "Rice & Grains",
    "subcategory": "Imported Rice",
    "price": 130.00,
    "currency": "GHS",
    "quantity": 50,
    "weight": 5.0,
    "type": "Long-Grain",
    "packaging": "Bag",
    "in_stock": true
  }'

# Upload profile picture
curl -X POST http://localhost:3000/api/profile/picture \
  -H "Authorization: Bearer your_access_token" \
  -F "profilePicture=@/path/to/image.jpg"

# AI recommendations
curl -X POST http://localhost:3000/api/ai/recommendations \
  -H "Content-Type: application/json" \
  -d '{
    "budget": 150,
    "familySize": 4,
    "role": "parent",
    "preferences": ["vegetarian"],
    "categories": ["Rice & Grains"]
  }'
```

### Python

```python
import requests

# Sign up
response = requests.post(
    "http://localhost:3000/api/auth/signup",
    json={
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com",
        "phoneNumber": "+233241234567",
        "password": "SecurePass123!@"
    }
)
print(response.json())

# Authenticated request
token = "your_access_token_here"
headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

response = requests.get(
    "http://localhost:3000/api/profile",
    headers=headers
)
print(response.json())

# Get products with filters
params = {
    "page": 1,
    "limit": 20,
    "category": "Rice & Grains",
    "inStock": True,
    "sortBy": "price",
    "sortOrder": "asc"
}
response = requests.get(
    "http://localhost:3000/api/products",
    params=params
)
print(response.json())
```

---

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **General API Endpoints**: 100 requests per 15 minutes per IP
- **Authentication Endpoints**: Additional rate limiting may apply
- **Admin Endpoints**: Higher limits for authenticated admin users
- **File Uploads**: 10 requests per 5 minutes per user

When rate limited, you'll receive a `429 Too Many Requests` response with the `Retry-After` header indicating when you can try again.

---

## Security Features

1. **Password Hashing**: All passwords are hashed using bcrypt with 12 rounds
2. **JWT Tokens**: Secure access tokens with refresh mechanism
3. **Input Validation**: All inputs are validated and sanitized
4. **CORS Protection**: Configured for specific origins
5. **Rate Limiting**: Protection against abuse and DDoS
6. **File Upload Security**: Type and size validation
7. **SQL Injection Prevention**: Parameterized queries
8. **XSS Protection**: Input sanitization and output encoding
9. **HTTPS Required**: All production traffic must use HTTPS
10. **Admin Authentication**: Separate authentication for admin endpoints

---

## Environment Variables

Required environment variables for the backend:

```bash
# Server
PORT=3000
NODE_ENV=development

# Frontend URLs
FRONTEND_URL=http://localhost:3001
ADMIN_URL=http://localhost:3000

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# Email (optional, for OTP)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASS=your_email_password
```

---

## Support & Contact

For API support or questions:
- **Email**: support@grovio.com
- **Documentation**: https://docs.grovio.com
- **Status Page**: https://status.grovio.com

---

**Last Updated:** October 10, 2025  
**API Version:** 1.0.0  
**Documentation Version:** 1.0.0
