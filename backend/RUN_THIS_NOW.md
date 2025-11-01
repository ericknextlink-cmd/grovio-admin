# 🚨 RUN THIS NOW TO FIX SIGNUP!

## ⚡ **Quick Fix (30 seconds)**

### **Copy and paste this into Supabase SQL Editor:**

```sql
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_id_fkey;
ALTER TABLE public.users 
ADD CONSTRAINT users_id_fkey 
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
```

**Click RUN!** ✅

---

## ✅ **What This Does**

**Before:**
```sql
users.id → REFERENCES public.users(id)  ❌ Self-referencing!
```

**After:**
```sql
users.id → REFERENCES auth.users(id)  ✅ Correct!
```

---

## 🧪 **Test Immediately After:**

```bash
curl -X POST https://your-api/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "email": "test999@example.com",
    "phoneNumber": "+233241999999",
    "password": "SecurePass123!"
  }'
```

**Expected:** ✅ Success!

---

## 📋 **Why This Fix Works**

1. ✅ Supabase Auth creates user in `auth.users`
2. ✅ We insert profile in `public.users` with same ID
3. ✅ Foreign key checks: "Does this ID exist in `auth.users`?"
4. ✅ YES → Insert succeeds! 🎉

---

## 🚀 **Deploy Code Too**

```bash
cd backend
npm run build
git add .
git commit -m "fix: Add logging and sanitize errors"
git push
```

---

**🎉 That's it! Signup will work after running the SQL!**

