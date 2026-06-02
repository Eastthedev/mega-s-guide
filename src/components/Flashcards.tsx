'use client';

import React, { useState, useEffect } from 'react';
import { 
  Sparkles, BookOpen, HelpCircle, ArrowLeft, ArrowRight, 
  RotateCw, Shuffle, Save, FolderHeart, Award, Heart, Plus, Trash2, Eye, X
} from 'lucide-react';
import { generateFlashcards, Flashcard } from '../utils/gemini';
import { getSavedDecks, saveFlashcardDeck, deleteFlashcardDeck, SavedDeck, syncCurrentStats } from '../utils/supabase';
import confetti from 'canvas-confetti';
import styles from './Flashcards.module.css';

interface FlashcardsProps {
  onAddToast: (message: string) => void;
  initialNotes?: string;
}

export default function Flashcards({ onAddToast, initialNotes }: FlashcardsProps) {
  const [notes, setNotes] = useState('');
  const [count, setCount] = useState<number>(10);
  const [focusArea, setFocusArea] = useState('');
  
  // Active study deck
  const [activeDeckId, setActiveDeckId] = useState<string | null>(null);
  const [activeDeckTitle, setActiveDeckTitle] = useState<string>('');
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [grades, setGrades] = useState<Record<number, 'easy' | 'hard' | 'review'>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // Deck history
  const [savedDecks, setSavedDecks] = useState<SavedDeck[]>([]);
  const [previewDeck, setPreviewDeck] = useState<SavedDeck | null>(null);

  // Only pre-fill if notes are passed via shortcut navigation (e.g. from Summary → Flashcards)
  useEffect(() => {
    if (initialNotes) {
      setNotes(initialNotes);
    }
  }, [initialNotes]);

  // Load saved decks on mount
  const loadSavedDecks = async () => {
    const decks = await getSavedDecks();
    setSavedDecks(decks);
  };

  useEffect(() => {
    loadSavedDecks();
  }, []);

  const handleGenerate = async () => {
    if (!notes.trim()) return;

    setIsLoading(true);
    setCards([]);
    setCurrentIndex(0);
    setIsFlipped(false);
    setGrades({});
    setIsCompleted(false);

    // Save global context
    localStorage.setItem('megas_guide_study_context', notes);

    // Create unique ID and title for this new deck
    const deckId = 'deck_' + Math.random().toString(36).substring(2, 15);
    const titleText = notes.trim().split('\n')[0].substring(0, 35) || 'Flashcard Deck';
    const cleanTitle = titleText.replace(/[#*]/g, '').trim() + '...';

    try {
      const generatedCards = await generateFlashcards(notes, count, focusArea);
      if (generatedCards.length === 0) {
        throw new Error("No flashcards could be parsed.");
      }
      
      setCards(generatedCards);
      setActiveDeckId(deckId);
      setActiveDeckTitle(cleanTitle);
      
      onAddToast(`Generated ${generatedCards.length} flashcards! 🃏`);
      const saved = await saveFlashcardDeck(deckId, cleanTitle, { cards: generatedCards, grades: {} }, notes);
      if (saved) {
        await loadSavedDecks();
      } else {
        onAddToast("Failed to save generated deck to database. ❌");
      }
    } catch (err: any) {
      console.error(err);
      onAddToast(`Error creating flashcards: ${err.message || 'Check your configuration.'}`);
      setCards([
        { 
          front: "Something went wrong generating the cards. Shall we try again?", 
          back: "Double check your API key by clicking the gear icon in the top right! 💙" 
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGrade = async (grade: 'easy' | 'hard' | 'review') => {
    const updatedGrades = { ...grades, [currentIndex]: grade };
    setGrades(updatedGrades);

    let emoji = '✅';
    if (grade === 'hard') emoji = '🔴';
    if (grade === 'review') emoji = '🟡';
    onAddToast(`Marked card as ${grade.toUpperCase()} ${emoji}`);

    // Auto-save progress state
    if (activeDeckId) {
      const saved = await saveFlashcardDeck(activeDeckId, activeDeckTitle, { cards, grades: updatedGrades }, notes);
      if (!saved) {
        onAddToast("Failed to save progress to database. ❌");
      }
    }

    const totalGradesCount = Object.keys(updatedGrades).length;
    if (totalGradesCount === cards.length) {
      setTimeout(async () => {
        setIsCompleted(true);
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 }
        });
        
        localStorage.setItem('megas_guide_deck_finished', 'true');
        onAddToast("Baby! You completed the full deck! 🩺🔥");
        await syncCurrentStats();
      }, 600);
    } else {
      setTimeout(() => {
        handleNext();
      }, 500);
    }
  };

  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  };

  const handleShuffle = () => {
    if (cards.length <= 1) return;
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    setGrades({});
    onAddToast("Deck shuffled! Let's review again. 🔀");
  };

  const handleSaveDeck = async () => {
    if (cards.length === 0 || !activeDeckId) return;
    const success = await saveFlashcardDeck(activeDeckId, activeDeckTitle, { cards, grades }, notes);
    if (success) {
      onAddToast("Flashcard deck saved! 📂❤️");
      await loadSavedDecks();
    } else {
      onAddToast("Error saving flashcard deck. 💙");
    }
  };

  // Switch active study deck
  const handleSelectDeck = (deck: SavedDeck) => {
    setActiveDeckId(deck.id || null);
    setActiveDeckTitle(deck.title || '');
    setCards(deck.cards);
    setGrades(deck.grades || {});
    setNotes(deck.original_notes || '');
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsCompleted(false);
    onAddToast(`Loaded Deck: "${deck.title}" 📚`);
  };

  // Exit study session and return to generator
  const handleNewDeck = () => {
    setActiveDeckId(null);
    setActiveDeckTitle('');
    setCards([]);
    setGrades({});
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsCompleted(false);
  };

  // Delete saved deck
  const handleDeleteDeck = async (deckId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteFlashcardDeck(deckId);
      onAddToast("Flashcard deck deleted. 🧹");
      await loadSavedDecks();
      
      if (activeDeckId === deckId) {
        handleNewDeck();
      }
    } catch (err) {
      console.error(err);
      onAddToast("Failed to delete deck. 💙");
    }
  };

  const handleUseContextNotes = () => {
    const contextNotes = localStorage.getItem('megas_guide_study_context') || '';
    if (contextNotes) {
      setNotes(contextNotes);
      onAddToast("Pre-filled notes from study context! 📂");
    } else {
      onAddToast("No active study context found. Paste notes below.");
    }
  };

  const gradedCount = Object.keys(grades).length;
  const progressPercent = cards.length > 0 ? (gradedCount / cards.length) * 100 : 0;

  const currentGrade = grades[currentIndex];
  let gradeBorderClass = '';
  if (currentGrade === 'easy') gradeBorderClass = styles.cardEasy;
  if (currentGrade === 'hard') gradeBorderClass = styles.cardHard;
  if (currentGrade === 'review') gradeBorderClass = styles.cardReview;

  return (
    <div className={styles.wrapper}>
      {/* Sidebar history list */}
      <div className={styles.sidebar}>
        <button className={styles.newDeckBtn} onClick={handleNewDeck}>
          <Plus size={16} />
          <span>New Deck</span>
        </button>

        <div className={styles.deckList}>
          <span className={styles.sidebarSectionTitle}>Saved Decks</span>
          {savedDecks.length === 0 ? (
            <div className={styles.noHistory}>
              <p>No saved decks yet</p>
            </div>
          ) : (
            savedDecks.map((deck) => {
              const isActive = deck.id === activeDeckId;
              return (
                <div
                  key={deck.id}
                  className={`${styles.sidebarItem} ${isActive ? styles.activeSidebarItem : ''}`}
                  onClick={() => handleSelectDeck(deck)}
                >
                  <div className={styles.deckTitleWrapper}>
                    <BookOpen size={14} className={isActive ? 'text-teal' : 'text-muted'} />
                    <div className={styles.deckMetaText}>
                      <span className={styles.deckTitle}>{deck.title}</span>
                      <span className={styles.deckCount}>{deck.cards.length} cards</span>
                    </div>
                  </div>
                  
                  <div className={styles.sidebarActions}>
                    <button
                      className={styles.viewDeckBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewDeck(deck);
                      }}
                      title="Preview Card Details"
                      aria-label="Preview Deck"
                    >
                      <Eye size={13} />
                    </button>
                    <button
                      className={styles.deleteDeckBtn}
                      onClick={(e) => handleDeleteDeck(deck.id || '', e)}
                      title="Delete Deck"
                      aria-label="Delete Deck"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Flashcard display area */}
      <div className={styles.content}>
        {cards.length === 0 && !isLoading ? (
          /* Setup screen */
          <div className={styles.setupCard}>
            <div className={styles.titleRow}>
              <h3 className={styles.cardTitle}>Flashcard Deck Generator</h3>
              <button className={styles.useContextBtn} onClick={handleUseContextNotes}>
                <FolderHeart size={14} />
                <span>Use active study context</span>
              </button>
            </div>

            <textarea
              className={styles.textarea}
              placeholder="Paste your study notes here to auto-generate active-recall flashcards..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            <div className={styles.controlsRow}>
              <div className={styles.controlGroup}>
                <label className={styles.label}>Number of cards</label>
                <select 
                  className={styles.select}
                  value={count} 
                  onChange={(e) => setCount(parseInt(e.target.value, 10))}
                >
                  <option value={5}>5 Cards</option>
                  <option value={10}>10 Cards</option>
                  <option value={15}>15 Cards</option>
                  <option value={20}>20 Cards</option>
                </select>
              </div>

              <div className={styles.controlGroup}>
                <label className={styles.label}>Focus Area (Optional)</label>
                <input
                  type="text"
                  className={styles.textInput}
                  placeholder="e.g., pharmacology, anatomy..."
                  value={focusArea}
                  onChange={(e) => setFocusArea(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button
                className={styles.generateBtn}
                onClick={handleGenerate}
                disabled={isLoading || !notes.trim()}
              >
                <Sparkles size={16} />
                <span>Generate Flashcards</span>
              </button>
            </div>
          </div>
        ) : isLoading ? (
          /* Loading skeleton */
          <div className={styles.setupCard} style={{ textAlign: 'center', padding: '3rem 2rem' }}>
            <div className="skeleton skeleton-title" style={{ width: '40%', margin: '0 auto 1.5rem auto', height: '1.5rem' }} />
            <div className="skeleton skeleton-line" style={{ width: '80%', margin: '0 auto 0.75rem auto' }} />
            <div className="skeleton skeleton-line" style={{ width: '90%', margin: '0 auto 0.75rem auto' }} />
            <div className="skeleton skeleton-line" style={{ width: '70%', margin: '0 auto 1.5rem auto' }} />
            <p style={{ fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Writing your flashcards... almost there Baby! 🗂️💕
            </p>
          </div>
        ) : isCompleted ? (
          /* Completion screen */
          <div className={styles.completionCard}>
            <div className="avatar" style={{ background: 'var(--color-blush-light)', color: 'var(--color-blush)', width: '3.5rem', height: '3.5rem', marginBottom: '1.5rem' }}>
              <Award size={32} />
            </div>
            <div>
              <h3 className={styles.completionTitle}>Full Deck Reviewed!</h3>
              <p className={styles.completionSub}>
                Baby, you're unstoppable! Every flashcard you finish is another step towards acing that exam. 🩺❤️
              </p>
            </div>
            
            <div className={styles.difficultyTags} style={{ display: 'flex', justifyContent: 'center', width: '100%', gap: '1rem', margin: '1.5rem 0' }}>
              <span className={`${styles.diffTag} ${styles.diffEasy}`}>
                Easy: {Object.values(grades).filter(g => g === 'easy').length}
              </span>
              <span className={`${styles.diffTag} ${styles.diffReview}`}>
                Review: {Object.values(grades).filter(g => g === 'review').length}
              </span>
              <span className={`${styles.diffTag} ${styles.diffHard}`}>
                Hard: {Object.values(grades).filter(g => g === 'hard').length}
              </span>
            </div>

            <button 
              className={styles.restartBtn}
              onClick={handleNewDeck}
            >
              Study New Topic 📚
            </button>
          </div>
        ) : (
          /* Play zone */
          <div className={styles.playZone}>
            <div className={styles.deckHeader}>
              <div className={styles.deckTitle}>{activeDeckTitle || 'Reviewing Deck'}</div>
              <div className={styles.deckActions}>
                <button className={styles.deckBtn} onClick={handleShuffle} title="Shuffle Card Deck">
                  <Shuffle size={14} />
                  <span>Shuffle</span>
                </button>
                <button className={styles.deckBtn} onClick={handleSaveDeck} title="Save Deck State">
                  <Save size={14} />
                  <span>Save Deck</span>
                </button>
                <button className={styles.deckBtn} onClick={handleNewDeck} title="Exit Study Player">
                  <span>Exit Deck</span>
                </button>
              </div>
            </div>

            <div className={styles.cardContainer}>
              <span className={styles.cardMetadata}>
                Card {currentIndex + 1} of {cards.length}
              </span>

              {/* 3D Flipping container */}
              <div 
                className="flashcard-wrapper"
                onClick={() => setIsFlipped(!isFlipped)}
              >
                <div className={`flashcard-inner ${isFlipped ? 'flipped' : ''}`}>
                  {/* Front Side */}
                  <div className={`flashcard-front ${gradeBorderClass}`}>
                    <span className={styles.frontLabel}>Question / Presentation</span>
                    <div className={styles.flashcardText}>
                      {cards[currentIndex]?.front}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <RotateCw size={10} /> Click card to reveal answer
                    </span>
                  </div>

                  {/* Back Side */}
                  <div className={`flashcard-back ${gradeBorderClass}`}>
                    <span className={styles.backLabel}>Answer / Definition</span>
                    <div className={styles.flashcardText}>
                      {cards[currentIndex]?.back}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <RotateCw size={10} /> Click to view question
                    </span>
                  </div>
                </div>
              </div>

              {/* difficulty rating tags */}
              {grades[currentIndex] && (
                <div className={styles.difficultyTags} style={{ marginTop: '1rem' }}>
                  <span className={`
                    ${styles.diffTag} 
                    ${grades[currentIndex] === 'easy' ? styles.diffEasy : ''}
                    ${grades[currentIndex] === 'hard' ? styles.diffHard : ''}
                    ${grades[currentIndex] === 'review' ? styles.diffReview : ''}
                  `}>
                    Marked: {grades[currentIndex].toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Grader buttons */}
            <div className={styles.gradeControls}>
              <span className={styles.gradeLabel}>How well did you know this card?</span>
              <div className={styles.gradeButtons}>
                <button
                  className={`${styles.gradeBtn} ${styles.btnHard} ${grades[currentIndex] === 'hard' ? styles.btnHardActive : ''}`}
                  onClick={() => handleGrade('hard')}
                >
                  🔴 Hard (Needs review)
                </button>
                <button
                  className={`${styles.gradeBtn} ${styles.btnReview} ${grades[currentIndex] === 'review' ? styles.btnReviewActive : ''}`}
                  onClick={() => handleGrade('review')}
                >
                  🟡 So-So (Review later)
                </button>
                <button
                  className={`${styles.gradeBtn} ${styles.btnEasy} ${grades[currentIndex] === 'easy' ? styles.btnEasyActive : ''}`}
                  onClick={() => handleGrade('easy')}
                >
                  ✅ Got it! (Easy)
                </button>
              </div>
            </div>

            {/* Deck Steppers & Progress */}
            <div style={{ width: '100%', marginTop: '1.5rem' }}>
              <div className={styles.navigationRow}>
                <button 
                  className={styles.navArrowBtn} 
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                >
                  <ArrowLeft size={14} />
                  <span>Prev Card</span>
                </button>
                <button 
                  className={styles.navArrowBtn} 
                  onClick={handleNext}
                  disabled={currentIndex === cards.length - 1}
                >
                  <span>Next Card</span>
                  <ArrowRight size={14} />
                </button>
              </div>

              <div className={styles.progressBarWrapper} title={`Reviewed ${gradedCount}/${cards.length} cards`}>
                <div 
                  className={styles.progressBar} 
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Preview All Cards Modal Dialog */}
      {previewDeck && (
        <div className={styles.modalOverlay} onClick={() => setPreviewDeck(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h3 className={styles.modalTitle}>{previewDeck.title}</h3>
                <span className={styles.modalSubtitle}>Total cards generated: {previewDeck.cards.length}</span>
              </div>
              <button className={styles.closeModalBtn} onClick={() => setPreviewDeck(null)}>
                <X size={20} />
              </button>
            </div>
            
            <div className={styles.modalBody}>
              <div className={styles.cardsGrid}>
                {previewDeck.cards.map((card, idx) => {
                  const grade = previewDeck.grades?.[idx];
                  let cardGradeStyle = '';
                  if (grade === 'easy') cardGradeStyle = styles.modalCardEasy;
                  if (grade === 'hard') cardGradeStyle = styles.modalCardHard;
                  if (grade === 'review') cardGradeStyle = styles.modalCardReview;

                  return (
                    <div key={idx} className={`${styles.modalCardRow} ${cardGradeStyle}`}>
                      <div className={styles.modalCardIndex}>Card #{idx + 1}</div>
                      <div className={styles.modalCardSide}>
                        <strong className={styles.modalCardLabel}>Front:</strong>
                        <p>{card.front}</p>
                      </div>
                      <div className={styles.modalCardSide}>
                        <strong className={styles.modalCardLabel}>Back:</strong>
                        <p>{card.back}</p>
                      </div>
                      {grade && (
                        <div className={styles.modalCardStatus}>
                          Status: <span className={styles[`diff${grade.charAt(0).toUpperCase() + grade.slice(1)}`]}>{grade.toUpperCase()}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
