-- =====================================================
-- 🔧 FIX FOREIGN KEY CONSTRAINT FOR USER SIGNUP
-- =====================================================
-- This fixes: "Key (id)=...is not present in table 'users'"
-- =====================================================

-- Step 1: Drop the INCORRECT foreign key constraint
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_id_fkey;

-- Step 2: Create the CORRECT foreign key constraint
-- The users.id should reference auth.users.id, NOT public.users.id!
ALTER TABLE public.users 
ADD CONSTRAINT users_id_fkey 
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 3: Verify it's correct
SELECT 
    tc.constraint_name,
    ccu.table_schema AS foreign_schema,
    ccu.table_name AS foreign_table,
    ccu.column_name AS foreign_column
FROM information_schema.table_constraints AS tc
JOIN information_schema.constraint_column_usage AS ccu
    ON tc.constraint_name = ccu.constraint_name
WHERE tc.table_name = 'users'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public';

-- Expected output:
-- users_id_fkey | auth | users | id
-- ✅ If you see 'public' instead of 'auth', the constraint was wrong!

-- =====================================================
-- ✅ DONE!
-- =====================================================

