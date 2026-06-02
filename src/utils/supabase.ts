import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://oeltphtusjrvgcdtvnet.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_V1oKc4RKQ_0wsGkuESpiuA_U77pH80j';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ==========================================
// 1. User Stats & Streak Persistence
// ==========================================
export interface UserStats {
  streak: number;
  total_sessions: number;
  last_visit: string;
  summaries_count: number;
  deck_finished: boolean;
  quiz_ace: boolean;
  quiz_pb: number;
}

export async function getUserStats(): Promise<UserStats | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const userId = user.id;

    const { data, error } = await supabase
      .from('user_stats')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Initialize default user stats for first-time login
        const defaultStats: UserStats = {
          streak: 0,
          total_sessions: 0,
          last_visit: '',
          summaries_count: 0,
          deck_finished: false,
          quiz_ace: false,
          quiz_pb: 0,
        };
        await syncUserStats(defaultStats);
        return defaultStats;
      }
      console.warn('Error fetching user stats from Supabase:', error.message);
      return null;
    }
    return {
      streak: data.streak || 0,
      total_sessions: data.total_sessions || 0,
      last_visit: data.last_visit || '',
      summaries_count: data.summaries_count || 0,
      deck_finished: !!data.deck_finished,
      quiz_ace: !!data.quiz_ace,
      quiz_pb: data.quiz_pb || 0,
    };
  } catch (err) {
    console.error('Failed to get user stats:', err);
    return null;
  }
}

export async function syncUserStats(stats: UserStats): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const userId = user.id;

    const { error } = await supabase
      .from('user_stats')
      .upsert({
        id: userId,
        streak: stats.streak,
        total_sessions: stats.total_sessions,
        last_visit: stats.last_visit,
        summaries_count: stats.summaries_count,
        deck_finished: stats.deck_finished,
        quiz_ace: stats.quiz_ace,
        quiz_pb: stats.quiz_pb,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.warn('Error syncing user stats to Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Failed to sync user stats:', err);
    return false;
  }
}

export async function syncCurrentStats(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  
  const stats: UserStats = {
    streak: parseInt(localStorage.getItem('megas_guide_streak') || '0', 10),
    total_sessions: parseInt(localStorage.getItem('megas_guide_sessions_count') || '0', 10),
    last_visit: localStorage.getItem('megas_guide_last_visit') || '',
    summaries_count: parseInt(localStorage.getItem('megas_guide_summaries_count') || '0', 10),
    deck_finished: localStorage.getItem('megas_guide_deck_finished') === 'true',
    quiz_ace: localStorage.getItem('megas_guide_quiz_ace') === 'true',
    quiz_pb: parseInt(localStorage.getItem('megas_guide_quiz_pb') || '0', 10),
  };
  return syncUserStats(stats);
}

// ==========================================
// 2. Note Summaries Persistence
// ==========================================
export interface SavedSummary {
  id: string;
  title: string;
  summaryText: string;
  originalNotes: string;
  style: string;
  date: string;
}

export async function getNoteSummaries(): Promise<SavedSummary[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const userId = user.id;

    const { data, error } = await supabase
      .from('note_summaries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error fetching note summaries from Supabase:', error.message);
      return [];
    }
    return data.map((item: any) => ({
      id: item.id,
      title: item.title,
      summaryText: item.summary_text,
      originalNotes: item.original_notes,
      style: item.style,
      date: item.date
    }));
  } catch (err) {
    console.error('Failed to get note summaries:', err);
    return [];
  }
}

export async function saveNoteSummary(summary: SavedSummary): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const userId = user.id;

    const { error } = await supabase
      .from('note_summaries')
      .upsert({
        id: summary.id,
        user_id: userId,
        title: summary.title,
        summary_text: summary.summaryText,
        original_notes: summary.originalNotes,
        style: summary.style,
        date: summary.date
      });

    if (error) {
      console.warn('Error saving note summary to Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Failed to save note summary:', err);
    return false;
  }
}

