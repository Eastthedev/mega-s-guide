'use client';

import React, { useState } from 'react';
import { Heart } from 'lucide-react';
import { getRandomLoveQuote } from '../utils/quotes';
import styles from './LoveButton.module.css';

export default function LoveButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [quote, setQuote] = useState('');

  const handleOpen = () => {
    setQuote(getRandomLoveQuote());
    setIsOpen(true);
  };

  return (
    <>
      <button 
        className={styles.floatingHeart} 
        onClick={handleOpen} 
        aria-label="A little love note"
      >
        <Heart className="pulsing-heart" fill="white" size={24} />
      </button>

      {isOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>A Note for You 💕</div>
            <div className={styles.modalBody}>
              <div className={styles.quoteText}>"{quote}"</div>
              <div className={styles.signature}>~ Mega</div>
            </div>
            <button className={styles.closeBtn} onClick={() => setIsOpen(false)}>
              Keep Studying 🩺
            </button>
          </div>
        </div>
      )}
    </>
  );
}
