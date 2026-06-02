'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Stethoscope, Heart, Activity, FileText, Brain, 
  Sparkles, BookOpen, HelpCircle, ArrowRight, X, Flame, Trophy
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
import { getUserStats, syncUserStats, supabase } from '../utils/supabase';

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
      case 'chat':
        return <AIChat onAddToast={addToast} />;
      case 'summarize':
        return <NoteSummary onAddToast={addToast} onJumpToTab={handleJumpToTab} />;
      case 'explain':
        return <DetailedExplanation onAddToast={addToast} />;
      case 'flashcards':
        return <Flashcards onAddToast={addToast} initialNotes={jumpNotes} />;
      case 'quiz':
        return <QuizMode onAddToast={addToast} initialNotes={jumpNotes} />;
      case 'research':
        return <ResearchTab onAddToast={addToast} />;
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
          {/* Hero Section */}
          <section className={styles.heroSection}>
            <div className={styles.animatedHeroBg} />
            
            {/* Floating SVGs */}
            <div className="floating-icon" style={{ top: '15%', left: '10%', animationDelay: '0s' }}>
              <Stethoscope size={40} className="text-teal" style={{ opacity: 0.4 }} />
            </div>
            <div className="floating-icon" style={{ top: '30%', right: '12%', animationDelay: '2s' }}>
              <Heart size={36} className="text-blush pulsing-heart" style={{ opacity: 0.5 }} />
            </div>
            <div className="floating-icon" style={{ bottom: '25%', left: '15%', animationDelay: '4s' }}>
              <Activity size={32} className="text-gold" style={{ opacity: 0.4 }} />
            </div>
            <div className="floating-icon" style={{ bottom: '15%', right: '20%', animationDelay: '1s' }}>
              <Brain size={38} className="text-teal" style={{ opacity: 0.3 }} />
            </div>

            <div className={styles.heroContent}>
              <div className={styles.pillLabel}>
                <span>Made with love, just for you</span>
                <Heart size={12} fill="white" className="pulsing-heart" />
              </div>

              <div className={styles.heroHeadingRow}>
                <h1 className={`${styles.heroTitle} fade-in-up`}>Mega's Guide</h1>
              </div>

              <p className={styles.heroSubtitle}>
                Your personal AI study companion for medical school.
              </p>

              <div className={styles.typewriterText}>
                {typewriterText}
              </div>

              <div className={styles.ctaGroup}>
                <button 
                  className="btn btn-primary" 
                  onClick={() => setView('study')}
                >
                  Start Studying →
                </button>
                <a 
                  className="btn btn-ghost" 
                  href="#why-section"
                  style={{ color: 'white', borderColor: 'rgba(255,255,255,0.4)' }}
                >
                  See How It Works
                </a>
              </div>
            </div>
          </section>

          {/* "Why Mega's Guide?" Feature Section */}
          <section id="why-section" className={styles.whySection}>
            <div className={styles.whyHeader}>
              <h2 className={styles.sectionTitle}>Why Mega's Guide?</h2>
              <p className={styles.sectionDesc}>
                Everything you need to master your 400-level lectures, summarized and structured by AI.
              </p>
            </div>

            <div className={styles.whyGrid}>
              <div 
                className={`${styles.featureCard} ${visibleCards[0] ? styles.featureCardVisible : ''}`}
                data-index="0"
              >
                <div className={styles.featureIcon}><Brain size={24} /></div>
                <h3 className={styles.featureTitle}>AI Chat</h3>
                <p className={styles.featureText}>
                  Ask anything. Get answers grounded strictly inside your own pasted notes.
                </p>
              </div>

              <div 
                className={`${styles.featureCard} ${visibleCards[1] ? styles.featureCardVisible : ''}`}
                data-index="1"
              >
                <div className={styles.featureIcon}><FileText size={24} /></div>
                <h3 className={styles.featureTitle}>Note Summary</h3>
                <p className={styles.featureText}>
                  Paste lecture slides and get beautiful concise bullets or organized guides instantly.
                </p>
              </div>

              <div 
                className={`${styles.featureCard} ${visibleCards[2] ? styles.featureCardVisible : ''}`}
                data-index="2"
              >
                <div className={styles.featureIcon}><BookOpen size={24} /></div>
                <h3 className={styles.featureTitle}>Flashcards</h3>
                <p className={styles.featureText}>
                  Auto-generate card decks from topics. Review with interactive 3D flips.
                </p>
              </div>

              <div 
                className={`${styles.featureCard} ${visibleCards[3] ? styles.featureCardVisible : ''}`}
                data-index="3"
              >
                <div className={styles.featureIcon}><HelpCircle size={24} /></div>
                <h3 className={styles.featureTitle}>Quiz Mode</h3>
                <p className={styles.featureText}>
                  Mock exams custom-built from notes. Get red/green validation and clinical rationales.
                </p>
              </div>
            </div>
          </section>

          {/* "How It Works" Stepper Section */}
          <section id="how-it-works-section" className={styles.howSection}>
            <div className={styles.howContent}>
              <h2 className={styles.sectionTitle}>How It Works</h2>
              <p className={styles.sectionDesc}>
                Three steps to study smarter, retain longer, and save future patients.
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
                  <div className={`${styles.stepBadge} ${scrollPercent > 20 ? styles.stepBadgeActive : ''}`}>1</div>
                  <h3 className={styles.stepTitle}>Input Notes</h3>
                  <p className={styles.stepDesc}>
                    Paste lecture summaries, slide bullet points, or medical syllabus sections.
                  </p>
                </div>

                <div className={styles.stepNode}>
                  <div className={`${styles.stepBadge} ${scrollPercent > 50 ? styles.stepBadgeActive : ''}`}>2</div>
                  <h3 className={styles.stepTitle}>Choose Study Mode</h3>
                  <p className={styles.stepDesc}>
                    Select AI Chat answers, notes outlines, 3D flashcards, or interactive quizzes.
                  </p>
                </div>

                <div className={styles.stepNode}>
                  <div className={`${styles.stepBadge} ${scrollPercent > 80 ? styles.stepBadgeActive : ''}`}>3</div>
                  <h3 className={styles.stepTitle}>Study Smarter 💪</h3>
                  <p className={styles.stepDesc}>
                    Ace clinical explanations, log streaks, and unlock trophies as you learn.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Motivation Strip */}
          <section className={styles.motivationStrip} onClick={handleConfettiStrip} style={{ cursor: 'pointer' }}>
            <div className={styles.motivationBgHearts}>
              <Heart size={40} className="floating-icon text-white" style={{ top: '20%', left: '10%' }} />
              <Heart size={30} className="floating-icon text-white" style={{ bottom: '20%', right: '15%', animationDelay: '3s' }} />
            </div>
            <p className={styles.motivationText}>
              "400 level. Final exams. You've already survived the hardest parts. This is just the beginning of your legacy."
            </p>
          </section>

          {/* Footer */}
          <footer className={styles.footer}>
            <div className={styles.footerContent}>
              <div className={styles.footerLeft}>
                <h3 className={styles.footerHeading}>Mega's Guide</h3>
                <p className={styles.footerTagline}>
                  Built with love for the future Dr. Baby 🩺❤️
                </p>
              </div>

              <div className={styles.footerLinks}>
                <button className={styles.footerLink} onClick={() => setView('study')}>Study Area</button>
                <a className={styles.footerLink} href="#why-section">How It Works</a>
                <button className={styles.footerLink} onClick={() => window.scrollTo(0,0)}>Back to Top</button>
              </div>
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
        </div>
      )}
    </div>
  );
}
