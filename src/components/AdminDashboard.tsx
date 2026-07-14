'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, Activity, Trophy, FileText, Sparkles, Search, MessageSquare, 
  Calendar, ArrowLeft, BookOpen, Heart, Shield, RefreshCw, AlertCircle, 
  CheckCircle2, XCircle, Clock, Lightbulb, ChevronRight, UserCheck, Play
} from 'lucide-react';
import { supabase } from '../utils/supabase';
import { W } from '../data/timetable';
import styles from './AdminDashboard.module.css';

interface AdminData {
  users: Array<{ id: string; email: string; created_at: string; last_sign_in_at: string }>;
  stats: Array<{ 
    id: string; 
    streak: number; 
    total_sessions: number; 
    last_visit: string; 
    summaries_count: number; 
    deck_finished: boolean; 
    quiz_ace: boolean; 
    quiz_pb: number; 
    timetable_progress: Record<string, boolean> 
  }>;
  summaries: Array<{ id: string; user_id: string; title: string; summary_text: string; original_notes: string; style: string; date: string; created_at: string }>;
  decks: Array<{ id: string; user_id: string; title: string; cards: any[]; grades: Record<string, string>; original_notes: string; created_at: string }>;
  quizzes: Array<{ id: string; user_id: string; score: number; total_questions: number; questions: any[]; original_notes: string; date: string; created_at: string }>;
  chats: Array<{ id: string; user_id: string; title: string; messages: any[]; updated_at: string }>;
  research: Array<{ id: string; user_id: string; title: string; messages: any[]; updated_at: string }>;
  explanations: Array<{ id: string; user_id: string; title: string; mode: string; depth: string; input: string; explanation_text: string; created_at: string }>;
}

