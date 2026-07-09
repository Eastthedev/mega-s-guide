'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Stethoscope, Heart, Activity, FileText, Brain, 
  Sparkles, BookOpen, HelpCircle, ArrowRight, X, Flame, Trophy,
  Sun, Moon, ChevronRight, GraduationCap, ArrowUpRight, Search
} from 'lucide-react';
import confetti from 'canvas-confetti';
import styles from './page.module.css';

// Components
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import Overview from '../components/Overview';
import AIChat from '../components/AIChat';
import NoteSummary from '../components/NoteSummary';
import DetailedExplanation from '../components/DetailedExplanation';
import Flashcards from '../components/Flashcards';
import QuizMode from '../components/QuizMode';
import LoveButton from '../components/LoveButton';
import ResearchTab from '../components/ResearchTab';
import AuthScreen from '../components/AuthScreen';
import MnemonicsTab from '../components/MnemonicsTab';
import LockinTab from '../components/LockinTab';
import ImportantMessageModal from '../components/ImportantMessageModal';
import KeepingUpTab from '../components/KeepingUpTab';
import { 
  getUserStats, syncUserStats, supabase, getResearchSessions, ResearchSession,
  getChatSessions, ChatSession, getNoteSummaries, SavedSummary,
  getExplanationHistory, ExplanationItem, getQuizHistory, QuizAttempt
} from '../utils/supabase';

interface Toast {
  id: string;
  message: string;
}

