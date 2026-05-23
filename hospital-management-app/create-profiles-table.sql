-- ============================================
-- Create PROFILES table for role-based auth
-- Run this in Supabase SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    email TEXT NOT NULL,
    full_name TEXT DEFAULT '',
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'doctor', 'patient')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own profile
CREATE POLICY "Users can read own profile" ON profiles
    FOR SELECT USING (auth.uid() = user_id);

-- Allow users to insert their own profile
CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own profile  
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Allow all authenticated users to read all profiles (needed for role checks)
CREATE POLICY "Authenticated users can read all profiles" ON profiles
    FOR SELECT TO authenticated USING (true);

-- Allow anon to insert profiles during signup
CREATE POLICY "Service can insert profiles" ON profiles
    FOR INSERT TO anon WITH CHECK (true);
