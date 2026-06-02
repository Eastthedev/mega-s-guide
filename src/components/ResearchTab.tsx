'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, Trash2, Search, Stethoscope, User, Paperclip, 
  X, FileText, Plus, MessageSquare 
} from 'lucide-react';
import { generateResearchResponse, ChatMessage, AttachedFile } from '../utils/gemini';
import { 
  getResearchSessions, getResearchMessages, saveResearchSession, deleteResearchSession,
  ResearchSession 
} from '../utils/supabase';
import { marked } from 'marked';
import styles from './ResearchTab.module.css';

interface ResearchTabProps {
  onAddToast: (message: string) => void;
}

const STARTER_QUESTIONS = [
  "Explain the pathology of acute coronary syndrome",
  "Differentiate Crohn's disease and Ulcerative Colitis",
  "What are the first-line treatments for diabetic ketoacidosis?"
];

export default function ResearchTab({ onAddToast }: ResearchTabProps) {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [sessions, setSessions] = useState<ResearchSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to generate a new session ID
  const generateSessionId = () => 'res_' + Math.random().toString(36).substring(2, 15);

  // Load sessions from Supabase/cache
  useEffect(() => {
    const loadSessions = async () => {
      const fetchedSessions = await getResearchSessions();
      setSessions(fetchedSessions);

      if (fetchedSessions.length > 0) {
        const firstSession = fetchedSessions[0];
        setCurrentSessionId(firstSession.id);
        const msgs = await getResearchMessages(firstSession.id);
        setMessages(msgs);
      } else {
        const newSessId = generateSessionId();
        setCurrentSessionId(newSessId);
        setMessages([]);
      }
    };
    loadSessions();
  }, []);

  // Scroll to bottom
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

  // Switch research sessions
  const handleSelectSession = async (sessionId: string) => {
    setIsHistoryOpen(false);
    if (sessionId === currentSessionId) return;
    setIsLoading(true);
    setCurrentSessionId(sessionId);
    try {
      const msgs = await getResearchMessages(sessionId);
      setMessages(msgs);
    } catch (err) {
      console.error(err);
      onAddToast("Failed to load research session. 💙");
    } finally {
      setIsLoading(false);
    }
  };

  // Start new clean research session
  const handleNewChat = () => {
    setIsHistoryOpen(false);
    const newSessId = generateSessionId();
    setCurrentSessionId(newSessId);
    setMessages([]);
    onAddToast("New research thread started! 🔬");
  };

  // Delete research session
  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteResearchSession(sessionId);
      const updatedSessions = sessions.filter(s => s.id !== sessionId);
      setSessions(updatedSessions);
      onAddToast("Research thread deleted. 🧹");

      if (currentSessionId === sessionId) {
        if (updatedSessions.length > 0) {
          setCurrentSessionId(updatedSessions[0].id);
          const msgs = await getResearchMessages(updatedSessions[0].id);
          setMessages(msgs);
        } else {
          const newSessId = generateSessionId();
          setCurrentSessionId(newSessId);
          setMessages([]);
        }
      }
    } catch (err) {
      console.error("Failed to delete research session:", err);
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
      const rawTitle = textToSend.trim() || 'Attached File';
      sessionTitle = rawTitle.substring(0, 26) + (rawTitle.length > 26 ? '...' : '');
    }

    // Save session message array to Supabase
    await saveResearchSession(currentSessionId, sessionTitle, updatedMessages);

    // Refresh sessions list
    const fetchedSessions = await getResearchSessions();
    setSessions(fetchedSessions);

    try {
      const reply = await generateResearchResponse(updatedMessages, textToSend, filePayload);
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
          <span>Research History</span>
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
                    title="Delete Research Thread"
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
            <span>Research History</span>
          </button>
          <span className={styles.mobileActiveTitle}>
            {sessions.find(s => s.id === currentSessionId)?.title || 'New Chat'}
          </span>
        </div>
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

        {/* Input area & attachments */}
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
              placeholder="Ask a medical question, upload slide PDFs or diagnostic images..."
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
