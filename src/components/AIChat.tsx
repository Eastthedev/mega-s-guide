'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, Trash2, BookOpen, Stethoscope, User, ChevronDown, 
  ChevronUp, Paperclip, X, FileText, Plus, MessageSquare 
} from 'lucide-react';
import { generateChatResponse, ChatMessage, AttachedFile } from '../utils/gemini';
import { 
  getChatSessions, getChatMessages, saveChatSession, deleteChatSession, 
  ChatSession, syncCurrentStats 
} from '../utils/supabase';
import { marked } from 'marked';
import styles from './AIChat.module.css';

interface AIChatProps {
  onAddToast: (message: string) => void;
}

export default function AIChat({ onAddToast }: AIChatProps) {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [context, setContext] = useState('');
  const [isContextCollapsed, setIsContextCollapsed] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to generate a new session ID
  const generateSessionId = () => 'sess_' + Math.random().toString(36).substring(2, 15);

  // Start with context panel expanded so Baby can paste fresh notes
  useEffect(() => {
    setIsContextCollapsed(false);
  }, []);

  // Load chat sessions from database
  useEffect(() => {
    const loadSessions = async () => {
      const fetchedSessions = await getChatSessions();
      setSessions(fetchedSessions);

      if (fetchedSessions.length > 0) {
        // Select the most recent session
        const firstSession = fetchedSessions[0];
        setCurrentSessionId(firstSession.id);
        const msgs = await getChatMessages(firstSession.id);
        setMessages(msgs);
      } else {
        // Start a fresh session
        const newSessId = generateSessionId();
        setCurrentSessionId(newSessId);
        setMessages([]);
      }
    };
    loadSessions();
  }, []);

  // Scroll to bottom when messages update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit: 15MB
    const maxSize = 15 * 1024 * 1024;
    if (file.size > maxSize) {
      onAddToast("File is too large! Please upload files smaller than 15MB. 💙");
      return;
    }

    const fileType = file.name.split('.').pop()?.toLowerCase();
    
    // Warning for slides (PPT/PPTX)
    if (fileType === 'ppt' || fileType === 'pptx') {
      onAddToast("For lecture slides, export them as a PDF first so the AI can read them correctly! 🩺❤️");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

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
      onAddToast(`Attached: "${file.name}" 📂`);
    };

    reader.readAsDataURL(file);
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

  // Switch chat sessions
  const handleSelectSession = async (sessionId: string) => {
    setIsHistoryOpen(false);
    if (sessionId === currentSessionId) return;
    setIsLoading(true);
    setCurrentSessionId(sessionId);
    try {
      const msgs = await getChatMessages(sessionId);
      setMessages(msgs);
    } catch (err) {
      console.error(err);
      onAddToast("Failed to load chat history. 💙");
    } finally {
      setIsLoading(false);
    }
  };

  // Start new clean chat session
  const handleNewChat = () => {
    setIsHistoryOpen(false);
    const newSessId = generateSessionId();
    setCurrentSessionId(newSessId);
    setMessages([]);
    onAddToast("Started a new chat session! 🩺");
  };

  // Delete a chat session
  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteChatSession(sessionId);
      const updatedSessions = sessions.filter(s => s.id !== sessionId);
      setSessions(updatedSessions);
      onAddToast("Chat session deleted. 🧹");

      if (currentSessionId === sessionId) {
        if (updatedSessions.length > 0) {
          setCurrentSessionId(updatedSessions[0].id);
          const msgs = await getChatMessages(updatedSessions[0].id);
          setMessages(msgs);
        } else {
          // Generate fresh session
          const newSessId = generateSessionId();
          setCurrentSessionId(newSessId);
          setMessages([]);
        }
      }
    } catch (err) {
      console.error("Failed to delete chat session:", err);
      onAddToast("Error deleting session. 💙");
    }
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() && !attachedFile) return;

    let displayMessage = textToSend;
    if (attachedFile && !textToSend.trim()) {
      displayMessage = `Analyzed file: ${attachedFile.name}`;
    }

    const userMessage: ChatMessage = { role: 'user', text: displayMessage };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    const filePayload = attachedFile ? { ...attachedFile } : undefined;
    setAttachedFile(null); // Clear preview

    // Reset file input element
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // Determine title for the session
    const currentSession = sessions.find(s => s.id === currentSessionId);
    let sessionTitle = currentSession?.title || '';
    if (!sessionTitle) {
      // First message in the session, generate title from user text
      const rawTitle = textToSend.trim() || 'Attached File';
      sessionTitle = rawTitle.substring(0, 26) + (rawTitle.length > 26 ? '...' : '');
    }

    // Save session message array to Supabase
    await saveChatSession(currentSessionId, sessionTitle, updatedMessages);

    // Refresh sessions list
    const fetchedSessions = await getChatSessions();
    setSessions(fetchedSessions);

    try {
      const reply = await generateChatResponse(context, messages, textToSend, filePayload);
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
      const rawHtml = marked.parse(text) as string;
      return <div className="markdown-content" dangerouslySetInnerHTML={{ __html: rawHtml }} />;
    } catch (e) {
      return <p>{text}</p>;
    }
  };

  return (
    <div className={styles.chatWrapper}>
      {/* Mobile Backdrop Overlay */}
      {isHistoryOpen && (
        <div className={styles.sidebarOverlay} onClick={() => setIsHistoryOpen(false)} />
      )}

      {/* ChatGPT-style Sidebar */}
      <div className={`${styles.chatSidebar} ${isHistoryOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarMobileHeader}>
          <span>Chat History</span>
          <button className={styles.closeSidebarBtn} onClick={() => setIsHistoryOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <button className={styles.newChatBtn} onClick={handleNewChat}>
          <Plus size={16} />
          <span>New Chat</span>
        </button>

        <div className={styles.sessionList}>
          {sessions.length === 0 ? (
            <div className={styles.noHistory}>
              <p>No history yet</p>
            </div>
          ) : (
            sessions.map((sess) => {
              const isActive = sess.id === currentSessionId;
              return (
                <div
                  key={sess.id}
                  className={`${styles.sessionItem} ${isActive ? styles.activeSessionItem : ''}`}
                  onClick={() => handleSelectSession(sess.id)}
                >
                  <div className={styles.sessionTitleWrapper}>
                    <MessageSquare size={14} className={isActive ? 'text-teal' : 'text-muted'} />
                    <span className={styles.sessionTitle}>{sess.title}</span>
                  </div>
                  <button
                    className={styles.deleteSessionBtn}
                    onClick={(e) => handleDeleteSession(sess.id, e)}
                    title="Delete Chat Thread"
                    aria-label="Delete Session"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={styles.chatContent}>
        {/* Mobile History Toggle Bar */}
        <div className={styles.mobileHistoryBar}>
          <button className={styles.mobileHistoryBtn} onClick={() => setIsHistoryOpen(true)}>
            <MessageSquare size={15} />
            <span>Chat History</span>
          </button>
          <span className={styles.mobileActiveTitle}>
            {sessions.find(s => s.id === currentSessionId)?.title || 'New Chat'}
          </span>
        </div>

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
              <textarea
                className={styles.contextTextarea}
                placeholder="Paste your lecture notes, textbook chapters, or medical cases here..."
                value={context}
                onChange={(e) => setContext(e.target.value)}
              />
              <button className={styles.saveContextBtn} onClick={saveContext}>
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
                    {isUser ? <p>{msg.text}</p> : renderMessageContent(msg.text)}
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
          {attachedFile && (
            <div className={styles.attachmentPreview}>
              <FileText size={14} className="text-teal" />
              <span className={styles.previewName}>{attachedFile.name}</span>
              <button 
                className={styles.removePreviewBtn} 
                onClick={() => {
                  setAttachedFile(null);
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
              title="Attach file (PDF, JPG, PNG)"
              disabled={isLoading}
            >
              <Paperclip size={18} />
            </button>
            
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,image/*,.txt,.md"
              style={{ display: 'none' }}
            />

            <input
              type="text"
              className={styles.inputField}
              placeholder={context.trim() ? "Ask a question about your notes..." : "Paste study context above first..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
            />
            <button 
              className={styles.sendBtn} 
              onClick={() => handleSendMessage(input)}
              disabled={isLoading || (!input.trim() && !attachedFile)}
              aria-label="Send Message"
            >
              <Send size={18} />
            </button>
          </div>
          
          <p className={styles.slideConverterNotice}>
            💡 Tip: Export PowerPoint slides to PDF first for perfect clinical visual diagrams analysis!
          </p>
        </div>
      </div>
    </div>
  );
}
