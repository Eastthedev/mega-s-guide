'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, Sparkles, BookOpen, HelpCircle, Copy, 
  Save, Plus, Trash2, ArrowRight, FolderHeart, Check, X as CloseIcon,
  Paperclip
} from 'lucide-react';
import { generateSummary, parseDocument } from '../utils/gemini';
import { getNoteSummaries, saveNoteSummary, deleteNoteSummary, syncCurrentStats, SavedSummary } from '../utils/supabase';
import { marked } from 'marked';
import styles from './NoteSummary.module.css';

interface NoteSummaryProps {
  onAddToast: (message: string) => void;
  onJumpToTab: (tab: string, initialNotes?: string) => void;
  savedSummaries: SavedSummary[];
  activeId: string | null;
  setSavedSummaries: React.Dispatch<React.SetStateAction<SavedSummary[]>>;
  setActiveId: (id: string | null) => void;
}

const STYLE_OPTIONS = [
  { key: 'concise', label: '📋 Concise Bullets' },
  { key: 'detailed', label: '📖 Detailed Paragraphs' },
  { key: 'guide', label: '🗂️ Study Guide' },
  { key: 'facts', label: '⚡ Key Facts Only' },
] as const;

type SummaryStyle = typeof STYLE_OPTIONS[number]['key'];