export async function deleteNoteSummary(id: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const userId = user.id;

    const { error } = await supabase
      .from('note_summaries')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.warn('Error deleting note summary from Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Failed to delete note summary:', err);
    return false;
  }
}

// ==========================================
// 3. Flashcard Decks Persistence (Multi-Deck)
// ==========================================
export interface SavedDeck {
  id?: string;
  title?: string;
  cards: Array<{ front: string; back: string }>;
  grades: Record<number, 'easy' | 'hard' | 'review'>;
  original_notes?: string;
  created_at?: string;
}

export async function getSavedDecks(): Promise<SavedDeck[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const userId = user.id;

    const { data, error } = await supabase
      .from('flashcard_decks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error fetching saved decks from Supabase:', error.message);
      return [];
    }
    return (data || []).map((item: any) => ({
      id: item.id,
      title: item.title,
      cards: item.cards || [],
      grades: item.grades || {},
      original_notes: item.original_notes,
      created_at: item.created_at
    }));
  } catch (err) {
    console.error('Failed to get saved decks:', err);
    return [];
  }
}

export async function saveFlashcardDeck(id: string, title: string, deck: { cards: any[], grades: any }, originalNotes: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const userId = user.id;

    const { error } = await supabase
      .from('flashcard_decks')
      .upsert({
        id: id,
        user_id: userId,
        title: title,
        cards: deck.cards,
        grades: deck.grades,
        original_notes: originalNotes,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.warn('Error saving flashcard deck to Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Failed to save flashcard deck:', err);
    return false;
  }
}

export async function deleteFlashcardDeck(id: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const userId = user.id;

    const { error } = await supabase
      .from('flashcard_decks')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.warn('Error deleting flashcard deck from Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Failed to delete flashcard deck:', err);
    return false;
  }
}

// ==========================================
// 4. Quiz History Persistence
// ==========================================
export interface QuizAttempt {
  id: string;
  score: number;
  totalQuestions: number;
  questions: any[];
  originalNotes: string;
  date: string;
}

export async function getQuizHistory(): Promise<QuizAttempt[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const userId = user.id;

    const { data, error } = await supabase
      .from('quiz_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error fetching quiz history from Supabase:', error.message);
      return [];
    }
    return data.map((item: any) => ({
      id: item.id,
      score: item.score,
      totalQuestions: item.total_questions,
      questions: item.questions,
      originalNotes: item.original_notes,
      date: item.date
    }));
  } catch (err) {
    console.error('Failed to get quiz history:', err);
    return [];
  }
}

export async function saveQuizAttempt(attempt: QuizAttempt): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const userId = user.id;

    const { error } = await supabase
      .from('quiz_history')
      .upsert({
        id: attempt.id,
        user_id: userId,
        score: attempt.score,
        total_questions: attempt.totalQuestions,
        questions: attempt.questions,
        original_notes: attempt.originalNotes,
        date: attempt.date
      });

    if (error) {
      console.warn('Error saving quiz attempt to Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Failed to save quiz attempt:', err);
    return false;
  }
}

// ==========================================
// 5. Chat History (Notes-grounded, Multi-session)
// ==========================================
export interface ChatSession {
  id: string;
  title: string;
  updated_at: string;
}

export async function getChatSessions(): Promise<ChatSession[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const userId = user.id;

    const { data, error } = await supabase
      .from('chat_sessions')
      .select('id, title, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.warn('Error fetching chat sessions from Supabase:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('Failed to get chat sessions:', err);
    return [];
  }
}

export async function getChatMessages(sessionId: string): Promise<any[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const userId = user.id;

    const { data, error } = await supabase
      .from('chat_sessions')
      .select('messages')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code !== 'PGRST116') {
        console.warn('Error fetching chat messages from Supabase:', error.message);
      }
      return [];
    }
    return data?.messages || [];
  } catch (err) {
    console.error('Failed to get chat messages:', err);
    return [];
  }
}

