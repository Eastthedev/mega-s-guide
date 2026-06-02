'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Copy, BookOpen, FileText, Heart, Plus, Trash2, Check, Brain, X as CloseIcon } from 'lucide-react';
import { generateExplanation } from '../utils/gemini';
import { getExplanationHistory, saveExplanation, deleteExplanation, ExplanationItem } from '../utils/supabase';
import { marked } from 'marked';
import styles from './DetailedExplanation.module.css';

interface DetailedExplanationProps {
  onAddToast: (message: string) => void;
}

type Mode = 'topic' | 'passage';
type Depth = 'simple' | 'standard' | 'deep';

export default function DetailedExplanation({ onAddToast }: DetailedExplanationProps) {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('topic');
  const [input, setInput] = useState('');
  const [depth, setDepth] = useState<Depth>('standard');
  const [explanation, setExplanation] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeTitle, setActiveTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const [history, setHistory] = useState<ExplanationItem[]>([]);
  const mainRef = useRef<HTMLDivElement>(null);

  const loadHistory = async () => {
    const items = await getExplanationHistory();
    setHistory(items);
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const buildTitle = (text: string, m: Mode) => {
    if (m === 'topic') return text.trim().substring(0, 50) || 'Explanation';
    return text.trim().split('\n')[0].substring(0, 50).replace(/[#*]/g, '').trim() || 'Passage Explanation';
  };

  const handleExplain = async () => {
    if (!input.trim()) return;

    setIsHistoryOpen(false);
    setIsLoading(true);
    setExplanation('');

    const sessionId = 'exp_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    const title = buildTitle(input, mode);

    try {
      const result = await generateExplanation(input, mode, depth);
      setExplanation(result);
      setActiveId(sessionId);
      setActiveTitle(title);

      onAddToast('Explanation generated! You got this! 🧠✨');

      const count = parseInt(localStorage.getItem('megas_guide_sessions_count') || '0', 10);
      localStorage.setItem('megas_guide_sessions_count', (count + 1).toString());

      // Auto-save to Supabase
      const item: ExplanationItem = {
        id: sessionId,
        title,
        mode,
        depth,
        input,
        explanationText: result,
        createdAt: new Date().toISOString(),
      };
      await saveExplanation(item);
      await loadHistory();

      setTimeout(() => {
        mainRef.current?.scrollTo({ top: mainRef.current.scrollHeight, behavior: 'smooth' });
      }, 100);
    } catch (err: any) {
      console.error(err);
      onAddToast(`Error explaining: ${err.message || 'Please check your connection.'}`);
      setExplanation("Sorry Baby, I couldn't generate an explanation right now. Check your API key or connection and let's try again! 💙");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadItem = (item: ExplanationItem) => {
    setIsHistoryOpen(false);
    setMode(item.mode);
    setInput(item.input);
    setDepth(item.depth);
    setExplanation(item.explanationText);
    setActiveId(item.id);
    setActiveTitle(item.title);
    onAddToast(`Loaded: "${item.title}"`);
    setTimeout(() => {
      mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
  };

  const handleDeleteItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteExplanation(id);
    await loadHistory();
    if (activeId === id) handleNewExplanation();
    onAddToast('Explanation deleted. 🧹');
  };

  const handleNewExplanation = () => {
    setIsHistoryOpen(false);
    setInput('');
    setExplanation('');
    setActiveId(null);
    setActiveTitle('');
  };

  const handleCopyToClipboard = () => {
    if (!explanation) return;
    navigator.clipboard.writeText(explanation);
    setCopied(true);
    onAddToast('Explanation copied to clipboard! 📋');
    setTimeout(() => setCopied(false), 2000);
  };

  const renderExplanationHtml = () => {
    try {
      const rawHtml = marked.parse(explanation) as string;
      return <div className="markdown-content" dangerouslySetInnerHTML={{ __html: rawHtml }} />;
    } catch {
      return <p>{explanation}</p>;
    }
  };

  const depthLabel: Record<Depth, string> = {
    simple: '🌱 Simple',
    standard: '🩺 Standard',
    deep: '🔬 Deep Dive',
  };

  return (
    <div className={styles.wrapper}>
      {/* Mobile Backdrop Overlay */}
      {isHistoryOpen && (
        <div className={styles.sidebarOverlay} onClick={() => setIsHistoryOpen(false)} />
      )}

      {/* ========== SIDEBAR ========== */}
      <aside className={`${styles.sidebar} ${isHistoryOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarMobileHeader}>
          <span>Explanation History</span>
          <button className={styles.closeSidebarBtn} onClick={() => setIsHistoryOpen(false)}>
            <CloseIcon size={18} />
          </button>
        </div>

        <button className={styles.newExplainBtn} onClick={handleNewExplanation}>
          <Plus size={16} />
          <span>New Explanation</span>
        </button>

        <span className={styles.sidebarSectionTitle}>Explanation History</span>

        <div className={styles.historyList}>
          {history.length === 0 ? (
            <div className={styles.noHistory}>
              <Brain size={22} strokeWidth={1.5} />
              <p>No saved explanations yet</p>
            </div>
          ) : (
            history.map((item) => {
              const isActive = item.id === activeId;
              return (
                <div
                  key={item.id}
                  className={`${styles.historyItem} ${isActive ? styles.activeHistoryItem : ''}`}
                  onClick={() => handleLoadItem(item)}
                >
                  <div className={styles.historyMain}>
                    <FileText size={12} style={{ flexShrink: 0 }} />
                    <div className={styles.historyMeta}>
                      <span className={styles.historyTitle}>{item.title}</span>
                      <span className={styles.historyModeDepth}>
                        {item.mode === 'topic' ? '📌 Topic' : '📄 Passage'} · {depthLabel[item.depth]}
                      </span>
                    </div>
                  </div>
                  <button
                    className={styles.deleteHistoryBtn}
                    onClick={(e) => handleDeleteItem(item.id, e)}
                    title="Delete"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* ========== MAIN CONTENT ========== */}
      <div className={styles.content} ref={mainRef}>
        {/* Mobile History Toggle Bar */}
        <div className={styles.mobileHistoryBar}>
          <button className={styles.mobileHistoryBtn} onClick={() => setIsHistoryOpen(true)}>
            <Brain size={15} />
            <span>Explain History</span>
          </button>
          <span className={styles.mobileActiveTitle}>
            {activeTitle || 'New Explanation'}
          </span>
        </div>
        {/* Input Card */}
        <div className={styles.inputCard}>
          {activeTitle && (
            <div className={styles.activeTitleBar}>
              <span>✏️ {activeTitle}</span>
            </div>
          )}

          <div className={styles.modeToggles}>
            <button
              className={`${styles.modeToggleBtn} ${mode === 'topic' ? styles.activeModeToggle : ''}`}
              onClick={() => { setMode('topic'); setInput(''); }}
            >
              <BookOpen size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
              Explain a Topic
            </button>
            <button
              className={`${styles.modeToggleBtn} ${mode === 'passage' ? styles.activeModeToggle : ''}`}
              onClick={() => { setMode('passage'); setInput(''); }}
            >
              <FileText size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
              Explain This Passage
            </button>
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>
              {mode === 'topic'
                ? 'Which medical topic should we break down?'
                : 'Paste the confusing paragraph or notes excerpt below:'}
            </label>
            {mode === 'topic' ? (
              <input
                type="text"
                className={styles.textInput}
                placeholder="e.g., renin-angiotensin-aldosterone system, hyperkalemia causes..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleExplain(); }}
              />
            ) : (
              <textarea
                className={styles.textareaInput}
                placeholder="Paste slide notes or a confusing paragraph here..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
            )}
          </div>

          <div className={styles.depthContainer}>
            <span className={styles.label}>Explanation Depth</span>
            <div className={styles.depthOptions}>
              {(['simple', 'standard', 'deep'] as Depth[]).map((d) => (
                <button
                  key={d}
                  className={`${styles.depthBtn} ${depth === d ? styles.activeDepth : ''}`}
                  onClick={() => setDepth(d)}
                >
                  {depthLabel[d]}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.actionRow}>
            <button
              className={styles.explainBtn}
              onClick={handleExplain}
              disabled={isLoading || !input.trim()}
            >
              <Sparkles size={16} />
              <span>{isLoading ? 'Explaining...' : 'Explain Concept'}</span>
            </button>
          </div>
        </div>

        {/* Skeleton */}
        {isLoading && (
          <div className={styles.outputCard}>
            <div className={styles.outputHeader}>
              <span className="skeleton skeleton-title" style={{ width: '50%', height: '1.25rem' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div className="skeleton skeleton-line" style={{ width: '95%' }} />
              <div className="skeleton skeleton-line" style={{ width: '92%' }} />
              <div className="skeleton skeleton-line" style={{ width: '85%' }} />
              <div className="skeleton skeleton-line" style={{ width: '90%' }} />
              <div className="skeleton skeleton-line" style={{ width: '75%' }} />
            </div>
            <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
              Consulting medical books... almost there! 🩺📖
            </p>
          </div>
        )}

        {/* Output */}
        {explanation && !isLoading && (
          <div className={`${styles.outputCard} paper-texture`}>
            <div className={styles.outputHeader}>
              <h4 className={styles.outputTitle}>
                {mode === 'topic' ? `Explanation: ${input.substring(0, 50)}` : 'Passage Decoded'}
              </h4>
              <button className={styles.copyBtn} onClick={handleCopyToClipboard} title="Copy to Clipboard">
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>

            {renderExplanationHtml()}

            <div className={styles.encouragingFooter}>
              <Heart size={16} fill="var(--color-blush)" className="pulsing-heart" />
              <span>See? You understood that. You're going to ace this. 💙</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
