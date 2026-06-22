'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  MessageSquare, FileText, Sparkles, BookOpen, 
  HelpCircle, Search, Flame, Award, Trophy, Heart, ArrowRight,
  Gift, TrendingUp, TrendingDown, Minus, BarChart2, Calendar, Star
} from 'lucide-react';
import { getQuizHistory, getUserStats } from '../utils/supabase';
import styles from './Overview.module.css';

interface OverviewProps {
  setActiveTab: (tab: string) => void;
  onAddToast: (message: string) => void;
}

// Birthday: adjust this date as needed — Mega knows best 😄
const BIRTHDAY = new Date('2025-11-06'); // Baby's birthday — 6th November 🎂

function daysBetween(a: Date, b: Date) {
  return Math.ceil(Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function daysUntilBirthday() {
  const today = new Date();
  const nextBirthday = new Date(today.getFullYear(), BIRTHDAY.getMonth(), BIRTHDAY.getDate());
  if (nextBirthday < today) nextBirthday.setFullYear(today.getFullYear() + 1);
  return daysBetween(today, nextBirthday);
}

function toDateKey(dateStr: string) {
  // normalise various date formats to YYYY-MM-DD
  try { return new Date(dateStr).toISOString().slice(0, 10); } catch { return ''; }
}

export default function Overview({ setActiveTab, onAddToast }: OverviewProps) {
  const [streak, setStreak] = useState(0);
  const [totalSessions, setTotalSessions] = useState(0);
  const [summariesCount, setSummariesCount] = useState(0);
  const [flashcardsCount, setFlashcardsCount] = useState(0);
  const [quizPb, setQuizPb] = useState(0);

  // Achievements
  const [hasFirstSession, setHasFirstSession] = useState(false);
  const [hasThreeSummaries, setHasThreeSummaries] = useState(false);
  const [hasDeckCompleted, setHasDeckCompleted] = useState(false);
  const [hasQuizAce, setHasQuizAce] = useState(false);

  // Performance data
  const [quizHistory, setQuizHistory] = useState<any[]>([]);
  const [bdayDays] = useState(() => daysUntilBirthday());

  useEffect(() => {
    const savedStreak = parseInt(localStorage.getItem('megas_guide_streak') || '0', 10);
    const savedSessions = parseInt(localStorage.getItem('megas_guide_sessions_count') || '0', 10);
    const savedSummaries = parseInt(localStorage.getItem('megas_guide_summaries_count') || '0', 10);
    const savedQuizPb = parseInt(localStorage.getItem('megas_guide_quiz_pb') || '0', 10);
    let savedDeckSize = 0;
    try {
      const raw = localStorage.getItem('megas_guide_saved_deck');
      if (raw) { const deck = JSON.parse(raw); if (deck?.cards) savedDeckSize = deck.cards.length; }
    } catch {}

    setStreak(savedStreak);
    setTotalSessions(savedSessions);
    setSummariesCount(savedSummaries);
    setFlashcardsCount(savedDeckSize);
    setQuizPb(savedQuizPb);

    const deckFinished = localStorage.getItem('megas_guide_deck_finished') === 'true';
    const quizAce = localStorage.getItem('megas_guide_quiz_ace') === 'true';
    setHasFirstSession(savedSessions > 0);
    setHasThreeSummaries(savedSummaries >= 3);
    setHasDeckCompleted(deckFinished);
    setHasQuizAce(quizAce);

    // Load quiz history from Supabase for performance charts
    getQuizHistory().then(h => setQuizHistory(h || []));
  }, []);

  // ── Derived performance metrics ──────────────────────────────────────────
  const avgScore = useMemo(() => {
    if (quizHistory.length === 0) return null;
    const total = quizHistory.reduce((sum, q) => sum + Math.round((q.score / q.totalQuestions) * 100), 0);
    return Math.round(total / quizHistory.length);
  }, [quizHistory]);

  const recentScore = useMemo(() => {
    if (quizHistory.length === 0) return null;
    const q = quizHistory[0];
    return Math.round((q.score / q.totalQuestions) * 100);
  }, [quizHistory]);

  const trend = useMemo(() => {
    if (quizHistory.length < 2) return 'neutral';
    const last = Math.round((quizHistory[0].score / quizHistory[0].totalQuestions) * 100);
    const prev = Math.round((quizHistory[1].score / quizHistory[1].totalQuestions) * 100);
    if (last > prev) return 'up';
    if (last < prev) return 'down';
    return 'neutral';
  }, [quizHistory]);

  // Last 7 days daily quiz average
  const last7Days = useMemo(() => {
    const days: Array<{ label: string; dateKey: string; pct: number | null; count: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-US', { weekday: 'short' });
      const attempts = quizHistory.filter(q => toDateKey(q.date) === key || q.date?.startsWith(key));
      const count = attempts.length;
      const pct = count > 0
        ? Math.round(attempts.reduce((s, q) => s + (q.score / q.totalQuestions) * 100, 0) / count)
        : null;
      days.push({ label, dateKey: key, pct, count });
    }
    return days;
  }, [quizHistory]);

  // 12-week activity heatmap (quiz count per day)
  const heatmapData = useMemo(() => {
    const weeks: Array<Array<{ dateKey: string; count: number; label: string }>> = [];
    const today = new Date();
    // Start from 84 days ago (12 weeks), aligned to Sunday
    const start = new Date(today);
    start.setDate(start.getDate() - 83);
    // shift to nearest prior Sunday
    start.setDate(start.getDate() - start.getDay());

    let current = new Date(start);
    for (let w = 0; w < 13; w++) {
      const week: Array<{ dateKey: string; count: number; label: string }> = [];
      for (let d = 0; d < 7; d++) {
        const key = current.toISOString().slice(0, 10);
        const dayLabel = current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const count = quizHistory.filter(q => toDateKey(q.date) === key || q.date?.startsWith(key)).length;
        const isFuture = current > today;
        week.push({ dateKey: key, count: isFuture ? -1 : count, label: dayLabel });
        current.setDate(current.getDate() + 1);
      }
      weeks.push(week);
    }
    return weeks;
  }, [quizHistory]);

  // Weekly aggregates (last 4 weeks)
  const weeklyAgg = useMemo(() => {
    const weeks: Array<{ label: string; avg: number | null; total: number }> = [];
    for (let w = 3; w >= 0; w--) {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - w * 7);
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 6);
      const label = w === 0 ? 'This week' : `${w}w ago`;
      const attempts = quizHistory.filter(q => {
        const d = new Date(q.date);
        return d >= startDate && d <= endDate;
      });
      const avg = attempts.length > 0
        ? Math.round(attempts.reduce((s, q) => s + (q.score / q.totalQuestions) * 100, 0) / attempts.length)
        : null;
      weeks.push({ label, avg, total: attempts.length });
    }
    return weeks;
  }, [quizHistory]);

  // Motivational message based on avgScore
  const motivationalText = useMemo(() => {
    if (avgScore === null) {
      return {
        emoji: '🌱',
        headline: "Let's get started, Baby!",
        body: "Take your first quiz and we'll track your progress right here. You've got this — the mystery box is waiting! 📦💕",
        color: 'teal' as const
      };
    }
    if (avgScore < 50) {
      return {
        emoji: '💪',
        headline: "Time to hit those books harder!",
        body: `You're averaging ${avgScore}% on your quizzes. Baby, I promised you a mystery box on your birthday — but it comes with the condition that you UP those scores! You can do this. Let's review those missed questions and go again. 📚❤️`,
        color: 'blush' as const
      };
    }
    if (avgScore < 70) {
      return {
        emoji: '⚡',
        headline: "You're getting there — keep the momentum!",
        body: `${avgScore}% average is solid progress! The mystery box is getting closer 🎁 — just a little more studying and you'll cross that 70% line. I believe in you, Baby! Push push push! 💪`,
        color: 'amber' as const
      };
    }
    return {
      emoji: '🔥',
      headline: "Baby, you're CRUSHING it!",
      body: `${avgScore}% average — AMAZING! That mystery box is definitely coming on your birthday! 🎁✨ Keep going, let's get to 90%! You're going to be the best doctor. Don't stop now! 🩺💙`,
      color: 'green' as const
    };
  }, [avgScore]);

  const heatmapColor = (count: number) => {
    if (count < 0) return styles.heatFuture;
    if (count === 0) return styles.heatNone;
    if (count === 1) return styles.heatLow;
    if (count === 2) return styles.heatMed;
    return styles.heatHigh;
  };

  const barColor = (pct: number | null) => {
    if (pct === null) return 'var(--border-color)';
    if (pct >= 70) return 'var(--color-teal)';
    if (pct >= 50) return '#f59e0b';
    return 'var(--color-blush)';
  };

  const featureCards = [
    { id: 'chat', title: 'AI Chat (Notes)', description: 'Ask questions grounded only in your study notes. Previews and analyzes PDFs/images.', icon: MessageSquare, color: 'teal', tagline: 'Review with your notes' },
    { id: 'research', title: 'Research Hub', description: 'General medical knowledge. Excellent for quick facts or definitions.', icon: Search, color: 'blue', tagline: 'Ask AI anything' },
    { id: 'summarize', title: 'Summarize Notes', description: 'Generate beautiful notes in Concise, Detailed, Study Guide, or Key Facts templates.', icon: FileText, color: 'blush', tagline: 'Draft summaries' },
    { id: 'explain', title: 'Detailed Explainer', description: 'Get clear clinical explanations, funny analogies, and highlighted exam points.', icon: Sparkles, color: 'gold', tagline: 'Master complex concepts' },
    { id: 'lockin', title: '3rd MB lockin', description: 'Interactive MBBS Second Block study timetable. Track weeks, filter subjects, and manage your prep progress.', icon: Calendar, color: 'purple', tagline: 'Study Timetable & Planner' },
    { id: 'flashcards', title: 'Flashcards Deck', description: 'Flip medical flashcards with active recall grading and memory intervals.', icon: BookOpen, color: 'purple', tagline: 'Test your memory' },
    { id: 'quiz', title: 'Quiz Mode', description: 'Generate multi-choice or true/false questions with thorough AI feedback.', icon: HelpCircle, color: 'red', tagline: 'Evaluate progress' },
  ];

  return (
    <div className={styles.container}>
      {/* ── Welcome Banner ── */}
      <div className={styles.welcomeBanner}>
        <div className={styles.welcomeText}>
          <div className={styles.welcomeTitleRow}>
            <h1>Welcome back, Baby! 🩺❤️</h1>
            <div className={styles.heartPulseContainer}>
              <Heart className={styles.pulsingHeart} fill="var(--color-blush)" size={24} />
            </div>
          </div>
          <p className={styles.welcomeSubtitle}>
            Welcome to your personal study guide, specially built with love by Mega. Let's master medical school together!
          </p>
        </div>
      </div>

      {/* ── Stats Quick View ── */}
      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.streakCard}`}>
          <div className={styles.statIconWrapper}><Flame size={24} fill="var(--color-blush)" className={styles.streakIcon} /></div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Day Streak</span>
            <span className={styles.statValue}>{streak} Days</span>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.sessionsCard}`}>
          <div className={styles.statIconWrapper}><Award size={24} className={styles.sessionsIcon} /></div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Sessions Launched</span>
            <span className={styles.statValue}>{totalSessions}</span>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.summariesCard}`}>
          <div className={styles.statIconWrapper}><FileText size={24} className={styles.summariesIcon} /></div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Notes Summarized</span>
            <span className={styles.statValue}>{summariesCount}</span>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.quizCard}`}>
          <div className={styles.statIconWrapper}><Trophy size={24} fill="var(--color-gold)" className={styles.quizIcon} /></div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Total Quizzes</span>
            <span className={styles.statValue}>{quizHistory.length}</span>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.cardsCard}`}>
          <div className={styles.statIconWrapper}><Star size={24} className={styles.cardsIcon} /></div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Quiz Average</span>
            <span className={styles.statValue}>{avgScore !== null ? `${avgScore}%` : '—'}</span>
          </div>
        </div>
      </div>

      {/* ── Performance Hub ── */}
      <div className={styles.performanceSection}>
        <h2 className={styles.sectionTitle}>📊 Your Performance Hub</h2>

        {/* Motivational Banner */}
        <div className={`${styles.motivationBanner} ${styles[`motiv_${motivationalText.color}`]}`}>
          <div className={styles.motivEmoji}>{motivationalText.emoji}</div>
          <div className={styles.motivContent}>
            <h3 className={styles.motivHeadline}>{motivationalText.headline}</h3>
            <p className={styles.motivBody}>{motivationalText.body}</p>
          </div>
          {trend === 'up' && <TrendingUp className={styles.trendIcon} size={28} />}
          {trend === 'down' && <TrendingDown className={styles.trendIconDown} size={28} />}
          {trend === 'neutral' && quizHistory.length > 0 && <Minus className={styles.trendIconNeutral} size={28} />}
        </div>

        {/* ── Daily Bar Chart (last 7 days) ── */}
        <div className={styles.perfCard}>
          <div className={styles.perfCardHeader}>
            <BarChart2 size={18} />
            <span>Daily Quiz Performance — Last 7 Days</span>
          </div>
          <div className={styles.barChart}>
            {last7Days.map((day) => (
              <div key={day.dateKey} className={styles.barColumn}>
                <span className={styles.barPctLabel}>
                  {day.pct !== null ? `${day.pct}%` : '—'}
                </span>
                <div className={styles.barTrack}>
                  <div
                    className={styles.barFill}
                    style={{
                      height: day.pct !== null ? `${day.pct}%` : '0%',
                      background: barColor(day.pct)
                    }}
                  />
                </div>
                <span className={styles.barDayLabel}>{day.label}</span>
                {day.count > 0 && <span className={styles.barCountLabel}>{day.count}q</span>}
              </div>
            ))}
          </div>
        </div>

        {/* ── Weekly Summary Cards ── */}
        <div className={styles.weeklyGrid}>
          {weeklyAgg.map((w, i) => (
            <div key={i} className={styles.weeklyCard}>
              <span className={styles.weeklyLabel}>{w.label}</span>
              <span className={styles.weeklyScore} style={{ color: barColor(w.avg) }}>
                {w.avg !== null ? `${w.avg}%` : '—'}
              </span>
              <span className={styles.weeklyCount}>{w.total} quiz{w.total !== 1 ? 'zes' : ''}</span>
            </div>
          ))}
        </div>

        {/* ── Activity Calendar (heatmap) ── */}
        <div className={styles.perfCard}>
          <div className={styles.perfCardHeader}>
            <Calendar size={18} />
            <span>Activity Calendar — Quiz Activity Heatmap</span>
            <div className={styles.heatLegend}>
              <span className={`${styles.heatCell} ${styles.heatNone}`} />
              <span className={`${styles.heatCell} ${styles.heatLow}`} />
              <span className={`${styles.heatCell} ${styles.heatMed}`} />
              <span className={`${styles.heatCell} ${styles.heatHigh}`} />
              <span className={styles.legendLabel}>Less → More</span>
            </div>
          </div>
          <div className={styles.heatmap}>
            {/* Day-of-week labels */}
            <div className={styles.heatDayLabels}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <span key={i} className={styles.heatDayLabel}>{d}</span>
              ))}
            </div>
            {/* Columns = weeks */}
            <div className={styles.heatGrid}>
              {heatmapData.map((week, wi) => (
                <div key={wi} className={styles.heatColumn}>
                  {week.map((day) => (
                    <div
                      key={day.dateKey}
                      className={`${styles.heatCell} ${heatmapColor(day.count)}`}
                      title={day.count >= 0 ? `${day.label}: ${day.count} quiz${day.count !== 1 ? 'zes' : ''}` : ''}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Mystery Box Teaser ── */}
        <div className={styles.mysteryBox}>
          <div className={styles.mysteryGlow} />
          <div className={styles.mysteryContent}>
            <div className={styles.mysteryIcon}>
              <Gift size={32} />
            </div>
            <div className={styles.mysteryText}>
              <h3 className={styles.mysteryTitle}>🎁 A Mystery Box Awaits You!</h3>
              <p className={styles.mysteryBody}>
                Mega promised you something special on your birthday. 
                Keep studying hard, ace those quizzes — and when the day comes, 
                something beautiful is waiting just for you. 
                {bdayDays <= 30
                  ? ` Only ${bdayDays} days away... 🌸`
                  : ` Your birthday is ${bdayDays} days away — that's plenty of time to become unstoppable. 💪`}
              </p>
              <div className={styles.mysteryUnlockBar}>
                <div className={styles.mysteryUnlockFill} style={{ width: `${Math.min(100, avgScore ?? 0)}%` }} />
              </div>
              <span className={styles.mysteryUnlockLabel}>
                {avgScore !== null ? `${avgScore}% average — keep pushing to unlock it! 🔓` : 'Take your first quiz to start your journey!'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Trophies ── */}
      <div className={styles.trophySection}>
        <h2 className={styles.sectionTitle}>Your Accomplishments & Badges</h2>
        <div className={styles.trophyShelf}>
          <div className={`${styles.trophyBadge} ${hasFirstSession ? styles.unlocked : styles.locked}`}>
            <div className={styles.badgeIconWrapper}><Trophy size={28} /></div>
            <div className={styles.badgeText}>
              <h3>Warmup</h3>
              <p>{hasFirstSession ? 'Started your first study session!' : 'Launch a study session to unlock'}</p>
            </div>
          </div>
          <div className={`${styles.trophyBadge} ${hasThreeSummaries ? styles.unlocked : styles.locked}`}>
            <div className={styles.badgeIconWrapper}><FileText size={28} /></div>
            <div className={styles.badgeText}>
              <h3>Summary Scholar</h3>
              <p>{hasThreeSummaries ? 'Generated 3+ medical summaries!' : 'Summarize notes 3 times to unlock'}</p>
            </div>
          </div>
          <div className={`${styles.trophyBadge} ${hasDeckCompleted ? styles.unlocked : styles.locked}`}>
            <div className={styles.badgeIconWrapper}><BookOpen size={28} /></div>
            <div className={styles.badgeText}>
              <h3>Recall Master</h3>
              <p>{hasDeckCompleted ? 'Completed reviewing a full deck!' : 'Finish reviewing a deck to unlock'}</p>
            </div>
          </div>
          <div className={`${styles.trophyBadge} ${hasQuizAce ? styles.unlocked : styles.locked}`}>
            <div className={styles.badgeIconWrapper}><Award size={28} /></div>
            <div className={styles.badgeText}>
              <h3>Honor Student</h3>
              <p>{hasQuizAce ? 'Scored 70%+ on a test quiz!' : 'Ace a quiz with 70%+ to unlock'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Feature Navigation Grid ── */}
      <div className={styles.navSection}>
        <h2 className={styles.sectionTitle}>What would you like to do, Baby? ✨</h2>
        <div className={styles.grid}>
          {featureCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.id} className={`${styles.card} ${styles[card.color]}`} onClick={() => setActiveTab(card.id)}>
                <div className={styles.cardHeader}>
                  <span className={styles.cardTagline}>{card.tagline}</span>
                  <div className={styles.cardIconWrapper}><Icon size={20} /></div>
                </div>
                <h3 className={styles.cardTitle}>{card.title}</h3>
                <p className={styles.cardDescription}>{card.description}</p>
                <div className={styles.cardFooter}>
                  <span>Get Started</span>
                  <ArrowRight size={14} className={styles.arrow} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
