'use client';

import React, { useState, useEffect } from 'react';
import { Menu, Sun, Moon, Settings, Key, Check, LogOut } from 'lucide-react';
import { getStoredApiKey, setStoredApiKey, DEFAULT_API_KEY } from '../utils/gemini';
import { supabase } from '../utils/supabase';
import styles from './TopBar.module.css';

interface TopBarProps {
  currentSection: string;
  onToggleSidebar: () => void;
  onAddToast: (message: string) => void;
  hideActions?: boolean;
}

const ENCOURAGING_LABELS = [
  "You're doing amazing 💪",
  "You've got this, future doctor! 🩺",
  "Every page you read counts! 📚",
  "Baby, you are unstoppable! 🔥",
  "One step closer to saving lives. 💙",
  "Keep up the brilliant work! 🌟"
];

export default function TopBar({ currentSection, onToggleSidebar, onAddToast, hideActions }: TopBarProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [label, setLabel] = useState("You're doing amazing 💪");
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Check initial user session
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    // Listen for session updates
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    onAddToast("Signed out successfully! See you soon, doctor! 🩺💙");
  };

  // Read theme and key on load
  useEffect(() => {
    // Label picker
    const randomLabel = ENCOURAGING_LABELS[Math.floor(Math.random() * ENCOURAGING_LABELS.length)];
    setLabel(randomLabel);

    // Theme setup
    const savedTheme = localStorage.getItem('megas_guide_theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme === 'dark' || (!savedTheme && systemPrefersDark) ? 'dark' : 'light';
    
    setTheme(initialTheme);
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Prefill API Key
    setApiKey(getStoredApiKey());
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
    onAddToast(`Switched to ${nextTheme === 'light' ? 'Light' : 'Dark'} Mode 💡`);
  };

  const handleSaveApiKey = () => {
    setStoredApiKey(apiKey);
    setIsSettingsOpen(false);
    onAddToast("Gemini API Key updated successfully! 🔑");
  };

  const handleResetApiKey = () => {
    setApiKey(DEFAULT_API_KEY);
    setStoredApiKey(DEFAULT_API_KEY);
    setIsSettingsOpen(false);
    onAddToast("API Key reset to default study server key! 🩺");
  };

  const formatTitle = (section: string) => {
    if (section === 'explain') return 'Detailed Explanation';
    if (section === 'summarize') return 'Note Summary';
    if (section === 'chat') return 'AI Study Chat';
    return section.charAt(0).toUpperCase() + section.slice(1);
  };

  return (
    <header className={styles.topBar}>
      <div className={styles.leftSection}>
        <button 
          className={styles.hamburger} 
          onClick={onToggleSidebar} 
          aria-label="Toggle Navigation"
        >
          <Menu size={24} />
        </button>
        <h2 className={styles.sectionTitle}>{formatTitle(currentSection)}</h2>
        <span className={styles.encourageLabel}>{label}</span>
      </div>

      {!hideActions && (
        <div className={styles.rightSection}>
          <div className={styles.apiKeyBadge}>
            <Key size={14} />
            <span>API Active</span>
          </div>

          <button 
            className={styles.iconBtn} 
            onClick={toggleTheme} 
            aria-label="Toggle Theme"
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          <button 
            className={styles.iconBtn} 
            onClick={() => {
              setApiKey(getStoredApiKey());
              setIsSettingsOpen(true);
            }} 
            aria-label="API Settings"
          >
            <Settings size={18} />
          </button>

          {user && (
            <button 
              className={styles.iconBtn} 
              onClick={handleSignOut} 
              title={`Sign Out (${user.email})`}
              aria-label="Sign Out"
            >
              <LogOut size={18} />
            </button>
          )}
        </div>
      )}

      {isSettingsOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsSettingsOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>
              <Settings size={20} className="text-teal" />
              API Credentials
            </h3>
            <p className={styles.modalText}>
              By default, Mega's Guide is pre-configured with a shared API key so you can start studying immediately without setups! If you wish to use your own Google Gemini Key, edit it below.
            </p>
            
            <div className={styles.inputGroup}>
              <label className={styles.label}>Gemini API Key</label>
              <input 
                type="password" 
                className={styles.input} 
                value={apiKey} 
                onChange={(e) => setApiKey(e.target.value)} 
                placeholder="Enter Gemini API Key (starts with AIzaSy...)"
              />
            </div>

            <div className={styles.btnGroup}>
              <button className={styles.cancelBtn} onClick={handleResetApiKey}>
                Use Default Key
              </button>
              <button className={styles.saveBtn} onClick={handleSaveApiKey}>
                Save Key
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
