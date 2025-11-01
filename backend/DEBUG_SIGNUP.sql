-- =====================================================
-- 🔍 DEBUG USER SIGNUP ISSUE
-- =====================================================

-- Check if the user exists in auth.users
SELECT '=== CHECKING AUTH.USERS ===' as section;

SELECT id, email, created_at, email_confirmed_at
FROM auth.users
WHERE id = '99bee187-3286-4773-9802-dafb2da2af0c';

-- Check if the user exists in public.users
SELECT '=== CHECKING PUBLIC.USERS ===' as section;

SELECT id, email, created_at
FROM public.users
WHERE id = '99bee187-3286-4773-9802-dafb2da2af0c';

-- Check foreign key constraint
SELECT '=== FOREIGN KEY CONSTRAINT ===' as section;

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

-- Should show: auth.users

-- =====================================================
-- 🔍 ANALYSIS
-- =====================================================

-- If user exists in auth.users but NOT in public.users:
-- → signUp() succeeded, but insert into public.users failed

-- If user does NOT exist in auth.users:
-- → signUp() failed silently or auth is misconfigured

-- =====================================================
-- 📊 RECENT ATTEMPTS
-- =====================================================

SELECT '=== RECENT AUTH.USERS ===' as section;

SELECT 
    id,
    email, 
    created_at,
    email_confirmed_at,
    CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.users.id) 
        THEN '✅ Has profile' 
        ELSE '❌ Missing profile' 
    END as status
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- Look for "❌ Missing profile" rows

