'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Lightbulb, Sparkles, Copy, Check, Trash2, Heart, 
  Volume2, VolumeX, BookOpen, Brain, Zap, Send, Paperclip
} from 'lucide-react';
import { generateMnemonics, parseDocument } from '../utils/gemini';
import { marked } from 'marked';
import styles from './MnemonicsTab.module.css';

interface MnemonicItem {
  id: string;
  topics: string;
  type: 'mnemonic' | 'story' | 'association';
  result: string;
  date: string;
}

interface MnemonicsTabProps {
  onAddToast: (message: string) => void;
}

export default function MnemonicsTab({ onAddToast }: MnemonicsTabProps) {
  const [topics, setTopics] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    const originalTopics = topics;
    setTopics(`[Reading file: "${file.name}"... please wait 🩺🧠]`);

    try {
      const parsedText = await parseDocument(file);
      setTopics(parsedText);
      onAddToast(`Loaded document: "${file.name}"! 📂`);
    } catch (err: any) {
      console.error(err);
      setTopics(originalTopics);
      onAddToast(`Error reading document: ${err.message || 'Parsing failed.'} ❌`);
    } finally {
      setIsParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };
  const [type, setType] = useState<'mnemonic' | 'story' | 'association'>('mnemonic');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<MnemonicItem[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MnemonicItem | null>(null);

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('megas_guide_mnemonics_history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setHistory(parsed);
        if (parsed.length > 0) {
          setSelectedItem(parsed[0]);
          setResult(parsed[0].result);
        }
      } catch (e) {
        console.error('Failed to parse mnemonics history', e);
      }
    }
  }, []);

  // Save history to localStorage
  const saveHistory = (newHistory: MnemonicItem[]) => {
    setHistory(newHistory);
    localStorage.setItem('megas_guide_mnemonics_history', JSON.stringify(newHistory));
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topics.trim()) {
      onAddToast('Please enter the concepts or terms you want to memorize! 🧠');
      return;
    }

    setIsLoading(true);
    setResult('');
    
    // Stop any active speech
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }

    try {
      const generatedText = await generateMnemonics(topics, type);
      setResult(generatedText);

      const newItem: MnemonicItem = {
        id: Date.now().toString(),
        topics: topics,
        type: type,
        result: generatedText,
        date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      };

      const updatedHistory = [newItem, ...history];
      saveHistory(updatedHistory);
      setSelectedItem(newItem);
      onAddToast('Memory aids created successfully! ⚡🩺');
    } catch (err: any) {
      console.error(err);
      onAddToast(`Error: ${err.message || 'Failed to generate memory aids.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    onAddToast('Copied to clipboard! 📋❤️');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = history.filter(item => item.id !== id);
    saveHistory(updated);
    onAddToast('Memory aid deleted. 🧹');
    
    if (selectedItem?.id === id) {
      if (updated.length > 0) {
        setSelectedItem(updated[0]);
        setResult(updated[0].result);
      } else {
        setSelectedItem(null);
        setResult('');
      }
    }
  };

  const handleSpeak = (text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      onAddToast('Speech synthesis is not supported in your browser.');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    // Strip markdown tags for cleaner speech
    const cleanText = text
      .replace(/\*\*|__/g, '')
      .replace(/\*|_/g, '')
      .replace(/#+/g, '')
      .replace(/`+/g, '');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const getHtmlContent = (mdText: string) => {
    try {
      return { __html: marked.parse(mdText) };
    } catch {
      return { __html: mdText };
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.layoutGrid}>
        
        {/* Left Column: Form & History */}
        <div className={styles.leftCol}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <Lightbulb className={styles.headerIcon} />
              <div>
                <h3 className={styles.cardTitle}>Memory Palace Builder</h3>
                <p className={styles.cardSubtitle}>Generate visual hooks & mnemonics for high-yield exams</p>
              </div>
            </div>

            <form onSubmit={handleGenerate} className={styles.form}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>What do you need to memorize?</label>
                <div className={styles.fileUploadRow}>
                  <button 
                    type="button"
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
                  placeholder="Example:
1. Cranial Nerves: Olfactory, Optic, Oculomotor, Trochlear, Trigeminal...
or
2. Adverse effects of Aminoglycosides: Ototoxicity, Nephrotoxicity, Neuromuscular blockade..."
                  value={topics}
                  onChange={(e) => setTopics(e.target.value)}
                  required
                  rows={6}
                  disabled={isLoading || isParsing}
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Memory Strategy</label>
                <div className={styles.typeSelector}>
                  {[
                    { id: 'mnemonic', label: 'Acronym / Phrase', desc: 'Letter-based memory lines' },
                    { id: 'story', label: 'Memory Palace Story', desc: 'Vivid clinical situations' },
                    { id: 'association', label: 'Visual Associations', desc: 'Medical puns & hooks' }
                  ].map((opt) => (
                    <label 
                      key={opt.id} 
                      className={`${styles.radioLabel} ${type === opt.id ? styles.radioLabelActive : ''}`}
                    >
                      <input
                        type="radio"
                        name="strategyType"
                        value={opt.id}
                        checked={type === opt.id}
                        onChange={() => setType(opt.id as any)}
                        className={styles.radioInput}
                        disabled={isLoading}
                      />
                      <span className={styles.radioTitle}>{opt.label}</span>
                      <span className={styles.radioDesc}>{opt.desc}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button type="submit" className={styles.submitBtn} disabled={isLoading}>
                <Zap size={16} fill="white" className={isLoading ? styles.spinning : ''} />
                <span>{isLoading ? 'Crafting Memory Aids...' : 'Generate Memory Aids'}</span>
              </button>
            </form>
          </div>

          {/* History Panel */}
          {history.length > 0 && (
            <div className={styles.card} style={{ marginTop: '1.5rem' }}>
              <div className={styles.historyHeader}>
                <h4 className={styles.historyTitle}>Saved Memory Palaces</h4>
                <button 
                  className={styles.clearHistoryBtn}
                  onClick={() => {
                    if (confirm('Clear all saved mnemonics? 🧹')) {
                      saveHistory([]);
                      setSelectedItem(null);
                      setResult('');
                      onAddToast('History cleared!');
                    }
                  }}
                >
                  Clear All
                </button>
              </div>

              <div className={styles.historyList}>
                {history.map((item) => (
                  <div
                    key={item.id}
                    className={`${styles.historyItem} ${selectedItem?.id === item.id ? styles.historyItemActive : ''}`}
                    onClick={() => {
                      setSelectedItem(item);
                      setResult(item.result);
                    }}
                  >
                    <div className={styles.historyItemMain}>
                      <div className={styles.historyTypeBadge}>
                        {item.type === 'mnemonic' ? 'Acronym' : item.type === 'story' ? 'Palace' : 'Hooks'}
                      </div>
                      <p className={styles.historySummaryText}>{item.topics}</p>
                      <span className={styles.historyDate}>{item.date}</span>
                    </div>
                    <button 
                      className={styles.deleteItemBtn}
                      onClick={(e) => handleDelete(item.id, e)}
                      title="Delete memory aid"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Display Area */}
        <div className={styles.rightCol}>
          <div className={`${styles.card} ${styles.displayCard}`}>
            {isLoading ? (
              <div className={styles.loadingState}>
                <div className={styles.loadingGlow} />
                <Brain size={48} className={styles.loadingBrain} />
                <div className={styles.loadingPulse} />
                <p className={styles.loadingText}>Synthesizing Memory Hooks...</p>
                <p className={styles.loadingSubtext}>Connecting synapses and weaving mnemonics for you. 🩺🧠</p>
              </div>
            ) : result ? (
              <div className={styles.resultContainer}>
                <div className={styles.resultHeader}>
                  <div className={styles.resultMeta}>
                    <Sparkles size={16} className="text-gold" />
                    <span className={styles.resultBadge}>
                      {selectedItem?.type === 'mnemonic' ? 'Acronym Strategy' : selectedItem?.type === 'story' ? 'Clinical Memory Palace' : 'Visual Associations'}
                    </span>
                  </div>

                  <div className={styles.actionGroup}>
                    <button
                      className={styles.actionBtn}
                      onClick={() => handleSpeak(result)}
                      title={isSpeaking ? 'Stop speaking' : 'Read aloud'}
                    >
                      {isSpeaking ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </button>
                    <button
                      className={styles.actionBtn}
                      onClick={() => handleCopy(result, selectedItem?.id || 'current')}
                      title="Copy to clipboard"
                    >
                      {copiedId === (selectedItem?.id || 'current') ? <Check size={18} style={{ color: '#27C93F' }} /> : <Copy size={18} />}
                    </button>
                  </div>
                </div>

                <div className={styles.resultBody}>
                  {selectedItem && (
                    <div className={styles.originalTopics}>
                      <span className={styles.originalLabel}>Concepts:</span>
                      <p>{selectedItem.topics}</p>
                    </div>
                  )}
                  <div 
                    className="markdown-content"
                    dangerouslySetInnerHTML={getHtmlContent(result)}
                  />
                </div>
              </div>
            ) : (
              <div className={styles.emptyState}>
                <div className={styles.emptyIconWrapper}>
                  <Lightbulb size={36} className={styles.bulbGlow} />
                </div>
                <h4 className={styles.emptyTitle}>Enter Your Concepts</h4>
                <p className={styles.emptyDesc}>
                  Enter the anatomical systems, pharmacology tables, or clinical diagnostics you're studying on the left.
                </p>
                <div className={styles.loveTip}>
                  <Heart size={14} fill="var(--color-blush)" className="text-blush pulsing-heart" />
                  <span>"Because every association you build now makes you a more confident doctor."</span>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