export default function NoteSummary({ 
  onAddToast, 
  onJumpToTab,
  savedSummaries,
  activeId,
  setSavedSummaries,
  setActiveId
}: NoteSummaryProps) {
  const [notes, setNotes] = useState('');
  const [style, setStyle] = useState<SummaryStyle>('concise');
  const [summary, setSummary] = useState('');
  const [activeTitle, setActiveTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isParsing, setIsParsing] = useState(false);

  const mainRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    const originalNotes = notes;
    setNotes(`[Reading file: "${file.name}"... please wait 🩺🧠]`);

    try {
      const parsedText = await parseDocument(file);
      setNotes(parsedText);
      onAddToast(`Loaded document: "${file.name}"! 📂`);
    } catch (err: any) {
      console.error(err);
      setNotes(originalNotes);
      onAddToast(`Error reading document: ${err.message || 'Parsing failed.'} ❌`);
    } finally {
      setIsParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Load saved summaries helper for internal actions
  const loadSavedSummaries = async () => {
    const remote = await getNoteSummaries();
    setSavedSummaries(remote);
  };

  // Sync state whenever activeId or savedSummaries changes
  useEffect(() => {
    if (activeId) {
      const activeItem = savedSummaries.find(s => s.id === activeId);
      if (activeItem) {
        setNotes(activeItem.originalNotes);
        setSummary(activeItem.summaryText);
        setStyle(activeItem.style as SummaryStyle);
        setActiveTitle(activeItem.title);
        localStorage.setItem('megas_guide_study_context', activeItem.originalNotes);
      }
    } else {
      setNotes('');
      setSummary('');
      setActiveTitle('');
    }
  }, [activeId, savedSummaries]);

  const buildTitle = (text: string) => {
    const raw = text.trim().split('\n')[0].substring(0, 40) || 'Summary';
    return raw.replace(/[#*]/g, '').trim();
  };

  const handleGenerate = async () => {
    if (!notes.trim()) return;

    setIsLoading(true);
    setSummary('');
    localStorage.setItem('megas_guide_study_context', notes);

    // Build a fresh ID for this summary session
    const sessionId = 'sum_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
    const title = buildTitle(notes);

    try {
      const generated = await generateSummary(notes, style);
      setSummary(generated);
      setActiveId(sessionId);
      setActiveTitle(title);

      onAddToast('Summary generated successfully! 📝');

      // Track summaries count
      const sc = parseInt(localStorage.getItem('megas_guide_summaries_count') || '0', 10);
      localStorage.setItem('megas_guide_summaries_count', (sc + 1).toString());
      const count = parseInt(localStorage.getItem('megas_guide_sessions_count') || '0', 10);
      localStorage.setItem('megas_guide_sessions_count', (count + 1).toString());

      // Auto-save to supabase
      const newSummary: SavedSummary = {
        id: sessionId,
        title,
        summaryText: generated,
        originalNotes: notes,
        style,
        date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      };
      const saved = await saveNoteSummary(newSummary);
      if (saved) {
        await loadSavedSummaries();
        await syncCurrentStats();
      } else {
        onAddToast('Failed to auto-save summary to database. ❌');
      }

      // Scroll to output
      setTimeout(() => {
        mainRef.current?.scrollTo({ top: mainRef.current.scrollHeight, behavior: 'smooth' });
      }, 100);
    } catch (err: any) {
      console.error(err);
      onAddToast(`Error creating summary: ${err.message || 'Check your configuration.'}`);
      setSummary('Failed to generate summary. Please check your API Key or try again 💙');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSave = async () => {
    if (!summary.trim()) return;
    const sessionId = activeId || ('sum_' + Date.now().toString(36));
    const title = activeTitle || buildTitle(notes);
    const newSummary: SavedSummary = {
      id: sessionId,
      title,
      summaryText: summary,
      originalNotes: notes,
      style,
      date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    };
    const saved = await saveNoteSummary(newSummary);
    if (saved) {
      await loadSavedSummaries();
      onAddToast('Summary saved! 📂❤️');
    } else {
      onAddToast('Failed to save summary to database. ❌');
    }
  };

  const handleNewSummary = () => {
    setActiveId(null);
  };

  const handleCopyToClipboard = () => {
    if (!summary) return;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    onAddToast('Copied to clipboard! 📋');
    setTimeout(() => setCopied(false), 2000);
  };

  const renderSummaryHtml = () => {
    try {
      const rawHtml = marked.parse(summary) as string;
      return <div className="markdown-content" dangerouslySetInnerHTML={{ __html: rawHtml }} />;
    } catch {
      return <p>{summary}</p>;
    }
  };

  return (
    <div className={styles.wrapper}>
      {/* ============ MAIN AREA ============ */}
      <div className={styles.content} ref={mainRef}>

        {/* Input Card */}
        <div className={styles.inputCard}>
          <div className={styles.titleRow}>
            <h3 className={styles.cardTitle}>
              {activeTitle ? `✏️ ${activeTitle}` : 'Lecture Summarizer'}
            </h3>
            {summary && (
              <span className={styles.sessionBadge}>
                {style}
              </span>
            )}
          </div>

          <div className={styles.fileUploadRow}>
            <button 
              className={styles.uploadBtn}
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || isParsing}
            >
              <Paperclip size={14} />
              <span>{isParsing ? 'Reading file...' : 'Upload Document (.pdf, .docx, .pptx, .txt)'}</span>
            </button>
            <input 
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".pdf,.docx,.pptx,.txt,.md"
              style={{ display: 'none' }}
            />
          </div>

          <textarea
            className={styles.textarea}
            placeholder="Paste your lecture notes, textbook excerpt, or study material here..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isLoading || isParsing}
          />

          <div className={styles.selectorRow}>
            <span className={styles.selectorLabel}>Summary Format</span>
            <div className={styles.pills}>
              {STYLE_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  className={`${styles.pill} ${style === opt.key ? styles.activePill : ''}`}
                  onClick={() => setStyle(opt.key)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.actionRow}>
            <button
              className={styles.generateBtn}
              onClick={handleGenerate}
              disabled={isLoading || !notes.trim()}
            >
              <Sparkles size={16} />
              <span>{isLoading ? 'Summarizing...' : 'Generate Summary'}</span>
            </button>
          </div>
        </div>

        {/* Loading skeleton */}
        {isLoading && (
          <div className={styles.outputCard}>
            <div className={styles.outputHeader}>
              <span className="skeleton skeleton-title" style={{ width: '40%', height: '1.25rem' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div className="skeleton skeleton-line" style={{ width: '90%' }} />
              <div className="skeleton skeleton-line" style={{ width: '95%' }} />
              <div className="skeleton skeleton-line" style={{ width: '85%' }} />
              <div className="skeleton skeleton-line" style={{ width: '92%' }} />
              <div className="skeleton skeleton-line" style={{ width: '70%' }} />
            </div>
            <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
              Generating your study notes... almost there Baby! 📚🩺
            </p>
          </div>
        )}

        {/* Summary Output */}
        {summary && !isLoading && (
          <div className={`${styles.outputCard} paper-texture`}>
            <div className={styles.outputHeader}>
              <h4 className={styles.outputTitle}>
                {activeTitle || 'Your AI Summary'}
              </h4>
              <div className={styles.outputActions}>
                <button
                  className={styles.iconActionBtn}
                  onClick={handleCopyToClipboard}
                  title="Copy to Clipboard"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
                <button
                  className={styles.iconActionBtn}
                  onClick={handleManualSave}
                  title="Save to My Notes"
                >
                  <Save size={16} />
                </button>
              </div>
            </div>

            {renderSummaryHtml()}

            <div className={styles.shortcutsRow}>
              <button
                className={styles.shortcutBtn}
                onClick={() => onJumpToTab('flashcards', notes)}
              >
                <BookOpen size={14} />
                <span>Turn into Flashcards</span>
                <ArrowRight size={12} />
              </button>
              <button
                className={`${styles.shortcutBtn} ${styles.shortcutBlush}`}
                onClick={() => onJumpToTab('quiz', notes)}
              >
                <HelpCircle size={14} />
                <span>Turn into Quiz</span>
                <ArrowRight size={12} />
              </button>
              <button
                className={`${styles.shortcutBtn} ${styles.shortcutGold}`}
                onClick={handleNewSummary}
              >
                <Plus size={14} />
                <span>Start New Summary</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
