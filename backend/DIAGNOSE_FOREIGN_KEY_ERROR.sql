-- =====================================================
-- 🔍 DIAGNOSE FOREIGN KEY ERROR FOR USER SIGNUP
-- =====================================================
-- Copy and paste this entire file into Supabase SQL Editor
-- It will help you identify what's wrong
-- =====================================================

-- =====================================================
-- CHECK 1: Foreign Key Constraint
-- =====================================================
SELECT '=== FOREIGN KEY CONSTRAINT ===' as section;

SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'users'
    AND tc.table_schema = 'public';

-- Expected: Should reference auth.users.id
-- ❌ If it shows public.users.id instead → THAT'S THE PROBLEM!

-- =====================================================
-- CHECK 2: Users Table Structure
-- =====================================================
SELECT '=== USERS TABLE STRUCTURE ===' as section;

SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'users'
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Should have: id, email, first_name, last_name, phone_number, etc.

-- =====================================================
-- CHECK 3: Auth Users vs Public Users
-- =====================================================
SELECT '=== AUTH.USERS vs PUBLIC.USERS ===' as section;

SELECT 
    (SELECT COUNT(*) FROM auth.users) as auth_users_count,
    (SELECT COUNT(*) FROM public.users) as public_users_count,
    (SELECT COUNT(*) FROM auth.users WHERE id NOT IN (SELECT id FROM public.users)) as orphaned_auth_users;

-- orphaned_auth_users = auth.users without corresponding public.users entry
-- If > 0, these are users where auth signup worked but public.users insert failed!

-- =====================================================
-- CHECK 4: Recent Auth Users
-- =====================================================
SELECT '=== RECENT AUTH.USERS ===' as section;

SELECT 
    id, 
    email,
    created_at,
    email_confirmed_at,
    CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.users.id) 
        THEN '✅ Has public profile' 
        ELSE '❌ Missing public profile' 
    END as profile_status
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- Look for rows with "❌ Missing public profile"
-- These are the ones causing the foreign key error!

-- =====================================================
-- CHECK 5: Recent Public Users
-- =====================================================
SELECT '=== RECENT PUBLIC.USERS ===' as section;

SELECT 
    id, 
    email,
    created_at
FROM public.users
ORDER BY created_at DESC
LIMIT 5;

-- =====================================================
-- CHECK 6: Test Foreign Key
-- =====================================================
SELECT '=== TEST FOREIGN KEY ===' as section;

-- This will tell us if the FK works
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'users_id_fkey'
        ) THEN '✅ Foreign key exists'
        ELSE '❌ Foreign key MISSING!'
    END as fk_status;

-- =====================================================
-- FIX IF NEEDED
-- =====================================================
-- If the foreign key is wrong, run this:
/*
DROP CONSTRAINT IF EXISTS users_id_fkey;
ALTER TABLE public.users
ADD CONSTRAINT users_id_fkey 
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
*/

-- =====================================================
-- ✅ DONE - READ THE RESULTS
-- =====================================================

