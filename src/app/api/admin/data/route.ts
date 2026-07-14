import type { NextRequest } from 'next/server';
import { Client } from 'pg';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate Request
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return Response.json({ error: 'Missing or invalid Authorization header' }, { status: 401 });
    }

    const token = authHeader.substring(7); // Remove 'Bearer '
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return Response.json({ error: 'Supabase configuration missing' }, { status: 500 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return Response.json({ error: 'Authentication failed: ' + (authError?.message || 'User not found') }, { status: 401 });
    }

    // 2. Authorize Admin
    const adminEmailsEnv = process.env.NEXT_PUBLIC_ADMIN_EMAILS || 'repotrain@gmail.com';
    const adminEmails = adminEmailsEnv.split(',').map((email) => email.trim().toLowerCase());

    if (!user.email || !adminEmails.includes(user.email.toLowerCase())) {
      return Response.json({ error: 'Access denied: User is not an authorized administrator' }, { status: 403 });
    }

    // 3. Connect to Database using pg
    const client = new Client({
      host: process.env.DB_HOST || '2a05:d014:14a4:4002:8af6:7d54:1f6a:9b37',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'cNG8y@JnY6SD@v3',
      database: process.env.DB_NAME || 'postgres',
      ssl: { rejectUnauthorized: false }
    });

    await client.connect();

    try {
      // 4. Query data
      // Auth users
      const usersQuery = await client.query(`
        SELECT id, email, created_at, last_sign_in_at 
        FROM auth.users 
        ORDER BY created_at DESC;
      `);

      // User stats
      const statsQuery = await client.query(`
        SELECT id, streak, total_sessions, last_visit, summaries_count, deck_finished, quiz_ace, quiz_pb, timetable_progress 
        FROM public.user_stats;
      `);

      // Note summaries
      const summariesQuery = await client.query(`
        SELECT id, user_id, title, summary_text, original_notes, style, date, created_at 
        FROM public.note_summaries 
        ORDER BY created_at DESC;
      `);

      // Flashcard decks
      const decksQuery = await client.query(`
        SELECT id, user_id, title, cards, grades, original_notes, created_at 
        FROM public.flashcard_decks 
        ORDER BY created_at DESC;
      `);

      // Quiz history
      const quizQuery = await client.query(`
        SELECT id, user_id, score, total_questions, questions, original_notes, date, created_at 
        FROM public.quiz_history 
        ORDER BY created_at DESC;
      `);

      // Chat sessions
      const chatQuery = await client.query(`
        SELECT id, user_id, title, messages, updated_at 
        FROM public.chat_sessions 
        ORDER BY updated_at DESC;
      `);

      // Research sessions
      const researchQuery = await client.query(`
        SELECT id, user_id, title, messages, updated_at 
        FROM public.research_sessions 
        ORDER BY updated_at DESC;
      `);

      // Explanation history
      const explanationQuery = await client.query(`
        SELECT id, user_id, title, mode, depth, input, explanation_text, created_at 
        FROM public.explanation_history 
        ORDER BY created_at DESC;
      `);

      // 5. Package results
      return Response.json({
        users: usersQuery.rows,
        stats: statsQuery.rows,
        summaries: summariesQuery.rows,
        decks: decksQuery.rows,
        quizzes: quizQuery.rows,
        chats: chatQuery.rows,
        research: researchQuery.rows,
        explanations: explanationQuery.rows
      });
    } finally {
      await client.end();
    }
  } catch (err: any) {
    console.error('Admin API error:', err);
    return Response.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
