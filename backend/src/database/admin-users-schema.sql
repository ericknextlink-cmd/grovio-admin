-- Admin Users Table Schema
-- This table stores admin user accounts separate from regular user accounts

CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_users_username ON public.admin_users(username);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON public.admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_is_active ON public.admin_users(is_active);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_admin_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_admin_users_updated_at_trigger
  BEFORE UPDATE ON public.admin_users
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_users_updated_at();

-- Row Level Security (RLS) - Admins can only see themselves and super admins can see all
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Policy: Super admins can see all admin users
CREATE POLICY "Super admins can view all admin users"
  ON public.admin_users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE id = auth.uid()::text
      AND role = 'super_admin'
    )
  );

-- Policy: Admins can view their own record
CREATE POLICY "Admins can view their own record"
  ON public.admin_users
  FOR SELECT
  USING (id::text = auth.uid()::text);

-- Note: Service role key bypasses RLS, which is what we use in the backend
-- This allows the backend to authenticate admins without RLS restrictions

-- Example: Insert a default admin user (password should be hashed with bcrypt)
-- Password: admin123 (you should change this in production!)
-- Hash: $2a$10$YourHashedPasswordHere
-- INSERT INTO public.admin_users (username, email, full_name, password_hash, role)
-- VALUES ('admin', 'admin@example.com', 'Administrator', '$2a$10$YourHashedPasswordHere', 'super_admin');

