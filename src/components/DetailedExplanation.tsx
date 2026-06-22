'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Copy, BookOpen, FileText, Heart, Plus, Trash2, Check, Brain, X as CloseIcon, Paperclip, ZoomIn, ZoomOut, RotateCcw, Download, Maximize2, Minimize2 } from 'lucide-react';
import { generateExplanation, parseDocument } from '../utils/gemini';
import { getExplanationHistory, saveExplanation, deleteExplanation, ExplanationItem } from '../utils/supabase';
import { marked } from 'marked';
import styles from './DetailedExplanation.module.css';

interface DetailedExplanationProps {
  onAddToast: (message: string) => void;
  explanationHistory: ExplanationItem[];
  activeId: string | null;
  setExplanationHistory: React.Dispatch<React.SetStateAction<ExplanationItem[]>>;
  setActiveId: (id: string | null) => void;
}

type Mode = 'topic' | 'passage';
type Depth = 'simple' | 'standard' | 'deep';

interface InteractiveViewerProps {
  type: 'svg' | 'image';
  content: string;
  title?: string;
}

function InteractiveViewer({ type, content, title = "Visual Guide" }: InteractiveViewerProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.25, 4));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleDownload = () => {
    try {
      if (type === 'svg') {
        const blob = new Blob([content], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const safeTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, '_');
        link.download = `medical_diagram_${safeTitle || 'visual'}.svg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        const link = document.createElement('a');
        link.href = content;
        const safeTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, '_');
        link.download = `medical_image_${safeTitle || 'visual'}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error("Failed to download media:", err);
    }
  };

  return (
    <div 
      className={`${styles.svgViewerContainer} ${isFullscreen ? styles.svgFullscreen : ''}`}
      ref={containerRef}
    >
      <div className={styles.svgViewerHeader}>
        <span className={styles.svgViewerTitle}>
          <Brain size={14} className="text-gold" />
          {title}
        </span>
        <div className={styles.svgViewerActions}>
          <button onClick={handleZoomIn} title="Zoom In" className={styles.svgActionBtn}>
            <ZoomIn size={16} />
          </button>
          <button onClick={handleZoomOut} title="Zoom Out" className={styles.svgActionBtn}>
            <ZoomOut size={16} />
          </button>
          <button onClick={handleReset} title="Reset View" className={styles.svgActionBtn}>
            <RotateCcw size={16} />
          </button>
          <button onClick={handleDownload} title="Download File" className={styles.svgActionBtn}>
            <Download size={16} />
          </button>
          <button onClick={toggleFullscreen} title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"} className={styles.svgActionBtn}>
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>
      <div 
        className={styles.svgViewerBody}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <div 
          className={styles.svgWrapper}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out'
          }}
        >
          {type === 'svg' ? (
            <div dangerouslySetInnerHTML={{ __html: content.replace(/<svg([^>]*?)\s+height=["']auto["']/gi, '<svg$1').replace(/<svg([^>]*?)\s+width=["']auto["']/gi, '<svg$1') }} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
          ) : (
            <img src={content} alt={title} style={{ width: '100%', height: '100%', objectFit: 'contain' }} draggable={false} />
          )}
        </div>
      </div>
    </div>
  );
}

export default function DetailedExplanation({ 
  onAddToast,
  explanationHistory,
  activeId,
  setExplanationHistory,
  setActiveId
}: DetailedExplanationProps) {
  const [mode, setMode] = useState<Mode>('topic');
  const [input, setInput] = useState('');
  const [depth, setDepth] = useState<Depth>('standard');
  const [explanation, setExplanation] = useState('');
  const [activeTitle, setActiveTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [copied, setCopied] = useState(false);

  const mainRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    const originalInput = input;
    setInput(`[Reading file: "${file.name}"... please wait 🩺🧠]`);

    try {
      const parsedText = await parseDocument(file);
      setInput(parsedText);
      onAddToast(`Loaded document: "${file.name}"! 📂`);
    } catch (err: any) {
      console.error(err);
      setInput(originalInput);
      onAddToast(`Error reading document: ${err.message || 'Parsing failed.'} ❌`);
    } finally {
      setIsParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const loadHistory = async () => {
    const items = await getExplanationHistory();
    setExplanationHistory(items);
  };

  // Sync state whenever activeId or explanationHistory changes
  useEffect(() => {
    if (activeId) {
      const activeItem = explanationHistory.find(s => s.id === activeId);
      if (activeItem) {
        setMode(activeItem.mode);
        setInput(activeItem.input);
        setDepth(activeItem.depth);
        setExplanation(activeItem.explanationText);
        setActiveTitle(activeItem.title);
      }
    } else {
      setInput('');
      setExplanation('');
      setActiveTitle('');
    }
  }, [activeId, explanationHistory]);

  const buildTitle = (text: string, m: Mode) => {
    if (m === 'topic') return text.trim().substring(0, 50) || 'Explanation';
    return text.trim().split('\n')[0].substring(0, 50).replace(/[#*]/g, '').trim() || 'Passage Explanation';
  };

  const handleExplain = async () => {
    if (!input.trim()) return;

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

  const handleNewExplanation = () => {
    setActiveId(null);
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
      const mediaRegex = /((?:```(?:xml|svg|html)?\s*)?<svg[\s\S]*?<\/svg>(?:\s*```)?|!\[.*?\]\(.*?\)|<img\s+[^>]*src=["'].*?["'][^>]*>)/gi;
      const parts = explanation.split(mediaRegex);

      if (parts.length <= 1) {
        const rawHtml = marked.parse(explanation) as string;
        return <div className="markdown-content" dangerouslySetInnerHTML={{ __html: rawHtml }} />;
      }

      return (
        <div className={styles.multiPartContainer}>
          {parts.map((part, i) => {
            const trimmed = part.trim();
            if (!trimmed) return null;

            const isSvg = (trimmed.startsWith('<svg') && trimmed.endsWith('</svg>')) || trimmed.includes('<svg');
            const isMarkdownImg = trimmed.startsWith('![');
            const isHtmlImg = trimmed.startsWith('<img') || trimmed.startsWith('<IMG');

            if (isSvg) {
              const cleanSvg = trimmed.replace(/^```(xml|html|svg)?\s*/i, '').replace(/```$/i, '').trim();
              const titleMatch = cleanSvg.match(/<title>([\s\S]*?)<\/title>/i);
              const title = titleMatch ? titleMatch[1] : "Medical Diagram";
              return <InteractiveViewer key={i} type="svg" content={cleanSvg} title={title} />;
            } else if (isMarkdownImg) {
              const match = trimmed.match(/!\[(.*?)\]\((.*?)\)/);
              if (match) {
                const altText = match[1] || "Medical Image";
                const url = match[2];
                return <InteractiveViewer key={i} type="image" content={url} title={altText} />;
              }
              return null;
            } else if (isHtmlImg) {
              const srcMatch = trimmed.match(/src=["']([^"']+)["']/i);
              const altMatch = trimmed.match(/alt=["']([^"']+)["']/i) || trimmed.match(/title=["']([^"']+)["']/i);
              if (srcMatch) {
                const src = srcMatch[1];
                const altText = altMatch ? altMatch[1] : "Medical Image";
                return <InteractiveViewer key={i} type="image" content={src} title={altText} />;
              }
              return null;
            } else {
              const rawHtml = marked.parse(part) as string;
              return (
                <div 
                  key={i} 
                  className="markdown-content" 
                  dangerouslySetInnerHTML={{ __html: rawHtml }} 
                />
              );
            }
          })}
        </div>
      );
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
      {/* ========== MAIN CONTENT ========== */}
      <div className={styles.content} ref={mainRef}>
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
              <>
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
                  className={styles.textareaInput}
                  placeholder="Paste slide notes or a confusing paragraph here..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={isLoading || isParsing}
                />
              </>
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