export async function saveChatSession(sessionId: string, title: string, messages: any[]): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const userId = user.id;

    const { error } = await supabase
      .from('chat_sessions')
      .upsert({
        id: sessionId,
        user_id: userId,
        title: title,
        messages: messages,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.warn('Error saving chat session to Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Failed to save chat session:', err);
    return false;
  }
}

export async function deleteChatSession(sessionId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const userId = user.id;

    const { error } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', userId);

    if (error) {
      console.warn('Error deleting chat session from Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Failed to delete chat session:', err);
    return false;
  }
}

// ==========================================
// 6. Research History (General, Multi-session)
// ==========================================
export interface ResearchSession {
  id: string;
  title: string;
  updated_at: string;
}

export async function getResearchSessions(): Promise<ResearchSession[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const userId = user.id;

    const { data, error } = await supabase
      .from('research_sessions')
      .select('id, title, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.warn('Error fetching research sessions from Supabase:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('Failed to get research sessions:', err);
    return [];
  }
}

export async function getResearchMessages(sessionId: string): Promise<any[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const userId = user.id;

    const { data, error } = await supabase
      .from('research_sessions')
      .select('messages')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code !== 'PGRST116') {
        console.warn('Error fetching research messages from Supabase:', error.message);
      }
      return [];
    }
    return data?.messages || [];
  } catch (err) {
    console.error('Failed to get research messages:', err);
    return [];
  }
}

export async function saveResearchSession(sessionId: string, title: string, messages: any[]): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const userId = user.id;

    const { error } = await supabase
      .from('research_sessions')
      .upsert({
        id: sessionId,
        user_id: userId,
        title: title,
        messages: messages,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.warn('Error saving research session to Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Failed to save research session:', err);
    return false;
  }
}

export async function deleteResearchSession(sessionId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const userId = user.id;

    const { error } = await supabase
      .from('research_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', userId);

    if (error) {
      console.warn('Error deleting research session from Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Failed to delete research session:', err);
    return false;
  }
}

// ==========================================
// 7. Explanation History Persistence
// ==========================================
export interface ExplanationItem {
  id: string;
  title: string;
  mode: 'topic' | 'passage';
  depth: 'simple' | 'standard' | 'deep';
  input: string;
  explanationText: string;
  createdAt: string;
}

export async function getExplanationHistory(): Promise<ExplanationItem[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const userId = user.id;

    const { data, error } = await supabase
      .from('explanation_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error fetching explanation history:', error.message);
      return [];
    }
    return (data || []).map((item: any) => ({
      id: item.id,
      title: item.title,
      mode: item.mode,
      depth: item.depth,
      input: item.input,
      explanationText: item.explanation_text,
      createdAt: item.created_at,
    }));
  } catch (err) {
    console.error('Failed to get explanation history:', err);
    return [];
  }
}

export async function saveExplanation(item: ExplanationItem): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const userId = user.id;

    const { error } = await supabase
      .from('explanation_history')
      .upsert({
        id: item.id,
        user_id: userId,
        title: item.title,
        mode: item.mode,
        depth: item.depth,
        input: item.input,
        explanation_text: item.explanationText,
        created_at: item.createdAt,
      });

    if (error) {
      console.warn('Error saving explanation:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Failed to save explanation:', err);
    return false;
  }
}

export async function deleteExplanation(id: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const userId = user.id;

    const { error } = await supabase
      .from('explanation_history')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.warn('Error deleting explanation:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Failed to delete explanation:', err);
    return false;
  }
}

// ==========================================
// 8. Delete Quiz Attempt
// ==========================================
export async function deleteQuizAttempt(id: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const userId = user.id;

    const { error } = await supabase
      .from('quiz_history')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.warn('Error deleting quiz attempt:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Failed to delete quiz attempt:', err);
    return false;
  }
}

