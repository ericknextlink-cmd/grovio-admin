# 🔍 Diagnosis: User Signup Foreign Key Error

## 🐛 **The Error**

```
Key (id)=(17148681-03d9-445b-9084-989c9511e9f6) is not present in table "users"

Foreign key constraint "users_id_fkey" violation
```

---

## 🔍 **What This Means**

The foreign key is looking for the ID in the **WRONG** table!

- ❌ It's checking: Does `17148681-03d9-445b-9084-989c9511e9f6` exist in `public.users`?
- ✅ It should check: Does `17148681-03d9-445b-9084-989c9511e9f6` exist in `auth.users`?

**Translation:** Your `public.users.id` foreign key constraint is **self-referencing** instead of referencing `auth.users`!

---

## ✅ **The Fix**

### **Run This in Supabase SQL Editor:**

```sql
-- Step 1: Check current constraint
SELECT
    tc.constraint_name,
    ccu.table_schema AS foreign_schema,
    ccu.table_name AS foreign_table
FROM information_schema.table_constraints AS tc
JOIN information_schema.constraint_column_usage AS ccu
    ON tc.constraint_name = ccu.constraint_name
WHERE tc.table_name = 'users'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public';

-- If it shows "foreign_table = users" and "foreign_schema = public" → BUG! ❌
-- Should show "foreign_table = users" and "foreign_schema = auth" → CORRECT! ✅

-- Step 2: Drop wrong constraint
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_id_fkey;

-- Step 3: Create correct constraint
ALTER TABLE public.users 
ADD CONSTRAINT users_id_fkey 
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 4: Verify it's correct now
SELECT
    tc.constraint_name,
    ccu.table_schema AS foreign_schema,
    ccu.table_name AS foreign_table
FROM information_schema.table_constraints AS tc
JOIN information_schema.constraint_column_usage AS ccu
    ON tc.constraint_name = ccu.constraint_name
WHERE tc.constraint_name = 'users_id_fkey';

-- Should now show: auth | users ✅
```

---

## 🧪 **After Fixing: Test Signup**

```bash
curl -X POST https://your-api/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "email": "test2@example.com",
    "phoneNumber": "+233241234568",
    "password": "SecurePass123!"
  }'
```

**Expected:** ✅ Success!

---

## 📊 **How to Check Logs**

After deploying the updated code with extra logging:

1. Try signup again
2. Check server logs for:
   - `Creating auth user for: [email]`
   - `Auth signup result: { hasUser: true/false, userId: '...' }`
   - `✅ Auth user created: [id]` OR `❌ No user returned from signUp`

**This will tell us if:**
- Auth user is being created
- The ID matches what we're inserting

---

## 🎯 **Most Likely Cause**

**95% certain:** Foreign key constraint is misconfigured.

**Test:** Run the SQL diagnostic above to confirm.

**Fix:** Run the SQL fix above.

---

**🚨 This is a database schema issue, not an authentication issue!**

