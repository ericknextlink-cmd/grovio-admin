# 🔒 Row Level Security (RLS) Configuration Guide

## Overview

This document explains the Row Level Security (RLS) configuration for the Grovio database and why certain tables have RLS enabled while others don't.

## 🎯 RLS Strategy

### ✅ **Tables WITH RLS Enabled**

#### **User-Specific Data Tables:**
- **`users`** - Users can only view/update their own profile
- **`orders`** - Users can only see their own orders
- **`order_items`** - Users can only see items from their orders
- **`user_preferences`** - Users can only manage their own preferences
- **`shopping_sessions`** - Users can only access their own shopping cart
- **`ai_recommendations`** - Users can only see their own AI recommendations

#### **Admin-Only Data Tables:**
- **`admin_users`** - Only admins can view/manage admin accounts
- **`transactions`** - Only admins can manage payment transactions

### ❌ **Tables WITHOUT RLS Enabled**

#### **Public Read Tables:**
- **`products`** - Need public read access for the storefront
- **`categories`** - Need public read access for browsing

**Why no RLS?** 
- These tables require **public read access** (anyone can view products/categories)
- **Admin write access** is controlled by the backend application layer
- RLS would block public read access even with permissive policies

#### **System Tables:**
- **`deleted_users`** - Managed entirely by backend application
- **`email_verification_tokens`** - Managed entirely by backend application

**Why no RLS?**
- These tables are never accessed directly by users
- All access is handled through the backend API
- No need for user-level permissions

---

## 🛡️ Security Implementation

### **Frontend/Public Access:**
```sql
-- Products and Categories are publicly readable
-- No authentication required for SELECT operations
SELECT * FROM public.products WHERE in_stock = true;
SELECT * FROM public.categories;
```

### **Admin Access Control:**
```javascript
// Backend enforces admin-only write access
if (!isAdmin(user)) {
  throw new Error('Admin access required');
}
// Admin can create/update/delete products
```

### **User Data Protection:**
```sql
-- RLS ensures users only see their own data
-- This query automatically filters by auth.uid()
SELECT * FROM public.orders; -- Only returns current user's orders
```

---

## 🔑 Policy Details

### **User Policies:**
- **Profile**: Users can view/update only their own profile
- **Orders**: Users can view/create only their own orders
- **Cart**: Users can manage only their own shopping sessions
- **Preferences**: Users can manage only their own AI preferences

### **Admin Policies:**
- **Admin Accounts**: Only super admins can manage other admin accounts
- **Transactions**: Only admins can view/manage payment transactions
- **Orders**: Admins can view all orders (for admin panel)

### **Public Policies:**
- **Products**: No policies needed (public read, backend-controlled write)
- **Categories**: No policies needed (public read, backend-controlled write)

---

## ⚠️ Important Security Notes

### **1. Public Tables Security:**
- Products and categories don't have RLS because they need public read access
- Write access is secured at the **application layer** (backend API)
- Only authenticated admins can modify through the API

### **2. Admin Authentication:**
- Admin users authenticate through separate `admin_users` table
- Admin JWT tokens include role information
- Backend middleware validates admin permissions

### **3. User Data Isolation:**
- RLS automatically filters data based on `auth.uid()`
- Users cannot access other users' data even if they try
- No additional filtering needed in application code

### **4. System Table Access:**
- System tables (deleted_users, email_verification_tokens) are backend-only
- No direct user access through Supabase client
- All operations handled through secure API endpoints

---

## 🚀 Implementation Benefits

### **Performance:**
- Public tables (products/categories) have no RLS overhead
- User-specific tables automatically filter at database level
- Efficient queries without additional WHERE clauses

### **Security:**
- Multi-layered security (RLS + application layer)
- Automatic data isolation for users
- Admin-only access properly controlled

### **Maintainability:**
- Clear separation between public, user, and admin data
- Policies are self-documenting
- Easy to audit and modify permissions

---

## 🔧 Troubleshooting

### **If you see RLS warnings:**
1. **For products/categories**: This is expected - they don't need RLS
2. **For user tables**: Check if policies are properly created
3. **For admin tables**: Ensure admin authentication is working

### **Testing RLS:**
```sql
-- Test as authenticated user
SET request.jwt.claims TO '{"sub": "user-uuid", "role": "authenticated"}';
SELECT * FROM orders; -- Should only show user's orders

-- Test as admin
SET request.jwt.claims TO '{"sub": "admin-uuid", "role": "authenticated"}';
SELECT * FROM transactions; -- Should show all transactions if admin
```

---

## 📋 Summary

✅ **Correct Configuration:**
- User data: RLS enabled with user-specific policies
- Admin data: RLS enabled with admin-only policies  
- Public data: No RLS for public read access
- System data: No RLS for backend-only access

This configuration provides:
- 🔒 **Strong security** for sensitive data
- 🌐 **Public access** for storefront data
- ⚡ **Optimal performance** with minimal overhead
- 🛠️ **Easy maintenance** with clear separation of concerns
