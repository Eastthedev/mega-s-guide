'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, Trash2, Search, Stethoscope, User, Paperclip, 
  X, FileText, Plus, MessageSquare, ZoomIn, ZoomOut,
  RotateCcw, Download, Maximize2, Minimize2, ChevronDown,
  ChevronRight
} from 'lucide-react';
import { generateResearchResponse, ChatMessage, AttachedFile, parseDocument } from '../utils/gemini';
import { 
  getResearchSessions, getResearchMessages, saveResearchSession, deleteResearchSession,
  ResearchSession 
} from '../utils/supabase';
import { marked } from 'marked';
import styles from './ResearchTab.module.css';

interface ResearchTabProps {
  onAddToast: (message: string) => void;
  sessions: ResearchSession[];
  currentSessionId: string;
  setSessions: React.Dispatch<React.SetStateAction<ResearchSession[]>>;
  setCurrentSessionId: (id: string) => void;
}

const STARTER_QUESTIONS = [
  "Explain the pathology of acute coronary syndrome",
  "Differentiate Crohn's disease and Ulcerative Colitis",
  "What are the first-line treatments for diabetic ketoacidosis?"
];

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
          <Search size={14} className="text-teal" />
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

export default function ResearchTab({ 
  onAddToast, 
  sessions, 
  currentSessionId, 
  setSessions, 
  setCurrentSessionId 
}: ResearchTabProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [attachedText, setAttachedText] = useState('');
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load messages dynamically based on currentSessionId
  useEffect(() => {
    if (!currentSessionId) return;

    const loadMessages = async () => {
      setIsLoading(true);
      try {
        const msgs = await getResearchMessages(currentSessionId);
        setMessages(msgs);
      } catch (err) {
        console.error("Failed to load messages for research session:", err);
        onAddToast("Failed to load research session messages. 💙");
      } finally {
        setIsLoading(false);
      }
    };
    loadMessages();
  }, [currentSessionId]);

  // Scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit: 15MB
    const maxSize = 15 * 1024 * 1024;
    if (file.size > maxSize) {
      onAddToast("File is too large! Please upload files smaller than 15MB. 💙");
      return;
    }

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (!result) return;

        // Extract base64 part
        const base64Data = result.split(',')[1];
        
        setAttachedFile({
          mimeType: file.type || 'application/octet-stream',
          data: base64Data,
          name: file.name
        });
        setAttachedText('');
        onAddToast(`Attached image: "${file.name}" 📸`);
      };
      reader.readAsDataURL(file);
    } else {
      setIsParsing(true);
      setAttachedFile({
        mimeType: file.type || 'application/octet-stream',
        data: '',
        name: file.name
      });
      setAttachedText('');

      try {
        const parsedText = await parseDocument(file);
        setAttachedText(parsedText);
        onAddToast(`Attached & analyzed: "${file.name}"! 📂`);
      } catch (err: any) {
        console.error(err);
        setAttachedFile(null);
        setAttachedText('');
        onAddToast(`Error reading document: ${err.message || 'Parsing failed.'} ❌`);
      } finally {
        setIsParsing(false);
      }
    }
  };



  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() && !attachedFile) return;

    let displayMessage = textToSend;
    if (attachedFile) {
      if (attachedFile.mimeType.startsWith('image/')) {
        const markdownImg = `\n\n![${attachedFile.name}](data:${attachedFile.mimeType};base64,${attachedFile.data})`;
        displayMessage = textToSend.trim() ? `${textToSend}${markdownImg}` : markdownImg;
      } else {
        if (!textToSend.trim()) {
          displayMessage = `Analyzed file: ${attachedFile.name}`;
        } else {
          displayMessage = `${textToSend}\n\n[Attached: ${attachedFile.name}]`;
        }
      }
    }

    const userMessage: ChatMessage = { role: 'user', text: displayMessage };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    const filePayload = attachedFile && attachedFile.data ? { ...attachedFile } : undefined;
    const promptToSend = attachedText 
      ? `[Attached Document: "${attachedFile?.name || 'Document'}"]\n${attachedText}\n\nQuestion: ${textToSend || "Please analyze this document and summarize the high-yield medical content."}`
      : textToSend;

    setAttachedFile(null); // Clear preview
    setAttachedText('');

    // Reset file input element
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // Determine title for the session
    const currentSession = sessions.find(s => s.id === currentSessionId);
    let sessionTitle = currentSession?.title || '';
    if (!sessionTitle) {
      const rawTitle = textToSend.trim() || (attachedFile ? attachedFile.name : 'Attached File');
      sessionTitle = rawTitle.substring(0, 26) + (rawTitle.length > 26 ? '...' : '');
    }

    // Save session message array to Supabase
    await saveResearchSession(currentSessionId, sessionTitle, updatedMessages);

    // Refresh sessions list
    const fetchedSessions = await getResearchSessions();
    setSessions(fetchedSessions);

    try {
      const reply = await generateResearchResponse(updatedMessages, promptToSend, filePayload);
      const updatedWithModel = [...updatedMessages, { role: 'model' as const, text: reply }];
      setMessages(updatedWithModel);
      await saveResearchSession(currentSessionId, sessionTitle, updatedWithModel);
    } catch (err: any) {
      console.error(err);
      onAddToast(`Error querying AI: ${err.message || 'Check your connection. 💙'}`);
      const updatedWithError = [...updatedMessages, { role: 'model' as const, text: "Something went wrong — check your API key or connection 💙" }];
      setMessages(updatedWithError);
      await saveResearchSession(currentSessionId, sessionTitle, updatedWithError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendMessage(input);
    }
  };

  const renderMessageContent = (text: string) => {
    try {
      const mediaRegex = /((?:```(?:xml|svg|html)?\s*)?<svg[\s\S]*?<\/svg>(?:\s*```)?|!\[.*?\]\(.*?\)|<img\s+[^>]*src=["'].*?["'][^>]*>)/gi;
      const parts = text.split(mediaRegex);

      if (parts.length <= 1) {
        const rawHtml = marked.parse(text) as string;
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
    } catch (e) {
      return <p>{text}</p>;
    }
  };

  return (
    <div className={styles.chatWrapper}>
      {/* Main Chat Area */}
      <div className={styles.chatContent}>
        {/* Chat History View */}
        <div className={`${styles.chatHistory} paper-texture`}>
          {messages.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.avatar}>
                <Search size={28} />
              </div>
              <div>
                <h3 className={styles.emptyTitle}>General Medical Research Hub 🔬❤️</h3>
                <p className={styles.emptySub}>
                  Ask me any clinical, pathophysiological, or study questions directly! I am a general medical AI assistant and am not restricted to your pasted study notes context.
                </p>
              </div>
              
              <div className={styles.suggestions}>
                {STARTER_QUESTIONS.map((question, i) => (
                  <button 
                    key={i}
                    className={styles.suggestionBtn}
                    onClick={() => handleSendMessage(question)}
                  >
                    "{question}"
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isUser = msg.role === 'user';
              return (
                <div 
                  key={index}
                  className={`${styles.messageRow} ${isUser ? styles.userRow : styles.modelRow}`}
                >
                  <div className={`${styles.avatar} ${isUser ? styles.userAvatar : ''}`}>
                    {isUser ? <User size={16} /> : <Stethoscope size={16} />}
                  </div>
                  <div className={`${styles.bubble} ${isUser ? styles.userBubble : styles.modelBubble}`}>
                    {renderMessageContent(msg.text)}
                  </div>
                </div>
              );
            })
          )}

          {isLoading && (
            <div className={`${styles.messageRow} ${styles.modelRow}`}>
              <div className={styles.avatar}>
                <Stethoscope size={16} />
              </div>
              <div className={`${styles.bubble} ${styles.modelBubble}`}>
                <div className={styles.typingIndicator}>
                  <div className={styles.dot} />
                  <div className={styles.dot} />
                  <div className={styles.dot} />
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className={styles.inputAreaContainer}>
          {isParsing && (
            <div className={styles.attachmentPreview}>
              <div className={styles.spinner} />
              <span className={styles.previewName}>Reading document... 🩺🧠</span>
            </div>
          )}

          {attachedFile && !isParsing && (
            <div className={styles.attachmentPreview}>
              <FileText size={14} className="text-teal" />
              <span className={styles.previewName}>{attachedFile.name}</span>
              <button 
                className={styles.removePreviewBtn} 
                onClick={() => {
                  setAttachedFile(null);
                  setAttachedText('');
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                aria-label="Remove attachment"
              >
                <X size={14} />
              </button>
            </div>
          )}

          <div className={styles.inputArea}>
            <button 
              className={styles.attachBtn} 
              onClick={() => fileInputRef.current?.click()}
              title="Attach file (Image, PDF, Word, PowerPoint, Text)"
              disabled={isLoading || isParsing}
            >
              <Paperclip size={18} />
            </button>
            
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,image/*,.txt,.md,.docx,.pptx"
              style={{ display: 'none' }}
            />

            <input
              type="text"
              className={styles.inputField}
              placeholder="Ask a medical question, upload slides, documents, or diagnostic images..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading || isParsing}
            />
            <button 
              className={styles.sendBtn} 
              onClick={() => handleSendMessage(input)}
              disabled={isLoading || isParsing || (!input.trim() && !attachedFile)}
              aria-label="Send Message"
            >
              <Send size={18} />
            </button>
          </div>
          
          <p className={styles.slideConverterNotice}>
            💡 Tip: Upload PowerPoint slides (.pptx), Word notes (.docx), PDFs, or clinical photos directly to research with them!
          </p>
        </div>
      </div>
    </div>
  );
}
