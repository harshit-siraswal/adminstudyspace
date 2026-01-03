-- ============================================
-- BANNED USERS TABLE
-- Run this SQL in your Supabase SQL Editor
-- ============================================

-- Create the banned_users table
CREATE TABLE IF NOT EXISTS public.banned_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    reason TEXT,
    banned_by TEXT,
    banned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.banned_users ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to manage banned users
CREATE POLICY "Allow all operations for authenticated users" ON public.banned_users
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Create index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_banned_users_email ON public.banned_users(email);

-- Grant access
GRANT ALL ON public.banned_users TO anon;
GRANT ALL ON public.banned_users TO authenticated;
