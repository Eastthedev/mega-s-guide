'use client';

import React, { useState, useEffect } from 'react';
import { 
  Heart, MessageSquare, FileText, Sparkles, BookOpen, 
  HelpCircle, Trophy, Flame, Play, Award, X, Search, Home, Lightbulb,
  Plus, Trash2, ChevronDown, ChevronRight, Calendar, Shield
} from 'lucide-react';
import { 
  deleteResearchSession, 
  deleteChatSession, 
  deleteNoteSummary, 
  deleteExplanation, 
  deleteQuizAttempt 
} from '../utils/supabase';
import { getRandomSidebarQuote } from '../utils/quotes';
import styles from './Sidebar.module.css';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
  onAddToast?: (msg: string) => void;
  user?: any;

  // Research history props
  researchSessions?: any[];
  currentResearchSessionId?: string;
  setResearchSessions?: React.Dispatch<React.SetStateAction<any[]>>;
  setCurrentResearchSessionId?: (id: string) => void;

  // AI Chat history props
  chatSessions?: any[];
  currentChatSessionId?: string;
  setChatSessions?: React.Dispatch<React.SetStateAction<any[]>>;
  setCurrentChatSessionId?: (id: string) => void;

  // Note Summaries history props
  savedSummaries?: any[];
  activeSummaryId?: string | null;
  setSavedSummaries?: React.Dispatch<React.SetStateAction<any[]>>;
  setActiveSummaryId?: (id: string | null) => void;

  // Detailed Explanation history props
  explanationHistory?: any[];
  activeExplanationId?: string | null;
  setExplanationHistory?: React.Dispatch<React.SetStateAction<any[]>>;
  setActiveExplanationId?: (id: string | null) => void;

  // Quiz Mode history props
  quizHistory?: any[];
  activeQuizAttemptId?: string | null;
  setQuizHistory?: React.Dispatch<React.SetStateAction<any[]>>;
  setActiveQuizAttemptId?: (id: string | null) => void;
}

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  isOpen, 
  onClose,
  onAddToast,
  user,
  
  researchSessions = [],
  currentResearchSessionId = '',
  setResearchSessions,
  setCurrentResearchSessionId,

  chatSessions = [],
  currentChatSessionId = '',
  setChatSessions,
  setCurrentChatSessionId,

  savedSummaries = [],
  activeSummaryId = null,
  setSavedSummaries,
  setActiveSummaryId,

  explanationHistory = [],
  activeExplanationId = null,
  setExplanationHistory,
  setActiveExplanationId,

  quizHistory = [],
  activeQuizAttemptId = null,
  setQuizHistory,
  setActiveQuizAttemptId
}: SidebarProps) {
  const [quote, setQuote] = useState('');
  const [streak, setStreak] = useState(0);
  const [totalSessions, setTotalSessions] = useState(0);
  
  // Achievement states
  const [hasFirstSession, setHasFirstSession] = useState(false);
  const [hasThreeSummaries, setHasThreeSummaries] = useState(false);
  const [hasDeckCompleted, setHasDeckCompleted] = useState(false);
  const [hasQuizAce, setHasQuizAce] = useState(false);

  // Collapsible category states
  const [isResearchCollapsed, setIsResearchCollapsed] = useState(false);
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);
  const [isSummaryCollapsed, setIsSummaryCollapsed] = useState(false);
  const [isExplainCollapsed, setIsExplainCollapsed] = useState(false);
  const [isQuizCollapsed, setIsQuizCollapsed] = useState(false);

  // New session handlers
  const handleNewResearch = () => {
    const newSessId = 'res_' + Math.random().toString(36).substring(2, 15);
    if (setCurrentResearchSessionId) setCurrentResearchSessionId(newSessId);
    if (onAddToast) onAddToast("New research thread started! 🔬");
  };

  const handleNewChatAI = () => {
    const newSessId = 'chat_' + Math.random().toString(36).substring(2, 15);
    if (setCurrentChatSessionId) setCurrentChatSessionId(newSessId);
    if (onAddToast) onAddToast("New AI Chat session started! 💬");
  };

  const handleNewSummary = () => {
    if (setActiveSummaryId) setActiveSummaryId(null);
    if (onAddToast) onAddToast("Ready for a new notes summary! 📝");
  };

  const handleNewExplanation = () => {
    if (setActiveExplanationId) setActiveExplanationId(null);
    if (onAddToast) onAddToast("Ready for a new topic breakdown! 🧠");
  };

  const handleNewQuiz = () => {
    if (setActiveQuizAttemptId) setActiveQuizAttemptId(null);
    if (onAddToast) onAddToast("Ready to start a new quiz attempt! 🏆");
  };

  // Delete session handlers
  const handleDeleteResearch = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteResearchSession(sessionId);
      if (setResearchSessions) {
        const updated = researchSessions.filter(s => s.id !== sessionId);
        setResearchSessions(updated);
        if (onAddToast) onAddToast("Research thread deleted. 🧹");
        if (currentResearchSessionId === sessionId) {
          if (updated.length > 0) {
            if (setCurrentResearchSessionId) setCurrentResearchSessionId(updated[0].id);
          } else {
            if (setCurrentResearchSessionId) setCurrentResearchSessionId('res_' + Math.random().toString(36).substring(2, 15));
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteChat = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteChatSession(sessionId);
      if (setChatSessions) {
        const updated = chatSessions.filter(s => s.id !== sessionId);
        setChatSessions(updated);
        if (onAddToast) onAddToast("AI Chat thread deleted. 🧹");
        if (currentChatSessionId === sessionId) {
          if (updated.length > 0) {
            if (setCurrentChatSessionId) setCurrentChatSessionId(updated[0].id);
          } else {
            if (setCurrentChatSessionId) setCurrentChatSessionId('chat_' + Math.random().toString(36).substring(2, 15));
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSummary = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteNoteSummary(id);
      if (setSavedSummaries) {
        const updated = savedSummaries.filter(s => s.id !== id);
        setSavedSummaries(updated);
        if (onAddToast) onAddToast("Summary deleted. 🧹");
        if (activeSummaryId === id) {
          if (setActiveSummaryId) setActiveSummaryId(null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteExplanation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteExplanation(id);
      if (setExplanationHistory) {
        const updated = explanationHistory.filter(s => s.id !== id);
        setExplanationHistory(updated);
        if (onAddToast) onAddToast("Explanation history deleted. 🧹");
        if (activeExplanationId === id) {
          if (setActiveExplanationId) setActiveExplanationId(null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteQuiz = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteQuizAttempt(id);
      if (setQuizHistory) {
        const updated = quizHistory.filter(s => s.id !== id);
        setQuizHistory(updated);
        if (onAddToast) onAddToast("Quiz attempt deleted. 🧹");
        if (activeQuizAttemptId === id) {
          if (setActiveQuizAttemptId) setActiveQuizAttemptId(null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    setQuote(getRandomSidebarQuote());
    const savedStreak = parseInt(localStorage.getItem('megas_guide_streak') || '0', 10);
    const savedSessions = parseInt(localStorage.getItem('megas_guide_sessions_count') || '0', 10);
    setStreak(savedStreak);
    setTotalSessions(savedSessions);

    const summariesCount = parseInt(localStorage.getItem('megas_guide_summaries_count') || '0', 10);
    const deckFinished = localStorage.getItem('megas_guide_deck_finished') === 'true';
    const quizAce = localStorage.getItem('megas_guide_quiz_ace') === 'true';

    setHasFirstSession(savedSessions > 0);
    setHasThreeSummaries(summariesCount >= 3);
    setHasDeckCompleted(deckFinished);
    setHasQuizAce(quizAce);
  }, [activeTab]);

  const adminEmailsEnv = process.env.NEXT_PUBLIC_ADMIN_EMAILS || 'repotrain@gmail.com';
  const adminEmails = adminEmailsEnv.split(',').map(e => e.trim().toLowerCase());
  const isAdmin = user?.email && adminEmails.includes(user.email.toLowerCase());

  const navItems = [
    { id: 'overview', label: 'Dashboard', icon: Home },
    { id: 'keepingup', label: 'Keeping up', icon: Heart },
    { id: 'chat', label: 'AI Chat', icon: MessageSquare },
    { id: 'summarize', label: 'Summarize', icon: FileText },
    { id: 'explain', label: 'Explain', icon: Sparkles },
    { id: 'mnemonics', label: 'Mnemonics', icon: Lightbulb },
    { id: 'flashcards', label: 'Flashcards', icon: BookOpen },
    { id: 'quiz', label: 'Quiz Mode', icon: HelpCircle },
    { id: 'research', label: 'Research', icon: Search },
    { id: 'lockin', label: '3rd MB Lockin', icon: Calendar }
  ];

  if (isAdmin) {
    navItems.push({ id: 'admin', label: 'Admin Panel', icon: Shield });
  }

  const renderHistorySubmenu = (itemId: string) => {
    if (itemId === 'research') {
      return (
        <div className={styles.sidebarResearchHistory}>
          <button className={styles.historyTabHeader} onClick={() => setIsResearchCollapsed(!isResearchCollapsed)}>
            <div className={styles.historyTabTitle}>
              <MessageSquare size={13} className="text-teal" />
              <span>History Threads</span>
            </div>
            {isResearchCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
          </button>
          {!isResearchCollapsed && (
            <div className={styles.historySubsection}>
              <button className={styles.newChatBtn} onClick={handleNewResearch}>
                <Plus size={13} />
                <span>New Thread</span>
              </button>
              <div className={styles.sessionList}>
                {researchSessions.length === 0 ? (
                  <div className={styles.noHistory}><p>No history yet</p></div>
                ) : (
                  researchSessions.map((sess) => (
                    <div
                      key={sess.id}
                      className={`${styles.sessionItem} ${sess.id === currentResearchSessionId ? styles.activeSessionItem : ''}`}
                      onClick={() => {
                        if (setCurrentResearchSessionId) setCurrentResearchSessionId(sess.id);
                        if (window.innerWidth <= 768) onClose();
                      }}
                    >
                      <div className={styles.sessionTitleWrapper}>
                        <MessageSquare size={13} className={sess.id === currentResearchSessionId ? 'text-teal' : 'text-muted'} />
                        <span className={styles.sessionTitle}>{sess.title}</span>
                      </div>
                      <button className={styles.deleteSessionBtn} onClick={(e) => handleDeleteResearch(sess.id, e)}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      );
    }
    
    if (itemId === 'chat') {
      return (
        <div className={styles.sidebarResearchHistory}>
          <button className={styles.historyTabHeader} onClick={() => setIsChatCollapsed(!isChatCollapsed)}>
            <div className={styles.historyTabTitle}>
              <MessageSquare size={13} className="text-teal" />
              <span>Chat History</span>
            </div>
            {isChatCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
          </button>
          {!isChatCollapsed && (
            <div className={styles.historySubsection}>
              <button className={styles.newChatBtn} onClick={handleNewChatAI}>
                <Plus size={13} />
                <span>New Chat</span>
              </button>
              <div className={styles.sessionList}>
                {chatSessions.length === 0 ? (
                  <div className={styles.noHistory}><p>No history yet</p></div>
                ) : (
                  chatSessions.map((sess) => (
                    <div
                      key={sess.id}
                      className={`${styles.sessionItem} ${sess.id === currentChatSessionId ? styles.activeSessionItem : ''}`}
                      onClick={() => {
                        if (setCurrentChatSessionId) setCurrentChatSessionId(sess.id);
                        if (window.innerWidth <= 768) onClose();
                      }}
                    >
                      <div className={styles.sessionTitleWrapper}>
                        <MessageSquare size={13} className={sess.id === currentChatSessionId ? 'text-teal' : 'text-muted'} />
                        <span className={styles.sessionTitle}>{sess.title}</span>
                      </div>
                      <button className={styles.deleteSessionBtn} onClick={(e) => handleDeleteChat(sess.id, e)}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (itemId === 'summarize') {
      return (
        <div className={styles.sidebarResearchHistory}>
          <button className={styles.historyTabHeader} onClick={() => setIsSummaryCollapsed(!isSummaryCollapsed)}>
            <div className={styles.historyTabTitle}>
              <FileText size={13} className="text-teal" />
              <span>Saved Summaries</span>
            </div>
            {isSummaryCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
          </button>
          {!isSummaryCollapsed && (
            <div className={styles.historySubsection}>
              <button className={styles.newChatBtn} onClick={handleNewSummary}>
                <Plus size={13} />
                <span>New Summary</span>
              </button>
              <div className={styles.sessionList}>
                {savedSummaries.length === 0 ? (
                  <div className={styles.noHistory}><p>No summaries yet</p></div>
                ) : (
                  savedSummaries.map((sess) => (
                    <div
                      key={sess.id}
                      className={`${styles.sessionItem} ${sess.id === activeSummaryId ? styles.activeSessionItem : ''}`}
                      onClick={() => {
                        if (setActiveSummaryId) setActiveSummaryId(sess.id);
                        if (window.innerWidth <= 768) onClose();
                      }}
                    >
                      <div className={styles.sessionTitleWrapper}>
                        <FileText size={13} className={sess.id === activeSummaryId ? 'text-teal' : 'text-muted'} />
                        <span className={styles.sessionTitle}>{sess.title}</span>
                      </div>
                      <button className={styles.deleteSessionBtn} onClick={(e) => handleDeleteSummary(sess.id, e)}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (itemId === 'explain') {
      return (
        <div className={styles.sidebarResearchHistory}>
          <button className={styles.historyTabHeader} onClick={() => setIsExplainCollapsed(!isExplainCollapsed)}>
            <div className={styles.historyTabTitle}>
              <Sparkles size={13} className="text-teal" />
              <span>Explanation History</span>
            </div>
            {isExplainCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
          </button>
          {!isExplainCollapsed && (
            <div className={styles.historySubsection}>
              <button className={styles.newChatBtn} onClick={handleNewExplanation}>
                <Plus size={13} />
                <span>New Explain</span>
              </button>
              <div className={styles.sessionList}>
                {explanationHistory.length === 0 ? (
                  <div className={styles.noHistory}><p>No explanations yet</p></div>
                ) : (
                  explanationHistory.map((sess) => (
                    <div
                      key={sess.id}
                      className={`${styles.sessionItem} ${sess.id === activeExplanationId ? styles.activeSessionItem : ''}`}
                      onClick={() => {
                        if (setActiveExplanationId) setActiveExplanationId(sess.id);
                        if (window.innerWidth <= 768) onClose();
                      }}
                    >
                      <div className={styles.sessionTitleWrapper}>
                        <Sparkles size={13} className={sess.id === activeExplanationId ? 'text-teal' : 'text-muted'} />
                        <span className={styles.sessionTitle}>{sess.title}</span>
                      </div>
                      <button className={styles.deleteSessionBtn} onClick={(e) => handleDeleteExplanation(sess.id, e)}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (itemId === 'quiz') {
      return (
        <div className={styles.sidebarResearchHistory}>
          <button className={styles.historyTabHeader} onClick={() => setIsQuizCollapsed(!isQuizCollapsed)}>
            <div className={styles.historyTabTitle}>
              <HelpCircle size={13} className="text-teal" />
              <span>Quiz Attempts</span>
            </div>
            {isQuizCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
          </button>
          {!isQuizCollapsed && (
            <div className={styles.historySubsection}>
              <button className={styles.newChatBtn} onClick={handleNewQuiz}>
                <Plus size={13} />
                <span>New Quiz</span>
              </button>
              <div className={styles.sessionList}>
                {quizHistory.length === 0 ? (
                  <div className={styles.noHistory}><p>No attempts yet</p></div>
                ) : (
                  quizHistory.map((sess) => (
                    <div
                      key={sess.id}
                      className={`${styles.sessionItem} ${sess.id === activeQuizAttemptId ? styles.activeSessionItem : ''}`}
                      onClick={() => {
                        if (setActiveQuizAttemptId) setActiveQuizAttemptId(sess.id);
                        if (window.innerWidth <= 768) onClose();
                      }}
                    >
                      <div className={styles.sessionTitleWrapper}>
                        <Award size={13} className={sess.id === activeQuizAttemptId ? 'text-teal' : 'text-muted'} />
                        <div className={styles.sessionMeta} style={{ display: 'flex', flexDirection: 'column' }}>
                          <span className={styles.sessionTitle}>{sess.topic}</span>
                          <span className={styles.sessionDate} style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            Score: {sess.score}% ({sess.date})
                          </span>
                        </div>
                      </div>
                      <button className={styles.deleteSessionBtn} onClick={(e) => handleDeleteQuiz(sess.id, e)}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <>
      {isOpen && <div className={styles.sidebarOverlay} onClick={onClose} />}
      
      <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.logoArea}>
          <div className={styles.logoWrapper}>
            <Heart className={styles.logoIcon} fill="var(--color-teal)" size={24} />
            <h1 className={styles.appName}>Mega's Guide</h1>
          </div>
          <button 
            className={styles.closeSidebarBtn} 
            onClick={onClose} 
            aria-label="Close Sidebar"
          >
            <X size={20} />
          </button>
        </div>

        <nav className={styles.navSection}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const isCollapsible = ['research', 'chat', 'summarize', 'explain', 'quiz'].includes(item.id);

            return (
              <div key={item.id} className={styles.navItemWrapper}>
                <button
                  onClick={() => {
                    setActiveTab(item.id);
                    if (!isCollapsible) onClose();
                  }}
                  className={`${styles.navItem} ${isActive ? styles.activeNavItem : ''}`}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </button>

                {isActive && renderHistorySubmenu(item.id)}
              </div>
            );
          })}
        </nav>

        <div className={styles.footerSection}>
          <div className={styles.statsGrid}>
            <div className={styles.statCard} title="Study Streak! Keep logging in every day.">
              <Flame size={16} fill="var(--color-blush)" className="text-blush" />
              <span>🔥 {streak} day streak!</span>
            </div>
            
            <div className={styles.statCard} title="Total study modules launched.">
              <Award size={16} className="text-teal" />
              <span>🧠 {totalSessions} sessions</span>
            </div>
          </div>

          <div className={styles.trophyRow}>
            <span
              className={`${styles.trophyIcon} ${hasFirstSession ? '' : styles.trophyLocked}`} 
              title={hasFirstSession ? "Warmup (Unlocked): Started your 1st session!" : "Warmup (Locked): Start a study session"} 
            >
              <Trophy 
                size={18} 
                color={hasFirstSession ? "var(--color-gold)" : "var(--text-muted)"}
                fill={hasFirstSession ? "var(--color-gold)" : "none"}
              />
            </span>
            <span
              className={`${styles.trophyIcon} ${hasThreeSummaries ? '' : styles.trophyLocked}`} 
              title={hasThreeSummaries ? "Summary Scholar (Unlocked): Created 3+ summaries!" : "Summary Scholar (Locked): Create 3 note summaries"} 
            >
              <FileText 
                size={18} 
                color={hasThreeSummaries ? "var(--color-teal)" : "var(--text-muted)"}
              />
            </span>
            <span
              className={`${styles.trophyIcon} ${hasDeckCompleted ? '' : styles.trophyLocked}`} 
              title={hasDeckCompleted ? "Recall Master (Unlocked): Reviewed a full flashcard deck!" : "Recall Master (Locked): Finish reviewing any full flashcard deck"} 
            >
              <BookOpen 
                size={18} 
                color={hasDeckCompleted ? "var(--color-blush)" : "var(--text-muted)"}
              />
            </span>
            <span
              className={`${styles.trophyIcon} ${hasQuizAce ? '' : styles.trophyLocked}`} 
              title={hasQuizAce ? "Honor Student (Unlocked): Scored 70%+ in Quiz Mode!" : "Honor Student (Locked): Score 70%+ on any quiz"} 
            >
              <Award 
                size={18} 
                color={hasQuizAce ? "var(--color-gold)" : "var(--text-muted)"}
                fill={hasQuizAce ? "var(--color-gold)" : "none"}
              />
            </span>
          </div>

          <div className={styles.quoteContainer}>
            "{quote}"
          </div>
        </div>
      </aside>
    </>
  );
}
