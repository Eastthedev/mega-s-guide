'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, Trash2, BookOpen, Stethoscope, User, ChevronDown, 
  ChevronUp, Paperclip, X, FileText, Plus, MessageSquare,
  ZoomIn, ZoomOut, RotateCcw, Download, Maximize2, Minimize2
} from 'lucide-react';
import { generateChatResponse, ChatMessage, AttachedFile, parseDocument } from '../utils/gemini';
import { 
  getChatSessions, getChatMessages, saveChatSession, deleteChatSession, 
  ChatSession, syncCurrentStats 
} from '../utils/supabase';
import { marked } from 'marked';
import styles from './AIChat.module.css';

interface AIChatProps {
  onAddToast: (message: string) => void;
  sessions: ChatSession[];
  currentSessionId: string;
  setSessions: React.Dispatch<React.SetStateAction<ChatSession[]>>;
  setCurrentSessionId: (id: string) => void;
}

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
          <BookOpen size={14} className="text-teal" />
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

export default function AIChat({ 
  onAddToast, 
  sessions, 
  currentSessionId, 
  setSessions, 
  setCurrentSessionId 
}: AIChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [context, setContext] = useState('');
  const [isContextCollapsed, setIsContextCollapsed] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isParsingContext, setIsParsingContext] = useState(false);
  const [attachedText, setAttachedText] = useState('');
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contextFileInputRef = useRef<HTMLInputElement>(null);

  // Start with context panel expanded so Baby can paste fresh notes
  useEffect(() => {
    setIsContextCollapsed(false);
  }, []);

  // Load chat messages dynamically based on currentSessionId
  useEffect(() => {
    if (!currentSessionId) return;

    const loadMessages = async () => {
      setIsLoading(true);
      try {
        const msgs = await getChatMessages(currentSessionId);
        setMessages(msgs);
      } catch (err) {
        console.error("Failed to load chat history:", err);
        onAddToast("Failed to load chat history. 💙");
      } finally {
        setIsLoading(false);
      }
    };
    loadMessages();
  }, [currentSessionId]);

  // Scroll to bottom when messages update
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

  const handleContextFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsingContext(true);
    const originalContext = context;
    setContext(`[Reading file: "${file.name}"... please wait 🩺🧠]`);

    try {
      const parsedText = await parseDocument(file);
      setContext(parsedText);
      onAddToast(`Loaded study document: "${file.name}"! 📂`);
    } catch (err: any) {
      console.error(err);
      setContext(originalContext);
      onAddToast(`Error reading document: ${err.message || 'Parsing failed.'} ❌`);
    } finally {
      setIsParsingContext(false);
      if (contextFileInputRef.current) contextFileInputRef.current.value = '';
    }
  };

  const saveContext = async () => {
    localStorage.setItem('megas_guide_study_context', context);
    onAddToast("Study context updated! Gemini will now answer grounded in these notes. 📚");
    setIsContextCollapsed(true);
    
    // Increase session count if context was just added
    if (context.trim() !== '') {
      const count = parseInt(localStorage.getItem('megas_guide_sessions_count') || '0', 10);
      localStorage.setItem('megas_guide_sessions_count', (count + 1).toString());
      await syncCurrentStats();
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
      // First message in the session, generate title from user text
      const rawTitle = textToSend.trim() || (attachedFile ? attachedFile.name : 'Attached File');
      sessionTitle = rawTitle.substring(0, 26) + (rawTitle.length > 26 ? '...' : '');
    }

    // Save session message array to Supabase
    await saveChatSession(currentSessionId, sessionTitle, updatedMessages);

    // Refresh sessions list
    const fetchedSessions = await getChatSessions();
    setSessions(fetchedSessions);

    try {
      const reply = await generateChatResponse(context, messages, promptToSend, filePayload);
      const updatedWithModel = [...updatedMessages, { role: 'model' as const, text: reply }];
      setMessages(updatedWithModel);
      await saveChatSession(currentSessionId, sessionTitle, updatedWithModel);
    } catch (err: any) {
      console.error(err);
      onAddToast(`Something went wrong: ${err.message || 'Check your API Key. 💙'}`);
      const updatedWithError = [...updatedMessages, { role: 'model' as const, text: "Something went wrong — check your API key or connection 💙" }];
      setMessages(updatedWithError);
      await saveChatSession(currentSessionId, sessionTitle, updatedWithError);
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

        {/* Set Study Context Panel */}
        <div className={styles.contextPanel}>
          <button 
            className={styles.contextHeader}
            onClick={() => setIsContextCollapsed(!isContextCollapsed)}
          >
            <span className="flex items-center gap-2">
              <BookOpen size={16} />
              Paste study material here so I can help you better 📚
            </span>
            {isContextCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
          
          {!isContextCollapsed && (
            <div className={styles.contextBody}>
              <div className={styles.fileUploadRow}>
                <button 
                  className={styles.uploadBtn}
                  onClick={() => contextFileInputRef.current?.click()}
                  disabled={isParsingContext}
                >
                  <Paperclip size={14} />
                  <span>{isParsingContext ? 'Reading file...' : 'Upload Study Document (.pdf, .docx, .pptx, .txt)'}</span>
                </button>
                <input 
                  type="file"
                  ref={contextFileInputRef}
                  onChange={handleContextFileUpload}
                  accept=".pdf,.docx,.pptx,.txt,.md"
                  style={{ display: 'none' }}
                />
              </div>
              <textarea
                className={styles.contextTextarea}
                placeholder="Paste your lecture notes, textbook chapters, or medical cases here..."
                value={context}
                onChange={(e) => setContext(e.target.value)}
                disabled={isParsingContext}
              />
              <button className={styles.saveContextBtn} onClick={saveContext} disabled={isParsingContext}>
                Set Study Context
              </button>
            </div>
          )}
        </div>

        {/* Chat History View */}
        <div className={`${styles.chatHistory} paper-texture`}>
          {messages.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.avatar}>
                <Stethoscope size={28} />
              </div>
              <div>
                <h3 className={styles.emptyTitle}>Hey future doctor! 🩺❤️</h3>
                <p className={styles.emptySub}>
                  {context.trim() 
                    ? "Ask me anything! I will answer grounded ONLY in the study notes you pasted above." 
                    : "Paste your study notes in the panel above first, then ask me to explain concepts, draft summaries, or quiz you!"
                  }
                </p>
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

        {/* Input controls */}
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
              placeholder={context.trim() ? "Ask a question about your notes..." : "Paste study context above first..."}
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
            💡 Tip: Upload PowerPoint slides (.pptx), Word notes (.docx), PDFs, or clinical photos directly to chat about them!
          </p>
        </div>
      </div>
    </div>
  );
}
