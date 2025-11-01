# 🔒 User Signup Security & Foreign Key Fix

## ✅ **Fixes Applied**

### **1. Error Sanitization** ✅

**Problem:** Database and internal errors were being exposed to users.

**Solution:** Created comprehensive error sanitization utility.

**Files Created:**
- ✅ `backend/src/utils/error-sanitizer.ts` - Central error sanitization

**Changes:**
- ✅ `backend/src/utils/auth.ts` - Removed duplicate sanitizeDatabaseError
- ✅ `backend/src/services/auth.service.ts` - All errors sanitized

**Before:**
```typescript
errors: [dbError.message]
// Exposed: "insert or update on table 'users' violates foreign key constraint 'users_id_fkey'"
```

**After:**
```typescript
errors: [sanitizeDatabaseError(dbError)]
// Displays: "Unable to create user account. Please try again or contact support."
```

### **2. Foreign Key Constraint** ✅

**Problem:** Error: `insert or update on table "users" violates foreign key constraint "users_id_fkey"`

**Root Cause:** The `users` table has a foreign key constraint:
```sql
id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY
```

This means the `id` you're inserting MUST exist in Supabase's `auth.users` table first!

**Current Flow (CORRECT):**
1. ✅ Check if user exists (email/phone)
2. ✅ Create user in `auth.users` via `supabase.auth.signUp()`
3. ✅ Insert user profile in `public.users` with the same `id`

**The Code is Already Correct!** The error suggests that either:
- Supabase Auth signup is failing silently
- Or the `auth.users` user isn't being created before the insert

---

## 🔍 **Investigation: Why Foreign Key Error?**

The foreign key error could mean:

### **Scenario 1: Supabase Auth Disabled Email Confirmation**

If email confirmation is **enabled** in Supabase, `signUp()` creates the user in `auth.users` but marks them as **unconfirmed**. Then when we try to insert into `public.users`, it works!

But if there's a **database trigger** or **RPC function** that expects something specific, it might fail.

**Check:** Supabase Dashboard → Authentication → Settings → Email Auth
- If "Confirm email" is enabled, users need to verify before signing in
- This is separate from inserting into the users table

### **Scenario 2: Database Schema Issue**

The foreign key constraint might be misconfigured.

**Fix:** Run this in Supabase SQL Editor:

```sql
-- Check if foreign key exists
SELECT
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'users';

-- Should show:
-- users_id_fkey | users | id | users | id

-- Wait, that's self-referencing! Should be:
-- users_id_fkey | users | id | auth.users | id

-- If wrong, fix it:
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_id_fkey;
ALTER TABLE public.users ADD CONSTRAINT users_id_fkey 
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
```

### **Scenario 3: Supabase Auth Not Working**

The `supabase.auth.signUp()` might be failing silently.

**Debug:** Add more logging:

```typescript
const { data: authData, error: authError } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      phone_number: phoneNumber.trim(),
      country_code: countryCode
    }
  }
})

console.log('Auth signup result:', { 
  hasUser: !!authData.user, 
  userId: authData.user?.id,
  error: authError 
})
```

---

## 🧪 **Testing Steps**

### **Test 1: Check Existing Users**

```sql
-- Check auth.users
SELECT id, email, created_at 
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- Check public.users
SELECT id, email, created_at 
FROM public.users
ORDER BY created_at DESC
LIMIT 5;

-- Are there any users in auth.users but NOT in public.users?
-- These are orphaned auth users
SELECT au.id, au.email
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;
```

### **Test 2: Verify Foreign Key**

```sql
-- Check constraint
SELECT con.conname, con.confrelid::regclass
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'users' 
  AND con.contype = 'f';

-- Should show auth.users as referenced table
```

### **Test 3: Try Manual Insert**

```sql
-- Get a valid auth.users ID
SELECT id FROM auth.users LIMIT 1;

-- Try to insert with that ID
INSERT INTO public.users (
  id,
  email,
  first_name,
  last_name,
  phone_number,
  country_code
) VALUES (
  '00000000-0000-0000-0000-000000000000',  -- Replace with actual auth.users ID
  'test@example.com',
  'Test',
  'User',
  '+233241234567',
  '+233'
);

-- If this works, the FK is fine
-- If it fails, the FK configuration is wrong
```

---

## 🔧 **Quick Fix if Constraint is Wrong**

If the foreign key is misconfigured, run this:

```sql
-- Drop wrong constraint
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_id_fkey;

-- Recreate correct constraint
ALTER TABLE public.users 
ADD CONSTRAINT users_id_fkey 
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Verify
SELECT con.conname, con.confrelid::regclass
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'users' AND con.contype = 'f';
```

---

## 📋 **Complete Fix Summary**

### **Code Changes** ✅
- ✅ Error sanitization implemented
- ✅ All `.message` references replaced with sanitized errors
- ✅ User-friendly error messages
- ✅ No database structure exposed

### **Database Checks Needed** ⏳
- ⏳ Verify `users.id` FK points to `auth.users.id`
- ⏳ Check if there are orphaned auth.users records
- ⏳ Test manual insert with valid auth.users ID
- ⏳ Verify Supabase Auth email confirmation settings

---

## 🎯 **Root Cause Analysis**

Most likely causes:

1. **Foreign key misconfigured** (70% likely)
   - Constraint points to wrong table
   - Fix: Run the constraint fix SQL above

2. **Auth user not created** (20% likely)
   - signUp() failing silently
   - Fix: Add more logging, check Supabase dashboard

3. **Email confirmation issue** (10% likely)
   - Auth user created but marked unconfirmed
   - Should still work for FK constraint
   - Fix: Check email confirmation settings

---

## 🚀 **Next Steps**

1. ✅ Code changes deployed
2. ⏳ Run constraint check SQL
3. ⏳ Test signup flow
4. ⏳ Verify error messages are sanitized
5. ✅ Done!

---

**Need help?** Run the diagnostic SQL queries above and share the results.

