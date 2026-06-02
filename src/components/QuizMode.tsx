'use client';

import React, { useState, useEffect } from 'react';
import { 
  Sparkles, HelpCircle, ArrowRight, RotateCcw, 
  Check, X as CloseIcon, Award, ChevronDown, ChevronUp, 
  Plus, Trash2, FolderHeart, BarChart2
} from 'lucide-react';
import { generateQuiz, QuizQuestion } from '../utils/gemini';
import { getQuizHistory, saveQuizAttempt, deleteQuizAttempt, syncCurrentStats, QuizAttempt } from '../utils/supabase';
import confetti from 'canvas-confetti';
import styles from './QuizMode.module.css';

interface QuizModeProps {
  onAddToast: (message: string) => void;
  initialNotes?: string;
}

interface MissedQuestion {
  question: string;
  selectedAnswer: string;
  correctAnswer: string;
  explanation: string;
}

const scoreColor = (pct: number) => {
  if (pct >= 70) return styles.scoreBadgeGreen;
  if (pct >= 50) return styles.scoreBadgeAmber;
  return styles.scoreBadgeRed;
};

export default function QuizMode({ onAddToast, initialNotes }: QuizModeProps) {
  const [notes, setNotes] = useState('');
  const [count, setCount] = useState<number>(5);
  const [type, setType] = useState<'mcq' | 'tf' | 'mixed'>('mcq');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'mixed'>('medium');

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [currentTopic, setCurrentTopic] = useState('');
  
  const [missedQuestions, setMissedQuestions] = useState<MissedQuestion[]>([]);
  const [showMissedList, setShowMissedList] = useState(false);
  const [personalBest, setPersonalBest] = useState<number | null>(null);
  const [quizHistory, setQuizHistory] = useState<QuizAttempt[]>([]);

  const loadHistory = async () => {
    const history = await getQuizHistory();
    setQuizHistory(history || []);
  };

  useEffect(() => {
    if (initialNotes) {
      setNotes(initialNotes);
    }
    const pb = localStorage.getItem('megas_guide_quiz_pb');
    if (pb !== null) setPersonalBest(parseInt(pb, 10));
    loadHistory();
  }, [initialNotes]);

  const buildTopic = (text: string) =>
    text.trim().split('\n')[0].substring(0, 40).replace(/[#*]/g, '').trim() || 'General Quiz';

  const handleGenerate = async () => {
    if (!notes.trim()) return;

    setIsLoading(true);
    setQuestions([]);
    setCurrentQIndex(0);
    setSelectedOption(null);
    setScore(0);
    setIsAnswered(false);
    setIsCompleted(false);
    setMissedQuestions([]);
    setShowMissedList(false);

    localStorage.setItem('megas_guide_study_context', notes);
    const topic = buildTopic(notes);
    setCurrentTopic(topic);

    try {
      const generatedQs = await generateQuiz(notes, count, type, difficulty);
      if (generatedQs.length === 0) throw new Error('No quiz questions were returned.');
      setQuestions(generatedQs);
      onAddToast(`Quiz loaded with ${generatedQs.length} questions! 📝`);
    } catch (err: any) {
      console.error(err);
      onAddToast(`Error generating quiz: ${err.message || 'Check your API connection.'}`);
      setQuestions([{
        question: "An error occurred during generation. What's the best next step?",
        options: ['Check your internet', 'Verify your Gemini API key in settings', 'Paste a smaller study context', 'All of the above'],
        correctIndex: 3,
        explanation: 'Ensure the API credentials are set, and your context note is correctly pasted! 💙'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOptionSelect = (idx: number) => {
    if (isAnswered) return;
    setSelectedOption(idx);
    setIsAnswered(true);

    const isCorrect = idx === questions[currentQIndex].correctIndex;
    if (isCorrect) {
      setScore(s => s + 1);
      onAddToast('Correct! Brilliant job! ✅');
    } else {
      onAddToast("Not quite, but it's a learning moment! ❌");
      setMissedQuestions(prev => [...prev, {
        question: questions[currentQIndex].question,
        selectedAnswer: questions[currentQIndex].options[idx],
        correctAnswer: questions[currentQIndex].options[questions[currentQIndex].correctIndex],
        explanation: questions[currentQIndex].explanation
      }]);
    }
  };

  const handleNext = () => {
    if (currentQIndex < questions.length - 1) {
      setCurrentQIndex(i => i + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      // Quiz done
      setIsCompleted(true);
      const finalScore = score + (selectedOption === questions[currentQIndex].correctIndex ? 1 : 0);
      const scorePercent = Math.round((finalScore / questions.length) * 100);

      if (scorePercent >= 70) {
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
        localStorage.setItem('megas_guide_quiz_ace', 'true');
      }

      const oldPb = localStorage.getItem('megas_guide_quiz_pb');
      if (oldPb === null || finalScore > parseInt(oldPb, 10)) {
        localStorage.setItem('megas_guide_quiz_pb', finalScore.toString());
        setPersonalBest(finalScore);
        onAddToast('New Personal Best score saved! 🎓🏆');
      }

      const sessCount = parseInt(localStorage.getItem('megas_guide_sessions_count') || '0', 10);
      localStorage.setItem('megas_guide_sessions_count', (sessCount + 1).toString());

      const saveAttempt = async () => {
        const attempt: QuizAttempt = {
          id: Date.now().toString(),
          score: finalScore,
          totalQuestions: questions.length,
          questions,
          originalNotes: notes,
          date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        };
        await saveQuizAttempt(attempt);
        await syncCurrentStats();
        loadHistory();
      };
      saveAttempt();
    }
  };

  const handleReplayAttempt = (attempt: QuizAttempt) => {
    setNotes(attempt.originalNotes || '');
    setCurrentTopic(buildTopic(attempt.originalNotes || ''));
    setQuestions(attempt.questions || []);
    setScore(0);
    setCurrentQIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setIsCompleted(false);
    setMissedQuestions([]);
    onAddToast("Quiz reloaded — let's beat that score! 🎓✨");
  };

  const handleDeleteAttempt = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteQuizAttempt(id);
    await loadHistory();
    onAddToast('Quiz attempt removed. 🧹');
  };

  const handleNewQuiz = () => {
    setQuestions([]);
    setCurrentQIndex(0);
    setSelectedOption(null);
    setScore(0);
    setIsAnswered(false);
    setIsCompleted(false);
    setMissedQuestions([]);
    setCurrentTopic('');
  };

  const handleUseContextNotes = () => {
    const ctx = localStorage.getItem('megas_guide_study_context') || '';
    if (ctx) { setNotes(ctx); onAddToast('Pre-filled notes from study context! 📚'); }
    else onAddToast('No active study context found. Paste notes below.');
  };

  const getResultsFeedback = (percentage: number) => {
    if (percentage >= 90) return "PERFECT. You're ready. Baby, the exam doesn't know what's coming. 🩺🔥";
    if (percentage >= 70) return 'So close! A little more review and you\'ll nail it. I believe in you. 💙';
    if (percentage >= 50) return 'Good foundation! Let\'s reinforce the weak spots. You\'ve got this.';
    return "Don't worry — this is exactly why we practice. Review those notes and try again. I believe in you. ❤️";
  };

  const progressPercent = questions.length > 0
    ? ((currentQIndex + (isAnswered ? 1 : 0)) / questions.length) * 100
    : 0;

  const finalScoreVal = score;
  const finalScorePct = questions.length > 0 ? Math.round((finalScoreVal / questions.length) * 100) : 0;

  return (
    <div className={styles.wrapper}>
      {/* ========== SIDEBAR ========== */}
      <aside className={styles.sidebar}>
        <button className={styles.newQuizBtn} onClick={handleNewQuiz}>
          <Plus size={16} />
          <span>New Quiz</span>
        </button>

        <span className={styles.sidebarSectionTitle}>Quiz History</span>

        <div className={styles.historyList}>
          {quizHistory.length === 0 ? (
            <div className={styles.noHistory}>
              <BarChart2 size={22} strokeWidth={1.5} />
              <p>Complete a quiz to see history</p>
            </div>
          ) : (
            quizHistory.map((attempt) => {
              const pct = Math.round((attempt.score / attempt.totalQuestions) * 100);
              const topic = buildTopic(attempt.originalNotes || '');
              return (
                <div
                  key={attempt.id}
                  className={styles.historyItem}
                  onClick={() => handleReplayAttempt(attempt)}
                >
                  <div className={styles.historyItemMain}>
                    <span className={styles.historyTopic}>{topic}</span>
                    <span className={styles.historyDate}>{attempt.date}</span>
                  </div>
                  <div className={styles.historyItemRight}>
                    <span className={`${styles.scoreBadge} ${scoreColor(pct)}`}>
                      {pct}%
                    </span>
                    <button
                      className={styles.deleteHistoryBtn}
                      onClick={(e) => handleDeleteAttempt(attempt.id, e)}
                      title="Remove attempt"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* ========== MAIN CONTENT ========== */}
      <div className={styles.content}>
        {questions.length === 0 && !isLoading ? (
          /* Setup card */
          <div className={styles.setupCard}>
            <div className={styles.titleRow}>
              <h3 className={styles.cardTitle}>
                {currentTopic ? `📝 ${currentTopic}` : 'Quiz Mode Generator'}
              </h3>
              <button className={styles.useContextBtn} onClick={handleUseContextNotes}>
                <FolderHeart size={14} />
                <span>Use context</span>
              </button>
            </div>

            <textarea
              className={styles.textarea}
              placeholder="Paste your study notes here to auto-generate customized mock exams..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            <div className={styles.controlsGrid}>
              <div className={styles.controlGroup}>
                <label className={styles.label}>Questions</label>
                <select className={styles.select} value={count} onChange={(e) => setCount(parseInt(e.target.value, 10))}>
                  <option value={5}>5 Questions</option>
                  <option value={10}>10 Questions</option>
                  <option value={15}>15 Questions</option>
                  <option value={20}>20 Questions</option>
                </select>
              </div>

              <div className={styles.controlGroup}>
                <label className={styles.label}>Type</label>
                <select className={styles.select} value={type} onChange={(e) => setType(e.target.value as any)}>
                  <option value="mcq">MCQ Only</option>
                  <option value="tf">True / False</option>
                  <option value="mixed">Mixed Types</option>
                </select>
              </div>

              <div className={styles.controlGroup}>
                <label className={styles.label}>Difficulty</label>
                <select className={styles.select} value={difficulty} onChange={(e) => setDifficulty(e.target.value as any)}>
                  <option value="easy">Easy Review</option>
                  <option value="medium">Medium Clinical</option>
                  <option value="hard">Hard Pathophysiological</option>
                  <option value="mixed">Mixed Levels</option>
                </select>
              </div>
            </div>

            <button className={styles.generateBtn} onClick={handleGenerate} disabled={isLoading || !notes.trim()}>
              <Sparkles size={16} />
              <span>Generate Mock Quiz</span>
            </button>
          </div>

        ) : isLoading ? (
          /* Loading skeleton */
          <div className={styles.setupCard} style={{ textAlign: 'center', padding: '3rem 2rem' }}>
            <div className="skeleton skeleton-title" style={{ width: '50%', margin: '0 auto 1.5rem auto', height: '1.5rem' }} />
            <div className="skeleton skeleton-line" style={{ width: '80%', margin: '0 auto 0.75rem auto' }} />
            <div className="skeleton skeleton-line" style={{ width: '85%', margin: '0 auto 0.75rem auto' }} />
            <div className="skeleton skeleton-line" style={{ width: '60%', margin: '0 auto 1.5rem auto' }} />
            <p style={{ fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Compiling your medical questions... breathe in, breathe out! 📚🩺
            </p>
          </div>

        ) : isCompleted ? (
          /* Results screen */
          <div className={styles.resultsCard}>
            <div className={styles.scoreCircle}>
              <span className={styles.scoreValue}>{finalScoreVal}/{questions.length}</span>
              <span className={styles.scoreLabel}>Score</span>
            </div>

            <div>
              <h3 className={styles.resultsTitle}>
                {finalScoreVal === questions.length ? 'Perfect Exam! 🌟' : 'Exam Completed!'}
              </h3>
              <p className={styles.resultsSub}>{getResultsFeedback(finalScorePct)}</p>
            </div>

            {personalBest !== null && (
              <div className={styles.personalBest}>
                🏆 Personal Best: {personalBest} correct answers
              </div>
            )}

            <div className={styles.resultsActions}>
              <button className={`${styles.actionBtn} ${styles.secondaryAction}`} onClick={handleNewQuiz}>
                Study New Topic
              </button>
              <button className={`${styles.actionBtn} ${styles.primaryAction}`} onClick={handleGenerate}>
                Try Again
              </button>
            </div>

            {missedQuestions.length > 0 && (
              <div className={styles.missedSection}>
                <button className={styles.missedHeader} onClick={() => setShowMissedList(!showMissedList)}>
                  <span>Review Missed Questions ({missedQuestions.length})</span>
                  {showMissedList ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {showMissedList && (
                  <div className={styles.missedList}>
                    {missedQuestions.map((mq, index) => (
                      <div key={index} className={styles.missedCard}>
                        <div className={styles.missedQText}>{mq.question}</div>
                        <div className={styles.missedAnswerDetails}>
                          <div>❌ Your choice: <span style={{ color: 'var(--color-blush)', fontWeight: 600 }}>{mq.selectedAnswer}</span></div>
                          <div>✅ Correct: <span style={{ color: 'var(--color-teal)', fontWeight: 600 }}>{mq.correctAnswer}</span></div>
                          <div style={{ marginTop: '0.5rem', fontStyle: 'italic', fontSize: '0.8rem' }}>💡 {mq.explanation}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>

        ) : (
          /* Play zone quiz questions */
          <div className={styles.playZone}>
            <div className={styles.quizHeader}>
              <span className={styles.quizTitle}>{currentTopic || "Baby's Quiz Room"}</span>
              <button className={styles.exitBtn} onClick={handleNewQuiz}>
                Exit Quiz
              </button>
            </div>

            <div className={styles.questionCard}>
              <div className={styles.progressBarWrapper} title={`Question ${currentQIndex + 1} of ${questions.length}`}>
                <div className={styles.progressBar} style={{ width: `${progressPercent}%` }} />
              </div>

              <div className={styles.questionMeta}>Question {currentQIndex + 1} of {questions.length}</div>

              <div className={styles.questionText}>{questions[currentQIndex]?.question}</div>

              <div className={styles.optionsGrid}>
                {questions[currentQIndex]?.options.map((option, idx) => {
                  const isSelected = selectedOption === idx;
                  const isCorrect = idx === questions[currentQIndex].correctIndex;
                  let optionStyleClass = '';
                  if (isAnswered) {
                    if (isCorrect) optionStyleClass = styles.optionCorrect;
                    else if (isSelected) optionStyleClass = styles.optionWrong;
                  }
                  return (
                    <button
                      key={idx}
                      className={`${styles.optionBtn} ${optionStyleClass}`}
                      onClick={() => handleOptionSelect(idx)}
                      disabled={isAnswered}
                    >
                      <span>{option}</span>
                      {isAnswered && isCorrect && <Check size={16} />}
                      {isAnswered && isSelected && !isCorrect && <CloseIcon size={16} />}
                    </button>
                  );
                })}
              </div>

              {isAnswered && (
                <div className={styles.explanationCard}>
                  <span className={styles.explanationTitle}>Clinical Rationale</span>
                  <span className={styles.explanationText}>{questions[currentQIndex]?.explanation}</span>
                </div>
              )}

              {isAnswered && (
                <button className={styles.nextBtn} onClick={handleNext}>
                  <span>{currentQIndex === questions.length - 1 ? 'Finish Quiz' : 'Next Question'}</span>
                  <ArrowRight size={16} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