export default function AdminDashboard({ onAddToast }: { onAddToast: (msg: string) => void }) {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'quizzes' | 'chats' | 'summaries' | 'explanations' | 'decks'>('overview');
  
  // Drill-down detailed items
  const [activeQuizAttempt, setActiveQuizAttempt] = useState<any>(null);
  const [activeChatSession, setActiveChatSession] = useState<any>(null);
  const [activeSummary, setActiveSummary] = useState<any>(null);
  const [activeExplanation, setActiveExplanation] = useState<any>(null);
  const [activeDeck, setActiveDeck] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        throw new Error("You must be logged in to access the Admin Panel.");
      }

      const response = await fetch('/api/admin/data', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${response.status} Error`);
      }

      const payload = await response.json();
      setData(payload);
      
      // Auto-select first user if available and none selected yet
      if (payload.users && payload.users.length > 0 && !selectedUserId) {
        setSelectedUserId(payload.users[0].id);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load admin dashboard data.");
      onAddToast("Error loading admin stats! ❌");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    fetchData();
    onAddToast("Refreshed admin dashboard! 🔄");
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p className={styles.subtitle}>Loading admin metrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <AlertCircle size={40} className="text-red-500" />
        <p className={styles.errorText}>{error}</p>
        <button onClick={handleRefresh} className={styles.refreshBtn}>
          <RefreshCw size={16} />
          <span>Try Again</span>
        </button>
      </div>
    );
  }

  if (!data) return null;

  // Global KPIs calculation
  const totalStudents = data.users.length;
  const totalSessions = data.stats.reduce((acc, curr) => acc + (curr.total_sessions || 0), 0);
  const maxStreak = data.stats.reduce((max, curr) => Math.max(max, curr.streak || 0), 0);
  const totalQuizzes = data.quizzes.length;
  const totalSummaries = data.summaries.length;

  // Filtered Users List
  const filteredUsers = data.users.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Selected User data resolution
  const selectedUser = data.users.find(u => u.id === selectedUserId);
  const selectedUserStats = data.stats.find(s => s.id === selectedUserId) || {
    streak: 0,
    total_sessions: 0,
    last_visit: '',
    summaries_count: 0,
    deck_finished: false,
    quiz_ace: false,
    quiz_pb: 0,
    timetable_progress: {} as Record<string, boolean>
  };

  // Selected User records
  const userQuizzes = data.quizzes.filter(q => q.user_id === selectedUserId);
  const userChats = data.chats.filter(c => c.user_id === selectedUserId);
  const userResearch = data.research.filter(r => r.user_id === selectedUserId);
  const userSummaries = data.summaries.filter(s => s.user_id === selectedUserId);
  const userExplanations = data.explanations.filter(e => e.user_id === selectedUserId);
  const userDecks = data.decks.filter(d => d.user_id === selectedUserId);

  // Helper: check online/active status (active in the last 10 minutes)
  const isUserActive = (lastVisitStr: string) => {
    if (!lastVisitStr) return false;
    const lastVisit = new Date(lastVisitStr);
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
    return lastVisit > tenMinAgo;
  };

  // Resolve subject name from key
  const getSubjectName = (key: string) => {
    switch (key) {
      case 'haem': return 'Haematology';
      case 'chem': return 'Chem Path';
      case 'morb_tue': 
      case 'morb_fri': return 'Morbid Anatomy';
      case 'morb': return 'Morbid Anatomy';
      case 'mcb': return 'Microbiology';
      case 'pharm': return 'Pharmacology';
      default: return key;
    }
  };

  // Helper: Timetable stats for selected user
  const getSelectedUserTimetableProgress = () => {
    let total = 0;
    let completed = 0;
    const progress: Record<string, boolean> = selectedUserStats.timetable_progress || {};

    W.forEach((w) => {
      // Subjects list
      const subjects = ['haem', 'chem', 'morb_tue', 'mcb', 'pharm', 'morb_fri'];
      subjects.forEach((sub) => {
        const topics = (w as any)[sub] || [];
        topics.forEach((_: any, idx: number) => {
          const id = `${w.n}-${sub}-${idx}`;
          total++;
          if (progress[id]) {
            completed++;
          }
        });
      });
    });

    return { total, completed, percent: total > 0 ? Math.round((completed / total) * 100) : 0 };
  };

  const timetableStats = getSelectedUserTimetableProgress();

  return (
    <div className={styles.container}>
      {/* Dashboard Top bar */}
      <div className={styles.header}>
        <div className={styles.titleWrapper}>
          <div className={styles.titleRow}>
            <h2 className={styles.title}>Mega's Admin Command Center</h2>
            <span className={styles.adminBadge}>
              <Shield size={12} />
              <span>Admin</span>
            </span>
          </div>
          <p className={styles.subtitle}>
            Monitor learning performance, study session streaks, and activity metrics of all future doctors.
          </p>
        </div>
        <button onClick={handleRefresh} className={styles.refreshBtn}>
          <RefreshCw size={14} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* KPIs Summary Cards */}
      <div className={styles.kpisGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Total Students</span>
            <span className={styles.kpiValue}>{totalStudents}</span>
          </div>
          <div className={styles.kpiIconWrapper}>
            <Users size={20} />
          </div>
          <div className={styles.kpiCardGlow} style={{ background: '#0d9488' }} />
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Total Sessions</span>
            <span className={styles.kpiValue}>{totalSessions}</span>
          </div>
          <div className={styles.kpiIconWrapper}>
            <Activity size={20} />
          </div>
          <div className={styles.kpiCardGlow} style={{ background: '#f472b6' }} />
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Max Active Streak</span>
            <span className={styles.kpiValue}>{maxStreak} 🔥</span>
          </div>
          <div className={styles.kpiIconWrapper}>
            <Trophy size={20} style={{ color: '#ff9800' }} />
          </div>
          <div className={styles.kpiCardGlow} style={{ background: '#ff9800' }} />
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Quizzes Completed</span>
            <span className={styles.kpiValue}>{totalQuizzes}</span>
          </div>
          <div className={styles.kpiIconWrapper}>
            <UserCheck size={20} />
          </div>
          <div className={styles.kpiCardGlow} style={{ background: '#3b82f6' }} />
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Summaries Generated</span>
            <span className={styles.kpiValue}>{totalSummaries}</span>
          </div>
          <div className={styles.kpiIconWrapper}>
            <FileText size={20} />
          </div>
          <div className={styles.kpiCardGlow} style={{ background: '#8b5cf6' }} />
        </div>
      </div>

      {/* Main split grid */}
      <div className={styles.dashboardContent}>
        {/* Left column: Searchable Student List */}
        <div className={styles.usersPanel}>
          <div className={styles.usersHeader}>
            <h3 className={styles.panelTitle}>Student Accounts ({filteredUsers.length})</h3>
            <div className={styles.searchWrapper}>
              <Search className={styles.searchIcon} size={15} />
              <input 
                type="text" 
                placeholder="Search students by email..." 
                className={styles.searchInput}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.usersList}>
            {filteredUsers.length === 0 ? (
              <div className={styles.noRecords}>No students match search.</div>
            ) : (
              filteredUsers.map(user => {
                const uStats = data.stats.find(s => s.id === user.id) || { streak: 0, total_sessions: 0, last_visit: '' };
                const active = isUserActive(uStats.last_visit);
                const isSelected = selectedUserId === user.id;

                return (
                  <div 
                    key={user.id} 
                    className={`${styles.userCard} ${isSelected ? styles.userCardActive : ''}`}
                    onClick={() => {
                      setSelectedUserId(user.id);
                      // Clear drill-down views on user change
                      setActiveQuizAttempt(null);
                      setActiveChatSession(null);
                      setActiveSummary(null);
                      setActiveExplanation(null);
                      setActiveDeck(null);
                    }}
                  >
                    <div className={styles.userMetaTop}>
                      <span className={styles.userEmail}>{user.email}</span>
                      {uStats.streak > 0 && (
                        <span className={styles.streakBadge}>
                          <span>🔥</span>
                          <span>{uStats.streak}</span>
                        </span>
                      )}
                    </div>

                    <div className={styles.userMetaBottom}>
                      <div className={styles.lastVisitWrapper}>
                        <div className={`${styles.activityIndicator} ${active ? styles.activityOnline : ''}`} />
                        <span>
                          {uStats.last_visit 
                            ? `Active: ${new Date(uStats.last_visit).toLocaleDateString()} ${new Date(uStats.last_visit).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`
                            : 'Never active'
                          }
                        </span>
                      </div>
                      <span className={styles.sessionsCount}>{uStats.total_sessions} sessions</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right column: Selected User Detailed Workspace */}
        <div className={styles.detailsPanel}>
          {!selectedUser ? (
            <div className={styles.noUserSelected}>
              <Users size={48} className="opacity-25" />
              <p>Select a student from the list to oversee their workspace & stats.</p>
            </div>
          ) : (
            <>
              {/* Selected User Header */}
              <div className={styles.inspectorHeader}>
                <div className={styles.inspectorTitleWrapper}>
                  <h3 className={styles.inspectorEmail}>{selectedUser.email}</h3>
                  <span className={styles.inspectorId}>Student ID: {selectedUser.id}</span>
                </div>
                <div className={styles.lastVisitWrapper} style={{ fontSize: '0.85rem' }}>
                  <div className={`${styles.activityIndicator} ${isUserActive(selectedUserStats.last_visit) ? styles.activityOnline : ''}`} />
                  <span className="text-secondary">
                    Joined guide on: {new Date(selectedUser.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Sub tabs inside inspector */}
              <div className={styles.inspectorTabs}>
                <button 
                  className={`${styles.tabBtn} ${activeTab === 'overview' ? styles.tabBtnActive : ''}`}
                  onClick={() => setActiveTab('overview')}
                >
                  Overview & Timetable
                </button>
                <button 
                  className={`${styles.tabBtn} ${activeTab === 'quizzes' ? styles.tabBtnActive : ''}`}
                  onClick={() => setActiveTab('quizzes')}
                >
                  Quiz History ({userQuizzes.length})
                </button>
                <button 
                  className={`${styles.tabBtn} ${activeTab === 'chats' ? styles.tabBtnActive : ''}`}
                  onClick={() => setActiveTab('chats')}
                >
                  Chats & Research ({userChats.length + userResearch.length})
                </button>
                <button 
                  className={`${styles.tabBtn} ${activeTab === 'summaries' ? styles.tabBtnActive : ''}`}
                  onClick={() => setActiveTab('summaries')}
                >
                  Summaries ({userSummaries.length})
                </button>
                <button 
                  className={`${styles.tabBtn} ${activeTab === 'explanations' ? styles.tabBtnActive : ''}`}
                  onClick={() => setActiveTab('explanations')}
                >
                  Explanations ({userExplanations.length})
                </button>
                <button 
                  className={`${styles.tabBtn} ${activeTab === 'decks' ? styles.tabBtnActive : ''}`}
                  onClick={() => setActiveTab('decks')}
                >
                  Decks ({userDecks.length})
                </button>
              </div>

              {/* Inspector Content body */}
              <div className={styles.tabContent}>
                
                {/* 1. OVERVIEW & TIMETABLE TAB */}
                {activeTab === 'overview' && (
                  <div className="flex flex-col gap-6">
                    {/* Metrics mini grid */}
                    <div className={styles.userStatsGrid}>
                      <div className={styles.statMiniCard}>
                        <span className={styles.statMiniLabel}>Current Streak</span>
                        <span className={`${styles.statMiniValue} ${styles.statHighlight}`}>{selectedUserStats.streak} days 🔥</span>
                      </div>
                      <div className={styles.statMiniCard}>
                        <span className={styles.statMiniLabel}>Total Study Sessions</span>
                        <span className={styles.statMiniValue}>{selectedUserStats.total_sessions} sessions</span>
                      </div>
                      <div className={styles.statMiniCard}>
                        <span className={styles.statMiniLabel}>Best Quiz Score</span>
                        <span className={styles.statMiniValue}>{selectedUserStats.quiz_pb || 0}% 🏆</span>
                      </div>
                      <div className={styles.statMiniCard}>
                        <span className={styles.statMiniLabel}>Timetable Completion</span>
                        <span className={styles.statMiniValue}>{timetableStats.percent}% ({timetableStats.completed}/{timetableStats.total})</span>
                      </div>
                    </div>

                    {/* Timetable Progress checklist */}
                    <div className={styles.timetableSection}>
                      <h4 className={styles.timetableHeader}>
                        <Calendar size={16} className="text-teal" />
                        <span>3rd MB Timetable Progress Details</span>
                      </h4>
                      
                      <div className={styles.timetableGrid}>
                        {W.map((week) => {
                          const subjects = ['haem', 'chem', 'morb_tue', 'mcb', 'pharm', 'morb_fri'];
                          let weekTotal = 0;
                          let weekCompleted = 0;

                          subjects.forEach(sub => {
                            const topics = (week as any)[sub] || [];
                            topics.forEach((_: any, idx: number) => {
                              weekTotal++;
                              if (selectedUserStats.timetable_progress?.[`${week.n}-${sub}-${idx}`]) {
                                weekCompleted++;
                              }
                            });
                          });

                          if (weekTotal === 0) return null;
                          const wPercent = Math.round((weekCompleted / weekTotal) * 100);

                          return (
                            <div key={week.n} className={`${styles.timetableItem} ${weekCompleted === weekTotal ? styles.timetableItemCompleted : ''}`}>
                              <div className="flex flex-col gap-1 w-full">
                                <span className={styles.timetableLabel}>Week {week.n}</span>
                                <div className="flex justify-between items-center text-xs font-semibold">
                                  <span className={weekCompleted === weekTotal ? styles.timetableLabelCompleted : 'text-secondary'}>
                                    {weekCompleted} / {weekTotal} Done
                                  </span>
                                  <span>{wPercent}%</span>
                                </div>
                                {/* Mini progress bar */}
                                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden mt-1">
                                  <div 
                                    className="bg-teal h-1.5 rounded-full" 
                                    style={{ 
                                      width: `${wPercent}%`,
                                      backgroundColor: weekCompleted === weekTotal ? '#10b981' : 'var(--color-teal)'
                                    }} 
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. QUIZ HISTORY TAB */}
                {activeTab === 'quizzes' && (
                  <>
                    {!activeQuizAttempt ? (
                      <div className={styles.recordsList}>
                        {userQuizzes.length === 0 ? (
                          <div className={styles.noRecords}>No quiz attempts registered.</div>
                        ) : (
                          userQuizzes.map(quiz => {
                            const scorePercent = Math.round((quiz.score / quiz.total_questions) * 100);
                            return (
                              <div 
                                key={quiz.id} 
                                className={styles.recordCard}
                                onClick={() => setActiveQuizAttempt(quiz)}
                              >
                                <div className={styles.recordHeader}>
                                  <span className={styles.recordTitle}>
                                    Quiz Score: {quiz.score}/{quiz.total_questions} ({scorePercent}%)
                                  </span>
                                  <span className={styles.recordMeta}>
                                    <Clock size={12} />
                                    <span>{new Date(quiz.created_at || quiz.date).toLocaleDateString()}</span>
                                  </span>
                                </div>
                                <div className={styles.recordSnippet}>
                                  Note grounds: {quiz.original_notes ? quiz.original_notes.substring(0, 100) + '...' : 'No notes attachment'}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    ) : (
                      /* Quiz Attempt details view */
                      <div className={styles.detailView}>
                        <button className={styles.detailBackBtn} onClick={() => setActiveQuizAttempt(null)}>
                          <ArrowLeft size={13} />
                          <span>Back to Quiz List</span>
                        </button>
                        
                        <div className={styles.detailHeader}>
                          <h4 className={styles.detailTitle}>
                            Quiz Attempt Details ({activeQuizAttempt.score} / {activeQuizAttempt.total_questions} Correct)
                          </h4>
                          <span className={styles.detailMeta}>
                            <span>Date: {new Date(activeQuizAttempt.created_at || activeQuizAttempt.date).toLocaleString()}</span>
                          </span>
                        </div>

                        <div className={styles.scrollArea}>
                          <div className={styles.quizQuestionsList}>
                            {(activeQuizAttempt.questions || []).map((q: any, qIdx: number) => {
                              const isCorrect = q.selectedAnswer === q.correctAnswer;
                              return (
                                <div key={qIdx} className={styles.quizQuestionItem}>
                                  <span className={styles.quizQuestionTitle}>{qIdx + 1}. {q.question}</span>
                                  
                                  <div className={styles.quizOptionsGrid}>
                                    {Object.entries(q.options || {}).map(([key, val]) => {
                                      const isOptionCorrect = key === q.correctAnswer;
                                      const isOptionSelected = key === q.selectedAnswer;
                                      
                                      let optionClass = styles.quizOptionCard;
                                      if (isOptionCorrect) {
                                        optionClass = `${styles.quizOptionCard} ${styles.quizOptionCorrect}`;
                                      } else if (isOptionSelected && !isCorrect) {
                                        optionClass = `${styles.quizOptionCard} ${styles.quizOptionSelectedWrong}`;
                                      }

                                      return (
                                        <div key={key} className={optionClass}>
                                          <span>{key}. {val as string}</span>
                                          <div className="flex gap-2">
                                            {isOptionCorrect && <CheckCircle2 size={14} className="text-emerald-500" />}
                                            {isOptionSelected && !isCorrect && <XCircle size={14} className="text-red-500" />}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>

                                  <div className={styles.quizResultFooter}>
                                    <span className={isCorrect ? styles.quizVerdictCorrect : styles.quizVerdictWrong}>
                                      Verdict: {isCorrect ? "Correct ✓" : `Incorrect ✗ (Selected: ${q.selectedAnswer || 'None'}, Correct: ${q.correctAnswer})`}
                                    </span>
                                  </div>
                                  {q.explanation && (
                                    <div className={styles.explanationField}>
                                      <strong>Explanation:</strong> {q.explanation}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* 3. CHATS & RESEARCH TAB */}
                {activeTab === 'chats' && (
                  <>
                    {!activeChatSession ? (
                      <div className={styles.recordsList}>
                        {userChats.length === 0 && userResearch.length === 0 ? (
                          <div className={styles.noRecords}>No chat history found.</div>
                        ) : (
                          <>
                            {/* AI Chat Sessions */}
                            {userChats.map(session => (
                              <div 
                                key={session.id} 
                                className={styles.recordCard}
                                onClick={() => setActiveChatSession({ ...session, type: 'AI Chat' })}
                              >
                                <div className={styles.recordHeader}>
                                  <span className={styles.recordTitle}>{session.title || 'Untitled AI Chat'}</span>
                                  <div className="flex items-center gap-2">
                                    <span className={styles.recordBadge}>AI Chat</span>
                                    <span className={styles.recordMeta}>
                                      <Clock size={12} />
                                      <span>{new Date(session.updated_at).toLocaleDateString()}</span>
                                    </span>
                                  </div>
                                </div>
                                <div className={styles.recordSnippet}>
                                  {session.messages?.length || 0} messages in conversation
                                </div>
                              </div>
                            ))}

                            {/* Research Sessions */}
                            {userResearch.map(session => (
                              <div 
                                key={session.id} 
                                className={styles.recordCard}
                                onClick={() => setActiveChatSession({ ...session, type: 'Research' })}
                              >
                                <div className={styles.recordHeader}>
                                  <span className={styles.recordTitle}>{session.title || 'Untitled Research Thread'}</span>
                                  <div className="flex items-center gap-2">
                                    <span className={`${styles.recordBadge} ${styles.recordBadgeSecondary}`}>Research</span>
                                    <span className={styles.recordMeta}>
                                      <Clock size={12} />
                                      <span>{new Date(session.updated_at).toLocaleDateString()}</span>
                                    </span>
                                  </div>
                                </div>
                                <div className={styles.recordSnippet}>
                                  {session.messages?.length || 0} messages in conversation
                                </div>
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    ) : (
                      /* Conversation Viewer details */
                      <div className={styles.detailView}>
                        <button className={styles.detailBackBtn} onClick={() => setActiveChatSession(null)}>
                          <ArrowLeft size={13} />
                          <span>Back to Chats</span>
                        </button>

                        <div className={styles.detailHeader}>
                          <h4 className={styles.detailTitle}>
                            [{activeChatSession.type}] {activeChatSession.title || 'Untitled Session'}
                          </h4>
                          <span className={styles.detailMeta}>
                            <span>Last update: {new Date(activeChatSession.updated_at).toLocaleString()}</span>
                            <span>{activeChatSession.messages?.length || 0} messages</span>
                          </span>
                        </div>

                        <div className={styles.scrollArea}>
                          <div className={styles.chatMessagesList}>
                            {(activeChatSession.messages || []).map((msg: any, mIdx: number) => {
                              const isUser = msg.role === 'user';
                              return (
                                <div key={mIdx} className={`${styles.chatMessage} ${isUser ? styles.messageUser : styles.messageModel}`}>
                                  <div className={`${styles.messageRoleLabel} ${isUser ? styles.messageRoleUser : styles.messageRoleModel}`}>
                                    {isUser ? 'User' : 'Gemini AI'}
                                  </div>
                                  <div className={styles.messageText} style={{ whiteSpace: 'pre-wrap' }}>
                                    {msg.content || msg.text}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* 4. SUMMARIES TAB */}
                {activeTab === 'summaries' && (
                  <>
                    {!activeSummary ? (
                      <div className={styles.recordsList}>
                        {userSummaries.length === 0 ? (
                          <div className={styles.noRecords}>No summaries generated.</div>
                        ) : (
                          userSummaries.map(sum => (
                            <div 
                              key={sum.id} 
                              className={styles.recordCard}
                              onClick={() => setActiveSummary(sum)}
                            >
                              <div className={styles.recordHeader}>
                                <span className={styles.recordTitle}>{sum.title || 'Untitled Notes Summary'}</span>
                                <span className={styles.recordMeta}>
                                  <Clock size={12} />
                                  <span>{new Date(sum.created_at || sum.date).toLocaleDateString()}</span>
                                </span>
                              </div>
                              <div className={styles.recordSnippet}>
                                Style: {sum.style} | Text: {sum.summary_text ? sum.summary_text.substring(0, 100) + '...' : ''}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    ) : (
                      /* Summary inspector view */
                      <div className={styles.detailView}>
                        <button className={styles.detailBackBtn} onClick={() => setActiveSummary(null)}>
                          <ArrowLeft size={13} />
                          <span>Back to Summaries</span>
                        </button>

                        <div className={styles.detailHeader}>
                          <h4 className={styles.detailTitle}>{activeSummary.title || 'Untitled Notes Summary'}</h4>
                          <span className={styles.detailMeta}>
                            <span>Generated: {new Date(activeSummary.created_at || activeSummary.date).toLocaleString()}</span>
                            <span>Style: {activeSummary.style}</span>
                          </span>
                        </div>

                        <div className={styles.detailGrid}>
                          <div>
                            <span className={styles.subSectionTitle}>Original Student Notes</span>
                            <div className={styles.detailContentBox}>
                              <div style={{ whiteSpace: 'pre-wrap' }}>{activeSummary.original_notes || 'No notes loaded.'}</div>
                            </div>
                          </div>
                          <div>
                            <span className={styles.subSectionTitle}>Generated Summary Output</span>
                            <div className={styles.detailContentBox} style={{ borderLeft: '3px solid var(--color-teal)' }}>
                              <div style={{ whiteSpace: 'pre-wrap' }}>{activeSummary.summary_text || 'No summary text.'}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* 5. EXPLANATIONS TAB */}
                {activeTab === 'explanations' && (
                  <>
                    {!activeExplanation ? (
                      <div className={styles.recordsList}>
                        {userExplanations.length === 0 ? (
                          <div className={styles.noRecords}>No explanations requested.</div>
                        ) : (
                          userExplanations.map(exp => (
                            <div 
                              key={exp.id} 
                              className={styles.recordCard}
                              onClick={() => setActiveExplanation(exp)}
                            >
                              <div className={styles.recordHeader}>
                                <span className={styles.recordTitle}>{exp.title || 'Topic breakdown'}</span>
                                <span className={styles.recordMeta}>
                                  <Clock size={12} />
                                  <span>{new Date(exp.created_at).toLocaleDateString()}</span>
                                </span>
                              </div>
                              <div className={styles.recordSnippet}>
                                Mode: {exp.mode} | Depth: {exp.depth} | Input: {exp.input}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    ) : (
                      /* Explanation inspector view */
                      <div className={styles.detailView}>
                        <button className={styles.detailBackBtn} onClick={() => setActiveExplanation(null)}>
                          <ArrowLeft size={13} />
                          <span>Back to Explanations</span>
                        </button>

                        <div className={styles.detailHeader}>
                          <h4 className={styles.detailTitle}>{activeExplanation.title || 'Topic Breakdown'}</h4>
                          <span className={styles.detailMeta}>
                            <span>Requested: {new Date(activeExplanation.created_at).toLocaleString()}</span>
                            <span>Mode: {activeExplanation.mode} | Depth: {activeExplanation.depth}</span>
                          </span>
                        </div>

                        <div className="flex flex-col gap-4">
                          <div>
                            <span className={styles.subSectionTitle}>Topic/Text Student Asked To Explain</span>
                            <div className={styles.detailContentBox} style={{ maxHeight: '120px' }}>
                              <p><strong>{activeExplanation.input}</strong></p>
                            </div>
                          </div>
                          <div>
                            <span className={styles.subSectionTitle}>AI Generated Explanation breakdown</span>
                            <div className={styles.detailContentBox} style={{ borderLeft: '3px solid var(--color-blush)' }}>
                              <div style={{ whiteSpace: 'pre-wrap' }}>{activeExplanation.explanation_text}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* 6. FLASHCARD DECKS TAB */}
                {activeTab === 'decks' && (
                  <>
                    {!activeDeck ? (
                      <div className={styles.recordsList}>
                        {userDecks.length === 0 ? (
                          <div className={styles.noRecords}>No flashcard decks saved.</div>
                        ) : (
                          userDecks.map(deck => {
                            const gradesCount = Object.keys(deck.grades || {}).length;
                            return (
                              <div 
                                key={deck.id} 
                                className={styles.recordCard}
                                onClick={() => setActiveDeck(deck)}
                              >
                                <div className={styles.recordHeader}>
                                  <span className={styles.recordTitle}>{deck.title || 'Flashcard Deck'}</span>
                                  <span className={styles.recordMeta}>
                                    <Clock size={12} />
                                    <span>{new Date(deck.created_at).toLocaleDateString()}</span>
                                  </span>
                                </div>
                                <div className={styles.recordSnippet}>
                                  Cards: {deck.cards?.length || 0} | Graded reviews: {gradesCount}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    ) : (
                      /* Deck inspector view */
                      <div className={styles.detailView}>
                        <button className={styles.detailBackBtn} onClick={() => setActiveDeck(null)}>
                          <ArrowLeft size={13} />
                          <span>Back to Decks</span>
                        </button>

                        <div className={styles.detailHeader}>
                          <h4 className={styles.detailTitle}>{activeDeck.title || 'Flashcard Deck'}</h4>
                          <span className={styles.detailMeta}>
                            <span>Created: {new Date(activeDeck.created_at).toLocaleString()}</span>
                            <span>Cards Count: {activeDeck.cards?.length || 0}</span>
                          </span>
                        </div>

                        <div className={styles.scrollArea}>
                          <div className={styles.flashcardsListGrid}>
                            {(activeDeck.cards || []).map((card: any, cIdx: number) => {
                              const grade = activeDeck.grades?.[cIdx];
                              let borderG = 'border-color: rgba(255, 255, 255, 0.04)';
                              if (grade === 'easy') borderG = 'rgba(16, 185, 129, 0.2)';
                              else if (grade === 'hard') borderG = 'rgba(239, 68, 68, 0.2)';
                              else if (grade === 'review') borderG = 'rgba(245, 158, 11, 0.2)';

                              return (
                                <div 
                                  key={cIdx} 
                                  className={styles.flashcardDisplayItem}
                                  style={{ borderColor: borderG }}
                                >
                                  <div className="flex justify-between items-center text-xs">
                                    <span className="font-semibold text-secondary">Card {cIdx + 1}</span>
                                    {grade && (
                                      <span className="capitalize px-1.5 py-0.5 rounded text-[10px] font-bold" style={{
                                        background: grade === 'easy' ? 'rgba(16,185,129,0.1)' : grade === 'hard' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                                        color: grade === 'easy' ? '#10b981' : grade === 'hard' ? '#ef4444' : '#f59e0b'
                                      }}>
                                        {grade}
                                      </span>
                                    )}
                                  </div>
                                  <div className={styles.divider} />
                                  <span className={styles.cardSideHeader}>Front Side:</span>
                                  <span className={styles.cardSideContent}>{card.front}</span>
                                  <div className={styles.divider} />
                                  <span className={styles.cardSideHeader}>Back Side:</span>
                                  <span className={styles.cardSideContent}>{card.back}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
