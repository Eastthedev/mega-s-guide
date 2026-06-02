-- ====================================================
-- MEGA'S GUIDE - SECURE DATABASE SCHEMA SETUP (WITH RLS)
-- Paste this into your Supabase SQL Editor and run it!
-- ====================================================

-- DROP OLD INCORRECT TABLES IF THEY EXIST TO PREVENT CONFLICTS
DROP TABLE IF EXISTS user_stats CASCADE;
DROP TABLE IF EXISTS note_summaries CASCADE;
DROP TABLE IF EXISTS flashcard_decks CASCADE;
DROP TABLE IF EXISTS quiz_history CASCADE;
DROP TABLE IF EXISTS chat_history CASCADE;
DROP TABLE IF EXISTS research_history CASCADE;
DROP TABLE IF EXISTS chat_sessions CASCADE;
DROP TABLE IF EXISTS research_sessions CASCADE;
DROP TABLE IF EXISTS explanation_history CASCADE;

-- 1. Create table for user stats & achievements
-- Note: id is UUID and references auth.users(id) directly
CREATE TABLE IF NOT EXISTS user_stats (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    streak INT DEFAULT 0,
    total_sessions INT DEFAULT 0,
    last_visit VARCHAR(50),
    summaries_count INT DEFAULT 0,
    deck_finished BOOLEAN DEFAULT false,
    quiz_ace BOOLEAN DEFAULT false,
    quiz_pb INT DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create table for Note Summaries
CREATE TABLE IF NOT EXISTS note_summaries (
    id VARCHAR(50) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    summary_text TEXT NOT NULL,
    original_notes TEXT NOT NULL,
    style VARCHAR(50) NOT NULL,
    date TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create table for Flashcard Decks
CREATE TABLE IF NOT EXISTS flashcard_decks (
    id VARCHAR(50) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    cards JSONB NOT NULL,
    grades JSONB DEFAULT '{}'::jsonb,
    original_notes TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create table for Quiz History
CREATE TABLE IF NOT EXISTS quiz_history (
    id VARCHAR(50) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    score INT NOT NULL,
    total_questions INT NOT NULL,
    questions JSONB NOT NULL,
    original_notes TEXT NOT NULL,
    date TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Create table for Grounded Notes Chat History
CREATE TABLE IF NOT EXISTS chat_history (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    messages JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5b. Create table for Grounded Notes Chat Sessions (multi-session ChatGPT style)
CREATE TABLE IF NOT EXISTS chat_sessions (
    id VARCHAR(50) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    messages JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Create table for Research Chat History
CREATE TABLE IF NOT EXISTS research_history (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    messages JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6b. Create table for Research Chat Sessions (multi-session ChatGPT style)
CREATE TABLE IF NOT EXISTS research_sessions (
    id VARCHAR(50) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    messages JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Create table for Explanation History
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

-- ====================================================
-- ENABLE ROW LEVEL SECURITY (RLS) ON ALL TABLES
-- ====================================================
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE explanation_history ENABLE ROW LEVEL SECURITY;

-- ====================================================
-- DEFINE SECURITY POLICIES (AUTHENTICATED OWNERS ONLY)
-- ====================================================

-- 1. user_stats policies
DROP POLICY IF EXISTS "Users can manage their own stats" ON user_stats;
CREATE POLICY "Users can manage their own stats" ON user_stats 
    FOR ALL TO authenticated 
    USING (auth.uid() = id) 
    WITH CHECK (auth.uid() = id);

-- 2. note_summaries policies
DROP POLICY IF EXISTS "Users can manage their own summaries" ON note_summaries;
CREATE POLICY "Users can manage their own summaries" ON note_summaries 
    FOR ALL TO authenticated 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

-- 3. flashcard_decks policies
DROP POLICY IF EXISTS "Users can manage their own decks" ON flashcard_decks;
CREATE POLICY "Users can manage their own decks" ON flashcard_decks 
    FOR ALL TO authenticated 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

-- 4. quiz_history policies
DROP POLICY IF EXISTS "Users can manage their own quizzes" ON quiz_history;
CREATE POLICY "Users can manage their own quizzes" ON quiz_history 
    FOR ALL TO authenticated 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

-- 5. chat_history policies
DROP POLICY IF EXISTS "Users can manage their own chats" ON chat_history;
CREATE POLICY "Users can manage their own chats" ON chat_history 
    FOR ALL TO authenticated 
    USING (auth.uid() = id) 
    WITH CHECK (auth.uid() = id);

-- 5b. chat_sessions policies
DROP POLICY IF EXISTS "Users can manage their own chat sessions" ON chat_sessions;
CREATE POLICY "Users can manage their own chat sessions" ON chat_sessions 
    FOR ALL TO authenticated 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

-- 6. research_history policies
DROP POLICY IF EXISTS "Users can manage their own research" ON research_history;
CREATE POLICY "Users can manage their own research" ON research_history 
    FOR ALL TO authenticated 
    USING (auth.uid() = id) 
    WITH CHECK (auth.uid() = id);

-- 6b. research_sessions policies
DROP POLICY IF EXISTS "Users can manage their own research sessions" ON research_sessions;
CREATE POLICY "Users can manage their own research sessions" ON research_sessions 
    FOR ALL TO authenticated 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

-- 7. explanation_history policies
DROP POLICY IF EXISTS "Users can manage their own explanations" ON explanation_history;
CREATE POLICY "Users can manage their own explanations" ON explanation_history 
    FOR ALL TO authenticated 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);
