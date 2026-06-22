'use client';

import React, { useState, useEffect } from 'react';
import { 
  Heart, MessageSquare, FileText, Sparkles, BookOpen, 
  HelpCircle, Trophy, Flame, Play, Award, X, Search, Home, Lightbulb,
  Plus, Trash2, ChevronDown, ChevronRight
} from 'lucide-react';
import { deleteResearchSession } from '../utils/supabase';
import { getRandomSidebarQuote } from '../utils/quotes';
import styles from './Sidebar.module.css';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
  researchSessions?: any[];
  currentResearchSessionId?: string;
  setResearchSessions?: React.Dispatch<React.SetStateAction<any[]>>;
  setCurrentResearchSessionId?: (id: string) => void;
  onAddToast?: (msg: string) => void;
}

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  isOpen, 
  onClose,
  researchSessions = [],
  currentResearchSessionId = '',
  setResearchSessions,
  setCurrentResearchSessionId,
  onAddToast
}: SidebarProps) {
  const [quote, setQuote] = useState('');
  const [streak, setStreak] = useState(0);
  const [totalSessions, setTotalSessions] = useState(0);
  
  // Achievement states
  const [hasFirstSession, setHasFirstSession] = useState(false);
  const [hasThreeSummaries, setHasThreeSummaries] = useState(false);
  const [hasDeckCompleted, setHasDeckCompleted] = useState(false);
  const [hasQuizAce, setHasQuizAce] = useState(false);

  // Collapsible state for research history list
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false);

  // New research chat handler
  const handleNewChat = () => {
    const newSessId = 'res_' + Math.random().toString(36).substring(2, 15);
    if (setCurrentResearchSessionId) {
      setCurrentResearchSessionId(newSessId);
    }
    if (onAddToast) {
      onAddToast("New research thread started! 🔬");
    }
  };

  // Delete research session handler
  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteResearchSession(sessionId);
      if (setResearchSessions) {
        const updatedSessions = researchSessions.filter(s => s.id !== sessionId);
        setResearchSessions(updatedSessions);
        if (onAddToast) {
          onAddToast("Research thread deleted. 🧹");
        }

        if (currentResearchSessionId === sessionId) {
          if (updatedSessions.length > 0) {
            if (setCurrentResearchSessionId) setCurrentResearchSessionId(updatedSessions[0].id);
          } else {
            const newSessId = 'res_' + Math.random().toString(36).substring(2, 15);
            if (setCurrentResearchSessionId) setCurrentResearchSessionId(newSessId);
          }
        }
      }
    } catch (err) {
      console.error("Failed to delete research session:", err);
      if (onAddToast) {
        onAddToast("Error deleting session. 💙");
      }
    }
  };

  useEffect(() => {
    // 1. Pick a random sidebar quote
    setQuote(getRandomSidebarQuote());

    // 2. Load streak & stats from localStorage
    const savedStreak = parseInt(localStorage.getItem('megas_guide_streak') || '0', 10);
    const savedSessions = parseInt(localStorage.getItem('megas_guide_sessions_count') || '0', 10);
    
    setStreak(savedStreak);
    setTotalSessions(savedSessions);

    // 3. Load achievement triggers
    const summariesCount = parseInt(localStorage.getItem('megas_guide_summaries_count') || '0', 10);
    const deckFinished = localStorage.getItem('megas_guide_deck_finished') === 'true';
    const quizAce = localStorage.getItem('megas_guide_quiz_ace') === 'true';

    setHasFirstSession(savedSessions > 0);
    setHasThreeSummaries(summariesCount >= 3);
    setHasDeckCompleted(deckFinished);
    setHasQuizAce(quizAce);
  }, [activeTab]); // Refresh states whenever tabs change (as operations update localStorage)

  const navItems = [
    { id: 'overview', label: 'Dashboard', icon: Home },
    { id: 'chat', label: 'AI Chat', icon: MessageSquare },
    { id: 'summarize', label: 'Summarize', icon: FileText },
    { id: 'explain', label: 'Explain', icon: Sparkles },
    { id: 'mnemonics', label: 'Mnemonics', icon: Lightbulb },
    { id: 'flashcards', label: 'Flashcards', icon: BookOpen },
    { id: 'quiz', label: 'Quiz Mode', icon: HelpCircle },
    { id: 'research', label: 'Research', icon: Search }
  ];

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
            const isResearch = item.id === 'research';

            return (
              <div key={item.id} className={styles.navItemWrapper}>
                <button
                  onClick={() => {
                    setActiveTab(item.id);
                    if (!isResearch) onClose();
                  }}
                  className={`${styles.navItem} ${isActive ? styles.activeNavItem : ''}`}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </button>

                {isResearch && isActive && (
                  <div className={styles.sidebarResearchHistory}>
                    {/* Collapsible history header inside main side menu */}
                    <button 
                      className={styles.historyTabHeader} 
                      onClick={() => setIsHistoryCollapsed(!isHistoryCollapsed)}
                      aria-expanded={!isHistoryCollapsed}
                    >
                      <div className={styles.historyTabTitle}>
                        <MessageSquare size={13} className="text-teal" />
                        <span>History Threads</span>
                      </div>
                      {isHistoryCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                    </button>

                    {!isHistoryCollapsed && (
                      <div className={styles.historySubsection}>
                        <button className={styles.newChatBtn} onClick={handleNewChat}>
                          <Plus size={13} />
                          <span>New Thread</span>
                        </button>

                        <div className={styles.sessionList}>
                          {researchSessions.length === 0 ? (
                            <div className={styles.noHistory}>
                              <p>No history yet</p>
                            </div>
                          ) : (
                            researchSessions.map((sess) => {
                              const isSessionActive = sess.id === currentResearchSessionId;
                              return (
                                <div
                                  key={sess.id}
                                  className={`${styles.sessionItem} ${isSessionActive ? styles.activeSessionItem : ''}`}
                                  onClick={() => {
                                    if (setCurrentResearchSessionId) setCurrentResearchSessionId(sess.id);
                                    // Close sidebar drawer on mobile
                                    if (window.innerWidth <= 768) {
                                      onClose();
                                    }
                                  }}
                                >
                                  <div className={styles.sessionTitleWrapper}>
                                    <MessageSquare size={13} className={isSessionActive ? 'text-teal' : 'text-muted'} />
                                    <span className={styles.sessionTitle}>{sess.title}</span>
                                  </div>
                                  <button
                                    className={styles.deleteSessionBtn}
                                    onClick={(e) => handleDeleteSession(sess.id, e)}
                                    title="Delete Research Thread"
                                    aria-label="Delete Session"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
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
