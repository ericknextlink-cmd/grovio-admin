# 🚨 CRITICAL: Fix Required for User Signup

## ⚠️ **The Error**

```
Key (id)=(99bee187-3286-4773-9802-dafb2da2af0c) is not present in table "users"
```

**Translation:** Your database foreign key constraint is **broken**!

---

## 🔍 **Root Cause**

Your `users` table has a self-referencing foreign key instead of referencing `auth.users`!

**Wrong:**
```sql
id UUID REFERENCES public.users(id) -- ❌ Self-referencing
```

**Correct:**
```sql
id UUID REFERENCES auth.users(id) -- ✅ References Supabase Auth
```

---

## ✅ **THE FIX**

### **RUN THIS IN SUPABASE SQL EDITOR:**

```sql
-- Drop wrong constraint
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_id_fkey;

-- Create correct constraint
ALTER TABLE public.users 
ADD CONSTRAINT users_id_fkey 
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
```

**File:** Copy from `FIX_FOREIGN_KEY_CONSTRAINT.sql`

---

## 🚀 **After Running the Fix**

### **1. Deploy Code**
```bash
git add .
git commit -m "fix: Add trust proxy for rate limiting"
git push
```

### **2. Test Signup**
```bash
curl -X POST https://your-api.com/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User", 
    "email": "test@example.com",
    "phoneNumber": "+233241234567",
    "password": "SecurePass123!"
  }'
```

**Expected:** ✅ Success!

---

## ✅ **Also Fixed**

- ✅ Trust proxy for production deployments
- ✅ Rate limiting works correctly
- ✅ Error messages sanitized
- ✅ No database errors exposed

---

## 🎯 **Steps in Order**

1. ✅ Run `FIX_FOREIGN_KEY_CONSTRAINT.sql` in Supabase
2. ✅ Deploy code changes
3. ✅ Test signup
4. ✅ Done!

---

**🚨 DO NOT SKIP STEP 1 - The SQL fix is REQUIRED!**