export default function Home() {
  const [view, setView] = useState<'landing' | 'study'>('landing');
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [jumpNotes, setJumpNotes] = useState<string | undefined>(undefined);
  const [user, setUser] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Popup Modal state and refs
  const [showLetterPopup, setShowLetterPopup] = useState(false);
  const allowNextClickRef = useRef(false);
  const modalOpenRef = useRef(false);

  // Keep modalOpenRef in sync with showLetterPopup state
  useEffect(() => {
    modalOpenRef.current = showLetterPopup;
  }, [showLetterPopup]);

  // Automatically show the popup when the study view mounts or user logs in
  useEffect(() => {
    if (view === 'study' && user) {
      setShowLetterPopup(true);
    }
  }, [view, user]);

  // Intercept all clicks when in the study guide and logged in
  useEffect(() => {
    if (view !== 'study' || !user) return;

    const handleCaptureClick = (e: MouseEvent) => {
      const modalElement = document.getElementById('important-message-modal');
      
      // Allow click events inside the modal to bubble/propagate normally
      if (modalElement && modalElement.contains(e.target as Node)) {
        return;
      }

      // If the modal is currently open, block all other interactions
      if (modalOpenRef.current) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // If the modal was closed, allow the very next click to execute
      if (allowNextClickRef.current) {
        allowNextClickRef.current = false;
        return;
      }

      // Otherwise, block the click and show the modal
      e.preventDefault();
      e.stopPropagation();
      setShowLetterPopup(true);
    };

    window.addEventListener('click', handleCaptureClick, true);
    return () => {
      window.removeEventListener('click', handleCaptureClick, true);
    };
  }, [view, user]);

  const handleCloseModal = () => {
    setShowLetterPopup(false);
    allowNextClickRef.current = true;
  };

  // Research history shared states
  const [researchSessions, setResearchSessions] = useState<ResearchSession[]>([]);
  const [currentResearchSessionId, setCurrentResearchSessionId] = useState<string>('');

  // AI Chat history shared states
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentChatSessionId, setCurrentChatSessionId] = useState<string>('');

  // Summarize (Note Summary) history shared states
  const [savedSummaries, setSavedSummaries] = useState<SavedSummary[]>([]);
  const [activeSummaryId, setActiveSummaryId] = useState<string | null>(null);

  // Explain (Detailed Explanation) history shared states
  const [explanationHistory, setExplanationHistory] = useState<ExplanationItem[]>([]);
  const [activeExplanationId, setActiveExplanationId] = useState<string | null>(null);

  // Quiz Mode history shared states
  const [quizHistory, setQuizHistory] = useState<QuizAttempt[]>([]);
  const [activeQuizAttemptId, setActiveQuizAttemptId] = useState<string | null>(null);

  // Load all history items on auth state change
  useEffect(() => {
    if (!user) return;
    const loadAllHistory = async () => {
      try {
        // Load Research
        const resSessions = await getResearchSessions();
        setResearchSessions(resSessions);
        if (resSessions.length > 0) {
          setCurrentResearchSessionId(resSessions[0].id);
        } else {
          setCurrentResearchSessionId('res_' + Math.random().toString(36).substring(2, 15));
        }

        // Load AI Chat
        const chatSess = await getChatSessions();
        setChatSessions(chatSess);
        if (chatSess.length > 0) {
          setCurrentChatSessionId(chatSess[0].id);
        } else {
          setCurrentChatSessionId('chat_' + Math.random().toString(36).substring(2, 15));
        }

        // Load Note Summaries
        const summaries = await getNoteSummaries();
        setSavedSummaries(summaries);
        
        // Load Explanations
        const explanations = await getExplanationHistory();
        setExplanationHistory(explanations);

        // Load Quiz attempts
        const quizzes = await getQuizHistory();
        setQuizHistory(quizzes || []);
      } catch (err) {
        console.error("Failed to load history items on mount:", err);
      }
    };
    loadAllHistory();
  }, [user]);

  // Monitor auth state changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Landing Page Interactive States
  const [typewriterText, setTypewriterText] = useState('');
  const [visibleCards, setVisibleCards] = useState<Record<number, boolean>>({});
  const [scrollPercent, setScrollPercent] = useState(0);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [selectedDemoAnswer, setSelectedDemoAnswer] = useState<string | null>(null);
  const [motivationQuote, setMotivationQuote] = useState("Study like you're going to save a life... because you are. ❤️");

  // Sync theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('megas_guide_theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme === 'dark' || (!savedTheme && systemPrefersDark) ? 'dark' : 'light';
    setTheme(initialTheme);
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('megas_guide_theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    addToast(`Switched to ${nextTheme === 'light' ? 'Light' : 'Dark'} Mode 💡`);
  };

  const handleDemoAnswer = (option: string) => {
    setSelectedDemoAnswer(option);
    if (option === 'B') {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      });
    }
  };

  const handleRotateQuote = () => {
    const allQuotes = [
      "Every hour you study now is a life you'll save later. 🩺",
      "Study like you're going to save a life... because you are. ❤️",
      "Every page you read is a patient you'll save. I'm so proud of you, Baby. 🥰",
      "Consistency beats intensity. Keep going, future doctor! 💪",
      "Are you Epinephrine? Because you make my heart race! ⚡💓",
      "Baby, you are going to be the most compassionate, brilliant doctor. Keep going!",
      "You've got this, future doctor! 🩺❤️",
      "In a world of arrhythmia, you are my sinus rhythm. 💓",
      "You are the primary caregiver of my heart. 🩺"
    ];
    let nextQuote = motivationQuote;
    while (nextQuote === motivationQuote) {
      nextQuote = allQuotes[Math.floor(Math.random() * allQuotes.length)];
    }
    setMotivationQuote(nextQuote);
    handleConfettiStrip();
  };

  const typewriterPhrase = "Because you're going to be an incredible doctor. Let's get there together. 🩺";

  // 1. Toast Dispatcher
  const addToast = (message: string) => {
    const id = Date.now().toString() + Math.random().toString();
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // 2. Tab Navigation with prefilled study context
  const handleJumpToTab = (tab: string, initialNotes?: string) => {
    setJumpNotes(initialNotes);
    setActiveTab(tab);
    setView('study');
    addToast(`Switched to ${tab.toUpperCase()} Mode! ⚡`);
  };

  // 3. Track daily streak and welcome banner
  useEffect(() => {
    if (!user) return; // Only sync stats when logged in!

    const checkStreak = async () => {
      const today = new Date().toDateString();
      
      // 1. Fetch remote stats from Supabase
      const remoteStats = await getUserStats();
      
      // 2. Load local stats as cache
      const localLastVisit = localStorage.getItem('megas_guide_last_visit') || '';
      const localStreak = parseInt(localStorage.getItem('megas_guide_streak') || '0', 10);
      const localSessions = parseInt(localStorage.getItem('megas_guide_sessions_count') || '0', 10);
      const localSummaries = parseInt(localStorage.getItem('megas_guide_summaries_count') || '0', 10);
      const localDeckFinished = localStorage.getItem('megas_guide_deck_finished') === 'true';
      const localQuizAce = localStorage.getItem('megas_guide_quiz_ace') === 'true';
      const localQuizPb = parseInt(localStorage.getItem('megas_guide_quiz_pb') || '0', 10);

      // 3. Determine actual state by merging (remote takes priority if available, otherwise local)
      let lastVisit = remoteStats ? remoteStats.last_visit : localLastVisit;
      let currentStreak = remoteStats ? remoteStats.streak : localStreak;
      let sessionsCount = remoteStats ? remoteStats.total_sessions : localSessions;
      let summariesCount = remoteStats ? remoteStats.summaries_count : localSummaries;
      let deckFinished = remoteStats ? remoteStats.deck_finished : localDeckFinished;
      let quizAce = remoteStats ? remoteStats.quiz_ace : localQuizAce;
      let quizPb = remoteStats ? remoteStats.quiz_pb : localQuizPb;

      // 4. Run streak checks
      if (!lastVisit) {
        // First time opening app ever
        currentStreak = 1;
        lastVisit = today;
        addToast("Welcome to Mega's Guide! Let's start strong. 💪");
      } else if (lastVisit !== today) {
        const lastDate = new Date(lastVisit);
        const todayDate = new Date(today);
        const diffTime = Math.abs(todayDate.getTime() - lastDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          // Consecutive daily visit
          currentStreak += 1;
          lastVisit = today;
          
          if (currentStreak >= 7) {
            addToast(`🔥 ${currentStreak} days straight! Future doctors are made of this stuff. 🩺❤️`);
          } else if (currentStreak >= 3) {
            addToast(`🔥 ${currentStreak} days straight! You're building something special.`);
          } else {
            addToast(`Welcome back! ${currentStreak} day streak. Keep pushing! 💪`);
          }
        } else if (diffDays > 1) {
          // Streak broken
          currentStreak = 1;
          lastVisit = today;
          addToast("Streak reset! Welcome back. Let's get to work! 💪");
        }
      }

      // Increment sessions
      sessionsCount += 1;

      // 5. Update local storage cache
      localStorage.setItem('megas_guide_streak', currentStreak.toString());
      localStorage.setItem('megas_guide_last_visit', lastVisit);
      localStorage.setItem('megas_guide_sessions_count', sessionsCount.toString());
      localStorage.setItem('megas_guide_summaries_count', summariesCount.toString());
      localStorage.setItem('megas_guide_deck_finished', deckFinished.toString());
      localStorage.setItem('megas_guide_quiz_ace', quizAce.toString());
      localStorage.setItem('megas_guide_quiz_pb', quizPb.toString());

      // 6. Push back to Supabase
      await syncUserStats({
        streak: currentStreak,
        total_sessions: sessionsCount,
        last_visit: lastVisit,
        summaries_count: summariesCount,
        deck_finished: deckFinished,
        quiz_ace: quizAce,
        quiz_pb: quizPb
      });
    };

    checkStreak();
  }, [user]);

  // 4. Landing Page Typewriter effect
  useEffect(() => {
    if (view === 'landing') {
      let index = 0;
      setTypewriterText('');
      const timer = setInterval(() => {
        setTypewriterText((prev) => prev + typewriterPhrase.charAt(index));
        index++;
        if (index >= typewriterPhrase.length) {
          clearInterval(timer);
        }
      }, 45);
      return () => clearInterval(timer);
    }
  }, [view]);

  // 5. Intersection Observer for Landing Page Cards
  useEffect(() => {
    if (view === 'landing') {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const index = parseInt(entry.target.getAttribute('data-index') || '0', 10);
              setVisibleCards((prev) => ({ ...prev, [index]: true }));
            }
          });
        },
        { threshold: 0.1 }
      );

      const cards = document.querySelectorAll(`.${styles.featureCard}`);
      cards.forEach((card) => observer.observe(card));

      return () => observer.disconnect();
    }
  }, [view]);

  // 6. Scroll tracking for flowchart connecting line
  useEffect(() => {
    if (view === 'landing') {
      const handleScroll = () => {
        const howSection = document.getElementById('how-it-works-section');
        if (!howSection) return;
        const rect = howSection.getBoundingClientRect();
        const sectionHeight = rect.height;
        const visibleTop = window.innerHeight - rect.top;
        if (visibleTop > 0 && rect.top > -sectionHeight) {
          const percent = Math.min(
            100,
            Math.max(0, (visibleTop / (window.innerHeight + sectionHeight / 2)) * 100)
          );
          setScrollPercent(percent);
        }
      };

      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, [view]);

  const handleConfettiStrip = () => {
    confetti({
      particleCount: 50,
      angle: 60,
      spread: 55,
      origin: { x: 0 }
    });
    confetti({
      particleCount: 50,
      angle: 120,
      spread: 55,
      origin: { x: 1 }
    });
  };

  // Render correct dashboard active module
  const renderStudyTab = () => {
    switch (activeTab) {
      case 'overview':
        return <Overview setActiveTab={handleJumpToTab} onAddToast={addToast} />;
      case 'keepingup':
        return <KeepingUpTab />;
      case 'chat':
        return (
          <AIChat 
            onAddToast={addToast} 
            sessions={chatSessions}
            currentSessionId={currentChatSessionId}
            setSessions={setChatSessions}
            setCurrentSessionId={setCurrentChatSessionId}
          />
        );
      case 'summarize':
        return (
          <NoteSummary 
            onAddToast={addToast} 
            onJumpToTab={handleJumpToTab} 
            savedSummaries={savedSummaries}
            activeId={activeSummaryId}
            setSavedSummaries={setSavedSummaries}
            setActiveId={setActiveSummaryId}
          />
        );
      case 'explain':
        return (
          <DetailedExplanation 
            onAddToast={addToast} 
            explanationHistory={explanationHistory}
            activeId={activeExplanationId}
            setExplanationHistory={setExplanationHistory}
            setActiveId={setActiveExplanationId}
          />
        );
      case 'mnemonics':
        return <MnemonicsTab onAddToast={addToast} />;
      case 'flashcards':
        return <Flashcards onAddToast={addToast} initialNotes={jumpNotes} />;
      case 'quiz':
        return (
          <QuizMode 
            onAddToast={addToast} 
            initialNotes={jumpNotes}
            quizHistory={quizHistory}
            setQuizHistory={setQuizHistory}
            activeQuizAttemptId={activeQuizAttemptId}
            setActiveQuizAttemptId={setActiveQuizAttemptId}
          />
        );
      case 'lockin':
        return <LockinTab onAddToast={addToast} />;
      case 'research':
        return (
          <ResearchTab 
            onAddToast={addToast} 
            sessions={researchSessions}
            currentSessionId={currentResearchSessionId}
            setSessions={setResearchSessions}
            setCurrentSessionId={setCurrentResearchSessionId}
          />
        );
      default:
        return <Overview setActiveTab={handleJumpToTab} onAddToast={addToast} />;
    }
  };

  return (
    <div className={styles.appWrapper}>
      {/* Toast Alert overlay */}
      <div className={styles.toastContainer}>
        {toasts.map((toast) => (
          <div key={toast.id} className={styles.toast}>
            <span>{toast.message}</span>
            <button className={styles.closeToastBtn} onClick={() => removeToast(toast.id)}>
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Floating Love Button */}
      <LoveButton />

      {view === 'landing' ? (
        /* ================= LANDING PAGE VIEW ================= */
        <div className={styles.landingPage}>
          {/* Transparent Glassmorphic Navbar */}
          <header className={styles.navbar}>
            <div className={styles.navContainer}>
              <div className={styles.navLogo} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                <div className={styles.navLogoIcon}>
                  <Brain size={20} className={styles.brainIcon} />
                  <Heart size={10} fill="currentColor" className={styles.heartLogoIcon} />
                </div>
                <span className={styles.navLogoText}>Mega's Guide</span>
              </div>

              <nav className={styles.navLinks}>
                <a href="#why-section" className={styles.navLinkItem}>Features</a>
                <a href="#how-it-works-section" className={styles.navLinkItem}>How It Works</a>
                <a href="#motivation-section" className={styles.navLinkItem}>Motivation</a>
              </nav>

              <div className={styles.navActions}>
                <button 
                  className={styles.themeToggleBtn} 
                  onClick={toggleTheme}
                  aria-label="Toggle Theme"
                >
                  {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                </button>
                <button 
                  className="btn btn-primary" 
                  onClick={() => setView('study')}
                  style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem' }}
                >
                  {user ? 'Dashboard' : 'Start Studying'} <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </header>

          {/* Split-screen Hero Section */}
          <section className={styles.heroSection}>
            {/* Glowing Accent Blobs */}
            <div className={styles.glowBlob1} />
            <div className={styles.glowBlob2} />
            <div className={styles.gridOverlay} />

            <div className={styles.heroContainer}>
              <div className={styles.heroLeft}>
                <div className={styles.pillLabel}>
                  <Heart size={12} fill="currentColor" className="pulsing-heart" />
                  <span>Made for the future Dr. Baby</span>
                </div>
                
                <h1 className={styles.heroTitle}>
                  Study Smarter.<br />
                  <span>Save More Lives.</span>
                </h1>

                <p className={styles.heroSubtitle}>
                  Every page you read is a patient you'll save later. Your personal AI-powered study partner for medical school.
                </p>

                <div className={styles.typewriterText}>
                  {typewriterText}
                </div>

                <div className={styles.ctaGroup}>
                  <button 
                    className="btn btn-primary" 
                    onClick={() => setView('study')}
                  >
                    Start Studying Now <ArrowRight size={16} />
                  </button>
                  <a 
                    className="btn btn-ghost" 
                    href="#why-section"
                  >
                    Explore Features
                  </a>
                </div>
              </div>

              {/* Interactive Dashboard Quiz Mockup on the Right */}
              <div className={styles.heroRight}>
                <div className={styles.interactiveMockup}>
                  <div className={styles.mockupHeader}>
                    <div className={styles.mockupDots}>
                      <span className={styles.mockupDot} style={{ background: '#FF5F56' }} />
                      <span className={styles.mockupDot} style={{ background: '#FFBD2E' }} />
                      <span className={styles.mockupDot} style={{ background: '#27C93F' }} />
                    </div>
                    <div className={styles.mockupTitle}>
                      <Stethoscope size={12} style={{ color: 'var(--color-teal)' }} />
                      <span>Interactive Demo: Clinical Case Quiz</span>
                    </div>
                  </div>

                  <div className={styles.mockupBody}>
                    <div className={styles.clinicalCase}>
                      <span className={styles.caseBadge}>Vignette</span>
                      <p>
                        A 24-year-old medical student (clinical name: <strong>Baby</strong>) presents to the study lounge with acute fatigue, dilated pupils, and mild caffeine withdrawal secondary to 400-level exam prep. Heart rate is 98 bpm (sinus rhythm).
                      </p>
                    </div>

                    <h4 className={styles.questionText}>
                      What is the most appropriate first-line intervention to ensure success?
                    </h4>

                    <div className={styles.quizOptions}>
                      {[
                        { key: 'A', text: '100% high-flow oxygen and cardiology referral' },
                        { key: 'B', text: 'Coffee, a deep breath, and remembering they are going to make an incredible doctor 🩺☕❤️' },
                        { key: 'C', text: '24-hour continuous library confinement' },
                        { key: 'D', text: 'Immediate 200J synchronized DC cardioversion' }
                      ].map((opt) => {
                        let btnClass = styles.quizOption;
                        if (selectedDemoAnswer === opt.key) {
                          btnClass += ` ${opt.key === 'B' ? styles.quizOptionCorrect : styles.quizOptionIncorrect}`;
                        }

                        return (
                          <button
                            key={opt.key}
                            className={btnClass}
                            disabled={selectedDemoAnswer !== null}
                            onClick={() => handleDemoAnswer(opt.key)}
                          >
                            <span className={styles.optionKey}>{opt.key}</span>
                            <span className={styles.optionText}>{opt.text}</span>
                          </button>
                        );
                      })}
                    </div>

                    {selectedDemoAnswer && (
                      <div className={`${styles.rationaleBox} fade-in-up`}>
                        {selectedDemoAnswer === 'B' ? (
                          <>
                            <div className={styles.rationaleHeader} style={{ color: '#27C93F' }}>
                              <Sparkles size={16} /> Correct Decision!
                            </div>
                            <p>
                              Academic burnout and exam stress respond best to loving encouragement, pacing yourself, and warm beverages. You're doing amazing, future doctor! Keep studying, you are going to save lives. 🥰
                            </p>
                          </>
                        ) : (
                          <>
                            <div className={styles.rationaleHeader} style={{ color: '#FF5F56' }}>
                              <HelpCircle size={16} /> Incorrect Option
                            </div>
                            <p>
                              While cardioversion or referral sounds exciting, this student is just stressed. Try **Option B** for a more therapeutic and loving approach!
                            </p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* "Why Mega's Guide?" Feature Section */}
          <section id="why-section" className={styles.whySection}>
            <div className={styles.whyHeader}>
              <div className={styles.sectionBadge}>
                <Sparkles size={14} style={{ color: 'var(--color-teal)' }} />
                <span>Tailored Study Modes</span>
              </div>
              <h2 className={styles.sectionTitle}>Built for High-Yield Study</h2>
              <p className={styles.sectionDesc}>
                Everything you need to master your 400-level lectures, summarized and structured by AI to save you time.
              </p>
            </div>

            <div className={styles.whyGrid}>
              {[
                {
                  icon: <Brain size={24} />,
                  title: 'AI Chat',
                  text: 'Ask questions and get answers grounded strictly inside your own pasted notes. Perfect for tough slide materials.'
                },
                {
                  icon: <FileText size={24} />,
                  title: 'Note Summarizer',
                  text: 'Convert cluttered lecture slides or medical texts into beautifully structured, outline-based summaries instantly.'
                },
                {
                  icon: <BookOpen size={24} />,
                  title: '3D Flashcards',
                  text: 'Generate smart active-recall card decks directly from your notes. Study with responsive 3D card flips.'
                },
                {
                  icon: <HelpCircle size={24} />,
                  title: 'Interactive Quizzes',
                  text: 'Practice with custom-generated multiple choice questions. Receive instant clinical rationale and feedback.'
                },
                {
                  icon: <Sparkles size={24} />,
                  title: 'Clinical Breakdown',
                  text: 'Deep-dive into pathophysiology. Get step-by-step clinical explanations and mechanism analysis for complex diseases.'
                },
                {
                  icon: <Search size={24} />,
                  title: 'Literature Search',
                  text: 'Research and cross-reference clinical topics with scientific papers, medical guidelines, and reference summaries.'
                }
              ].map((feature, idx) => (
                <div 
                  key={idx}
                  className={`${styles.featureCard} ${styles.featureCardVisible}`}
                >
                  <div className={styles.featureIcon}>{feature.icon}</div>
                  <h3 className={styles.featureTitle}>{feature.title}</h3>
                  <p className={styles.featureText}>{feature.text}</p>
                </div>
              ))}
            </div>
          </section>

          {/* "How It Works" Stepper Section */}
          <section id="how-it-works-section" className={styles.howSection}>
            <div className={styles.howContent}>
              <div className={styles.sectionBadge} style={{ margin: '0 auto 1rem auto' }}>
                <GraduationCap size={14} style={{ color: 'var(--color-teal)' }} />
                <span>Simple Workflow</span>
              </div>
              <h2 className={styles.sectionTitle}>Three Steps to Mastery</h2>
              <p className={styles.sectionDesc}>
                A clean, efficient cycle designed to help you study smarter, retain longer, and build your confidence.
              </p>

              <div className={styles.stepsContainer}>
                {/* Connecting scroll-based progress line */}
                <div className={styles.stepsLine}>
                  <div 
                    className={styles.stepsLineProgress} 
                    style={{ width: `${scrollPercent}%` }}
                  />
                </div>

                <div className={styles.stepNode}>
                  <div className={`${styles.stepBadge} ${scrollPercent > 20 ? styles.stepBadgeActive : ''}`}>
                    <FileText size={20} />
                  </div>
                  <h3 className={styles.stepTitle}>1. Input Notes</h3>
                  <p className={styles.stepDesc}>
                    Paste lecture summaries, slide bullet points, or medical syllabus sections.
                  </p>
                </div>

                <div className={styles.stepNode}>
                  <div className={`${styles.stepBadge} ${scrollPercent > 50 ? styles.stepBadgeActive : ''}`}>
                    <Activity size={20} />
                  </div>
                  <h3 className={styles.stepTitle}>2. Choose Study Mode</h3>
                  <p className={styles.stepDesc}>
                    Select AI Chat answers, notes outlines, 3D flashcards, or interactive quizzes.
                  </p>
                </div>

                <div className={styles.stepNode}>
                  <div className={`${styles.stepBadge} ${scrollPercent > 80 ? styles.stepBadgeActive : ''}`}>
                    <Trophy size={20} />
                  </div>
                  <h3 className={styles.stepTitle}>3. Study Smarter 💪</h3>
                  <p className={styles.stepDesc}>
                    Ace clinical explanations, log streaks, and unlock trophies as you learn.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Motivation Section */}
          <section id="motivation-section" className={styles.motivationSection}>
            <div className={styles.motivationCard} onClick={handleRotateQuote} style={{ cursor: 'pointer' }}>
              <div className={styles.motivationCardGlow} />
              <div className={styles.quoteMark}>“</div>
              <p className={styles.motivationText}>
                {motivationQuote}
              </p>
              <div className={styles.quoteAuthor}>~ Mega</div>
              <div className={styles.clickHint}>
                <Sparkles size={12} className={styles.sparkleIcon} />
                <span>Click for another encouraging note & confetti!</span>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className={styles.footer}>
            <div className={styles.footerContent}>
              <div className={styles.footerLeft}>
                <div className={styles.footerLogo}>
                  <Brain size={18} style={{ color: 'var(--color-teal)' }} />
                  <span className={styles.footerLogoText}>Mega's Guide</span>
                </div>
                <p className={styles.footerTagline}>
                  Built with love for the future Dr. Baby 🩺❤️
                </p>
              </div>

              <div className={styles.footerLinks}>
                <button className={styles.footerLink} onClick={() => setView('study')}>Study Area</button>
                <a className={styles.footerLink} href="#why-section">Features</a>
                <a className={styles.footerLink} href="#how-it-works-section">Workflow</a>
                <button className={styles.footerLink} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Back to Top</button>
              </div>
            </div>
            <div className={styles.footerBottom}>
              <p>© {new Date().getFullYear()} Mega's Guide. Keep shining!</p>
            </div>
          </footer>
        </div>
      ) : !user ? (
        /* ================= AUTHENTICATION VIEW ================= */
        <div className={styles.dashboardLayout} style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-app)' }}>
          <TopBar
            currentSection="Authentication"
            onToggleSidebar={() => {}}
            onAddToast={addToast}
            hideActions
          />
          <AuthScreen 
            onAuthSuccess={() => setView('study')} 
            onAddToast={addToast} 
          />
        </div>
      ) : (
        /* ================= STUDY DASHBOARD VIEW ================= */
        <div className={styles.dashboardLayout}>
          <Sidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            onAddToast={addToast}
            // Research history props
            researchSessions={researchSessions}
            currentResearchSessionId={currentResearchSessionId}
            setResearchSessions={setResearchSessions}
            setCurrentResearchSessionId={setCurrentResearchSessionId}
            // AI Chat history props
            chatSessions={chatSessions}
            currentChatSessionId={currentChatSessionId}
            setChatSessions={setChatSessions}
            setCurrentChatSessionId={setCurrentChatSessionId}
            // Note Summary history props
            savedSummaries={savedSummaries}
            activeSummaryId={activeSummaryId}
            setSavedSummaries={setSavedSummaries}
            setActiveSummaryId={setActiveSummaryId}
            // Detailed Explanation history props
            explanationHistory={explanationHistory}
            activeExplanationId={activeExplanationId}
            setExplanationHistory={setExplanationHistory}
            setActiveExplanationId={setActiveExplanationId}
            // Quiz Mode history props
            quizHistory={quizHistory}
            setQuizHistory={setQuizHistory}
            activeQuizAttemptId={activeQuizAttemptId}
            setActiveQuizAttemptId={setActiveQuizAttemptId}
          />

          <div className={styles.mainContent}>
            <TopBar
              currentSection={activeTab}
              onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
              onAddToast={addToast}
            />

            <main className={styles.dashboardBody}>
              {renderStudyTab()}
            </main>
          </div>
          {showLetterPopup && (
            <ImportantMessageModal onClose={handleCloseModal} />
          )}
        </div>
      )}
    </div>
  );
}
