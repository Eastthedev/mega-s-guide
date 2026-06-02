-- ============================================================
-- Phase 6 Migration: Add explanation_history table
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Create explanation_history table
CREATE TABLE IF NOT EXISTS explanation_history (
    id VARCHAR(50) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    mode VARCHAR(20) NOT NULL,
    depth VARCHAR(20) NOT NULL,
    input TEXT NOT NULL,
    explanation_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE explanation_history ENABLE ROW LEVEL SECURITY;

-- Create RLS Policy
DROP POLICY IF EXISTS "Users can manage their own explanations" ON explanation_history;
CREATE POLICY "Users can manage their own explanations" ON explanation_history 
    FOR ALL TO authenticated 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);
