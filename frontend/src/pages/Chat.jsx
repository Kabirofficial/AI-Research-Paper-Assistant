import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate, useOutletContext } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Header from '../components/layout/Header';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Skeleton from '../components/common/Skeleton';
import ConfirmationModal from '../components/common/ConfirmationModal';
import { chatApi } from '../api/chat';
import { documentsApi } from '../api/documents';
import { useBackendStatus } from '../context/BackendStatusContext';
import { useToast } from '../context/ToastContext';
import { formatDate } from '../utils/formatters';
import {
  Plus,
  Send,
  Trash2,
  Bot,
  User,
  Sparkles,
  ExternalLink,
  Loader2,
  FileText,
  Terminal,
} from 'lucide-react';

export default function Chat() {
  const { setMobileOpen } = useOutletContext();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { healthData } = useBackendStatus();
  const { success, error } = useToast();

  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);

  const [documents, setDocuments] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState('');

  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const [deleteConv, setDeleteConv] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadInitialData = async () => {
    try {
      const [convData, docData] = await Promise.all([
        chatApi.listConversations(0, 50),
        documentsApi.list(0, 100),
      ]);
      setConversations(convData.conversations || []);
      setDocuments(docData.documents || []);

      const urlDocId = searchParams.get('documentId');
      if (urlDocId) {
        setSelectedDocId(urlDocId);
        const existing = convData.conversations?.find((c) => c.document_id === urlDocId);
        if (existing) {
          selectConversation(existing.id);
        } else {
          startNewConversation(urlDocId);
        }
      } else if (convData.conversations && convData.conversations.length > 0) {
        selectConversation(convData.conversations[0].id);
      }
    } catch (err) {
      error(err.message || 'Failed to initialize chat workspace.');
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending]);

  const selectConversation = async (convId) => {
    if (!convId) return;
    setActiveConvId(convId);
    setIsLoadingHistory(true);
    try {
      const detail = await chatApi.getConversation(convId);
      setActiveConversation(detail);
      setMessages(detail.messages || []);
      setSelectedDocId(detail.document_id || '');
    } catch (err) {
      error(err.message || 'Failed to fetch conversation history.');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const startNewConversation = async (scopeDocId = selectedDocId) => {
    try {
      const doc = documents.find((d) => d.id === scopeDocId);
      const defaultTitle = doc
        ? `Chat: ${doc.title || doc.original_filename}`
        : 'New Research Conversation';

      const newConv = await chatApi.createConversation({
        title: defaultTitle,
        documentId: scopeDocId || null,
      });

      setConversations((prev) => [newConv, ...prev]);
      setActiveConvId(newConv.id);
      setActiveConversation({ ...newConv, messages: [] });
      setMessages([]);
      success('Initialized conversation session.');
    } catch (err) {
      error(err.message || 'Failed to create conversation.');
    }
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    const query = inputMessage.trim();
    if (!query || isSending) return;

    let currentId = activeConvId;
    if (!currentId) {
      try {
        const newConv = await chatApi.createConversation({
          documentId: selectedDocId || null,
        });
        setConversations((prev) => [newConv, ...prev]);
        setActiveConvId(newConv.id);
        currentId = newConv.id;
      } catch (err) {
        error('Failed to create session.');
        return;
      }
    }

    const tempUserMsg = {
      id: `temp-${Date.now()}`,
      conversation_id: currentId,
      role: 'user',
      content: query,
      sources: [],
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setInputMessage('');
    setIsSending(true);

    try {
      const response = await chatApi.sendMessage(currentId, query);
      setMessages((prev) => [...prev, response]);

      setConversations((prev) =>
        prev.map((c) =>
          c.id === currentId
            ? { ...c, updated_at: new Date().toISOString(), message_count: (c.message_count || 0) + 2 }
            : c
        )
      );
    } catch (err) {
      error(err.message || 'Failed to receive grounded answer.');
    } finally {
      setIsSending(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  };

  const confirmDelete = async () => {
    if (!deleteConv) return;
    setIsDeleting(true);
    try {
      await chatApi.deleteConversation(deleteConv.id);
      success('Conversation session purged.');
      setConversations((prev) => prev.filter((c) => c.id !== deleteConv.id));
      if (activeConvId === deleteConv.id) {
        setActiveConvId(null);
        setActiveConversation(null);
        setMessages([]);
      }
      setDeleteConv(null);
    } catch (err) {
      error(err.message || 'Failed to delete conversation.');
    } finally {
      setIsDeleting(false);
    }
  };

  const SUGGESTIONS = [
    'What is the core technical problem addressed in this paper?',
    'Summarize the methodology, architecture, and mathematical formulation.',
    'What benchmark datasets were evaluated and what were key quantitative results?',
    'What limitations, caveats, or failure modes are acknowledged?',
  ];

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header
        setMobileOpen={setMobileOpen}
        pageTitle="AI Research Chat"
        pageSubtitle="GROUNDED ACADEMIC RAG // PAGE-LEVEL CITATIONS"
        actions={
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => startNewConversation(selectedDocId)}
          >
            New Chat
          </Button>
        }
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Conversation History Sidebar */}
        <div className="w-72 border-r border-cream-border dark:border-warmdark-border bg-cream-surface dark:bg-warmdark-surface flex flex-col shrink-0 hidden md:flex font-mono">
          {/* Top: Scope Selector */}
          <div className="p-3 border-b border-cream-border dark:border-warmdark-border space-y-1.5 bg-cream-secondary/30 dark:bg-warmdark-elevated">
            <label className="text-[10px] font-bold text-cream-muted dark:text-warmdark-muted uppercase tracking-wider block">
              // KNOWLEDGE_SCOPE
            </label>
            <select
              value={selectedDocId}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedDocId(val);
                startNewConversation(val);
              }}
              className="w-full px-2.5 py-1.5 bg-cream-surface dark:bg-warmdark-surface border border-cream-border dark:border-warmdark-border rounded-xs text-xs text-cream-text dark:text-warmdark-text font-bold focus:outline-none cursor-pointer"
            >
              <option value="">WHOLE RESEARCH LIBRARY</option>
              {documents.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title || d.original_filename}
                </option>
              ))}
            </select>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {conversations.length === 0 ? (
              <div className="text-center p-6 text-cream-muted dark:text-warmdark-muted text-xs">
                // NO_ACTIVE_SESSIONS
              </div>
            ) : (
              conversations.map((c) => (
                <div
                  key={c.id}
                  onClick={() => selectConversation(c.id)}
                  className={`group flex items-center justify-between p-2.5 border rounded-sm text-xs cursor-pointer transition-all ${
                    activeConvId === c.id
                      ? 'bg-sky-pale dark:bg-sky-deep/20 text-charcoal-main dark:text-sky-light font-bold border-sky-primary shadow-editorial-sm'
                      : 'border-transparent text-cream-muted dark:text-warmdark-muted hover:border-cream-border hover:bg-cream-secondary/40 hover:text-cream-text'
                  }`}
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="truncate font-bold font-display">{c.title || 'Untitled Session'}</p>
                    <p className="text-[10px] text-cream-muted dark:text-warmdark-muted font-mono mt-0.5">
                      {formatDate(c.updated_at)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConv(c);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 border border-cream-border dark:border-warmdark-border hover:bg-vermilion-primary hover:text-white rounded-xs transition-opacity cursor-pointer text-cream-muted dark:text-warmdark-muted"
                    title="Delete session"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Main Chat Canvas */}
        <div className="flex-1 flex flex-col bg-cream-main dark:bg-warmdark-main overflow-hidden">
          {/* Active Chat Header */}
          <div className="h-12 px-4 border-b border-cream-border dark:border-warmdark-border flex items-center justify-between bg-cream-surface/90 dark:bg-warmdark-surface/90 font-mono text-xs">
            <div className="flex items-center gap-2 truncate">
              <span className="font-bold text-cream-text dark:text-warmdark-text uppercase truncate font-display">
                {activeConversation?.title || 'NEW RESEARCH CONVERSATION'}
              </span>
              {selectedDocId && (
                <Badge variant="sky" size="xs">
                  PAPER_SCOPED
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2 text-cream-muted dark:text-warmdark-muted font-bold text-[11px]">
              <span className="flex items-center gap-1">
                <Bot className="w-3.5 h-3.5 text-sky-deep dark:text-sky-light" />
                {healthData?.llm_provider?.toUpperCase() || 'LOCAL'}
              </span>
            </div>
          </div>

          {/* Messages Thread */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {isLoadingHistory ? (
              <div className="p-8 space-y-4 max-w-2xl mx-auto">
                <Skeleton className="h-16 w-3/4 ml-auto" />
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-16 w-2/3 ml-auto" />
              </div>
            ) : messages.length === 0 ? (
              /* Editorial Empty State */
              <div className="max-w-2xl mx-auto py-12 text-center space-y-6 font-mono">
                <div className="w-12 h-12 border border-charcoal-main dark:border-warmdark-border bg-sky-pale dark:bg-sky-deep/20 text-sky-deep dark:text-sky-light rounded-xs flex items-center justify-center mx-auto shadow-editorial-sm">
                  <Terminal className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-cream-text dark:text-warmdark-text uppercase tracking-tight font-display">
                    RESEARCH ASSISTANT RAG SESSION
                  </h3>
                  <p className="text-xs text-cream-muted dark:text-warmdark-muted mt-1 max-w-md mx-auto leading-relaxed font-sans">
                    Ask technical research questions grounded in your uploaded papers. Answers contain verifiable page citations extracted via dense vector retrieval.
                  </p>
                </div>

                {/* Suggestions Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left pt-2 font-mono">
                  {SUGGESTIONS.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setInputMessage(suggestion);
                        setTimeout(() => textareaRef.current?.focus(), 50);
                      }}
                      className="p-3 bg-cream-surface dark:bg-warmdark-surface border border-cream-border dark:border-warmdark-border rounded-md shadow-editorial-sm hover:border-charcoal-main dark:hover:border-warmdark-border text-xs text-cream-text dark:text-warmdark-text transition-all text-left flex items-start gap-2 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 shrink-0 text-sky-deep dark:text-sky-light mt-0.5" />
                      <span className="font-sans font-medium">{suggestion}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Message Thread */
              <div className="max-w-3xl mx-auto space-y-6">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-3 sm:gap-4 ${
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {/* Assistant Icon */}
                    {msg.role === 'assistant' && (
                      <div className="w-8 h-8 border border-charcoal-main dark:border-warmdark-border bg-sky-primary text-charcoal-main rounded-xs flex items-center justify-center shrink-0 shadow-editorial-sm mt-0.5 font-mono font-bold text-xs">
                        AI
                      </div>
                    )}

                    {/* Message Bubble */}
                    <div
                      className={`p-4 text-sm leading-relaxed max-w-[85%] border rounded-md shadow-editorial-sm ${
                        msg.role === 'user'
                          ? 'bg-sky-pale dark:bg-sky-deep/30 border-sky-primary text-charcoal-main dark:text-warmdark-text font-medium'
                          : 'bg-cream-surface dark:bg-warmdark-surface border-cream-border dark:border-warmdark-border text-cream-text dark:text-warmdark-text'
                      }`}
                    >
                      {msg.role === 'user' ? (
                        <div className="whitespace-pre-wrap font-sans">{msg.content}</div>
                      ) : (
                        <div className="space-y-4">
                          <div className="prose prose-sm max-w-none font-serif leading-relaxed text-cream-text dark:text-warmdark-text">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {msg.content}
                            </ReactMarkdown>
                          </div>

                          {/* Grounded Sources */}
                          {msg.sources && msg.sources.length > 0 && (
                            <div className="pt-3 border-t border-cream-border dark:border-warmdark-border space-y-2 font-mono">
                              <span className="text-[11px] font-bold text-cream-muted dark:text-warmdark-muted uppercase tracking-wider block">
                                // GROUNDED_SOURCES ({msg.sources.length}):
                              </span>
                              <div className="flex flex-wrap gap-2">
                                {msg.sources.map((src, sIdx) => (
                                  <button
                                    key={src.id || sIdx}
                                    onClick={() =>
                                      navigate(`/documents/${src.document_id}?page=${src.page_number}`)
                                    }
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 border border-cream-border dark:border-warmdark-border bg-cream-secondary/40 dark:bg-warmdark-elevated hover:bg-sky-pale text-xs text-cream-text dark:text-warmdark-text rounded-xs transition-all cursor-pointer group shadow-editorial-sm active:translate-x-[1px] active:translate-y-[1px]"
                                    title={`View on page ${src.page_number}`}
                                  >
                                    <FileText className="w-3.5 h-3.5 text-sky-deep dark:text-sky-light" />
                                    <span className="truncate max-w-[140px] font-sans">
                                      {src.document_title || src.original_filename || 'Paper'}
                                    </span>
                                    <span className="text-cream-muted dark:text-warmdark-muted">
                                      [p.{src.page_number}]
                                    </span>
                                    {src.relevance_score && (
                                      <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">
                                        {Math.round(src.relevance_score * 100)}%
                                      </span>
                                    )}
                                    <ExternalLink className="w-3 h-3 text-cream-muted dark:text-warmdark-muted group-hover:text-charcoal-main shrink-0" />
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* User Icon */}
                    {msg.role === 'user' && (
                      <div className="w-8 h-8 border border-cream-border dark:border-warmdark-border bg-cream-elevated dark:bg-warmdark-elevated text-cream-text dark:text-warmdark-text rounded-xs flex items-center justify-center shrink-0 shadow-editorial-sm mt-0.5 font-mono font-bold text-xs">
                        U
                      </div>
                    )}
                  </div>
                ))}

                {/* Assistant Generating State */}
                {isSending && (
                  <div className="flex gap-3 sm:gap-4 justify-start font-mono">
                    <div className="w-8 h-8 border border-charcoal-main dark:border-warmdark-border bg-sky-primary text-charcoal-main rounded-xs flex items-center justify-center shrink-0 shadow-editorial-sm mt-0.5 font-bold text-xs">
                      AI
                    </div>
                    <div className="p-3.5 bg-cream-surface dark:bg-warmdark-surface border border-cream-border dark:border-warmdark-border rounded-md shadow-editorial-sm text-cream-muted dark:text-warmdark-muted flex items-center gap-2 text-xs">
                      <Loader2 className="w-4 h-4 animate-spin text-sky-deep dark:text-sky-light" />
                      <span>// RETRIEVING_VECTOR_CHUNKS_&_SYNTHESIZING_GROUNDED_ANSWER...</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Chat Input Dock */}
          <div className="p-3 sm:p-4 bg-cream-surface dark:bg-warmdark-surface border-t border-cream-border dark:border-warmdark-border">
            <form
              onSubmit={handleSendMessage}
              className="max-w-3xl mx-auto flex items-end gap-2 bg-cream-secondary/40 dark:bg-warmdark-elevated border border-cream-border dark:border-warmdark-border rounded-md p-2 shadow-editorial-sm"
            >
              <textarea
                ref={textareaRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                rows={1}
                placeholder="Ask technical research questions (Enter to send, Shift+Enter for newline)..."
                disabled={isSending}
                className="flex-1 bg-transparent border-0 px-2 py-1 text-sm text-cream-text dark:text-warmdark-text placeholder-cream-muted dark:placeholder-warmdark-muted focus:outline-none resize-none max-h-32 min-h-[38px] font-sans"
              />

              <Button
                type="submit"
                variant="primary"
                size="icon"
                disabled={!inputMessage.trim() || isSending}
                isLoading={isSending}
                className="shrink-0"
                aria-label="Send"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!deleteConv}
        onClose={() => setDeleteConv(null)}
        onConfirm={confirmDelete}
        title="PURGE SESSION"
        message={`Delete session "${deleteConv?.title || 'conversation'}" and its persisted citations?`}
        isLoading={isDeleting}
      />
    </div>
  );
}
