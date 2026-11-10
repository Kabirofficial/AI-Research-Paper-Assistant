import React, { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import Header from '../components/layout/Header';
import Card, { CardHeader } from '../components/common/Card';
import Button from '../components/common/Button';
import Badge, { StatusBadge } from '../components/common/Badge';
import Skeleton from '../components/common/Skeleton';
import { documentsApi } from '../api/documents';
import { useBackendStatus } from '../context/BackendStatusContext';
import { formatBytes, formatDate } from '../utils/formatters';
import {
  BookOpen,
  FileText,
  CheckCircle,
  MessageSquare,
  Scale,
  Upload,
  ArrowRight,
  Server,
  Layers,
  Database,
  ExternalLink,
  Terminal,
  Sparkles,
} from 'lucide-react';

export default function Dashboard() {
  const { setMobileOpen } = useOutletContext();
  const navigate = useNavigate();
  const { isOnline, healthData } = useBackendStatus();

  const [documents, setDocuments] = useState([]);
  const [totalDocs, setTotalDocs] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadDashboardData() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await documentsApi.list(0, 50);
        setDocuments(data.documents || []);
        setTotalDocs(data.total || 0);
      } catch (err) {
        setError(err.message || 'Failed to load dashboard data.');
      } finally {
        setIsLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  const completedDocs = documents.filter((d) => d.processing_status === 'completed').length;
  const totalPages = documents.reduce((sum, d) => sum + (d.page_count || 0), 0);
  const recentDocs = documents.slice(0, 5);

  return (
    <div>
      <Header
        setMobileOpen={setMobileOpen}
        pageTitle="Research Dashboard"
        pageSubtitle="LOCAL-FIRST ACADEMIC RAG ENGINE"
        actions={
          <Button
            variant="vermilion"
            size="sm"
            icon={Upload}
            onClick={() => navigate('/library?action=upload')}
          >
            Upload Paper
          </Button>
        }
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Editorial Hero Block */}
        <div className="p-6 sm:p-8 bg-cream-surface dark:bg-warmdark-surface border border-cream-border dark:border-warmdark-border rounded-md shadow-editorial">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 bg-sky-pale dark:bg-sky-deep/20 text-sky-deep dark:text-sky-light border border-sky-primary rounded-xs font-mono text-xs font-medium uppercase tracking-wider">
              <Terminal className="w-3.5 h-3.5 text-sky-deep dark:text-sky-light" />
              SYSTEM_STATE: OPERATIONAL
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-cream-text dark:text-warmdark-text tracking-tight font-display">
              Research, Understood.
            </h2>
            <p className="text-xs sm:text-sm text-cream-muted dark:text-warmdark-muted font-sans leading-relaxed">
              Offline-first academic paper ingestion, dense FAISS vector embeddings, grounded multi-turn conversations with verifiable page-level citations, and multi-document comparative synthesis.
            </p>
          </div>
        </div>

        {/* Real Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Stat 1: Total Papers */}
          <div className="p-5 bg-cream-surface dark:bg-warmdark-surface border border-cream-border dark:border-warmdark-border rounded-md shadow-editorial-sm">
            <div className="flex items-center justify-between pb-2 border-b border-cream-border dark:border-warmdark-border">
              <span className="font-mono text-xs font-medium uppercase text-cream-muted dark:text-warmdark-muted">
                [01] PAPERS
              </span>
              <BookOpen className="w-4 h-4 text-sky-deep dark:text-sky-light" />
            </div>
            <div className="mt-3">
              {isLoading ? (
                <Skeleton className="h-9 w-16" />
              ) : (
                <p className="text-3xl sm:text-4xl font-black text-cream-text dark:text-warmdark-text font-display">
                  {totalDocs}
                </p>
              )}
              <p className="text-[11px] font-mono text-cream-muted dark:text-warmdark-muted mt-1">
                IN REPOSITORY
              </p>
            </div>
          </div>

          {/* Stat 2: Processed Papers */}
          <div className="p-5 bg-sky-pale/40 dark:bg-sky-deep/15 border border-sky-primary rounded-md shadow-editorial-sm">
            <div className="flex items-center justify-between pb-2 border-b border-sky-primary/40">
              <span className="font-mono text-xs font-medium uppercase text-sky-deep dark:text-sky-light">
                [02] INDEXED
              </span>
              <CheckCircle className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            </div>
            <div className="mt-3">
              {isLoading ? (
                <Skeleton className="h-9 w-16" />
              ) : (
                <p className="text-3xl sm:text-4xl font-black text-cream-text dark:text-warmdark-text font-display">
                  {completedDocs}
                </p>
              )}
              <p className="text-[11px] font-mono text-sky-deep dark:text-sky-light mt-1">
                EMBEDDED IN FAISS
              </p>
            </div>
          </div>

          {/* Stat 3: Total Pages */}
          <div className="p-5 bg-cream-surface dark:bg-warmdark-surface border border-cream-border dark:border-warmdark-border rounded-md shadow-editorial-sm">
            <div className="flex items-center justify-between pb-2 border-b border-cream-border dark:border-warmdark-border">
              <span className="font-mono text-xs font-medium uppercase text-cream-muted dark:text-warmdark-muted">
                [03] PAGES
              </span>
              <FileText className="w-4 h-4 text-sky-deep dark:text-sky-light" />
            </div>
            <div className="mt-3">
              {isLoading ? (
                <Skeleton className="h-9 w-16" />
              ) : (
                <p className="text-3xl sm:text-4xl font-black text-cream-text dark:text-warmdark-text font-display">
                  {totalPages}
                </p>
              )}
              <p className="text-[11px] font-mono text-cream-muted dark:text-warmdark-muted mt-1">
                EXTRACTED
              </p>
            </div>
          </div>

          {/* Stat 4: LLM Provider */}
          <div className="p-5 bg-cream-surface dark:bg-warmdark-surface border border-cream-border dark:border-warmdark-border rounded-md shadow-editorial-sm">
            <div className="flex items-center justify-between pb-2 border-b border-cream-border dark:border-warmdark-border">
              <span className="font-mono text-xs font-medium uppercase text-cream-muted dark:text-warmdark-muted">
                [04] PROVIDER
              </span>
              <Server className="w-4 h-4 text-vermilion-primary" />
            </div>
            <div className="mt-3">
              <p className="text-2xl sm:text-3xl font-black text-cream-text dark:text-warmdark-text font-display uppercase truncate">
                {healthData?.llm_provider || 'LOCAL'}
              </p>
              <p className="text-[11px] font-mono text-sky-deep dark:text-sky-light mt-1 font-medium">
                {healthData?.environment ? `ENV: ${healthData.environment.toUpperCase()}` : 'READY'}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions Bar */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-mono font-medium text-xs uppercase tracking-wider text-cream-muted dark:text-warmdark-muted">
              // WORKSPACE_ACTIONS
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
            {/* Action 1 */}
            <button
              onClick={() => navigate('/library?action=upload')}
              className="p-4 bg-cream-surface dark:bg-warmdark-surface border border-cream-border dark:border-warmdark-border rounded-md shadow-editorial-sm hover:border-charcoal-main dark:hover:border-warmdark-sky active:translate-x-[1px] active:translate-y-[1px] active:shadow-none text-left transition-all cursor-pointer group"
            >
              <div className="w-8 h-8 border border-charcoal-main dark:border-warmdark-border bg-sky-pale dark:bg-sky-deep/20 text-sky-deep dark:text-sky-light rounded-xs flex items-center justify-center mb-3">
                <Upload className="w-4 h-4" />
              </div>
              <p className="font-bold text-xs text-cream-text dark:text-warmdark-text uppercase font-display">
                Upload Paper
              </p>
              <p className="text-[11px] text-cream-muted dark:text-warmdark-muted mt-1 font-sans">
                Drag-and-drop PDF with SHA-256 validation
              </p>
            </button>

            {/* Action 2 */}
            <button
              onClick={() => navigate('/library')}
              className="p-4 bg-cream-surface dark:bg-warmdark-surface border border-cream-border dark:border-warmdark-border rounded-md shadow-editorial-sm hover:border-charcoal-main dark:hover:border-warmdark-sky active:translate-x-[1px] active:translate-y-[1px] active:shadow-none text-left transition-all cursor-pointer group"
            >
              <div className="w-8 h-8 border border-charcoal-main dark:border-warmdark-border bg-sky-pale dark:bg-sky-deep/20 text-sky-deep dark:text-sky-light rounded-xs flex items-center justify-center mb-3">
                <BookOpen className="w-4 h-4" />
              </div>
              <p className="font-bold text-xs text-cream-text dark:text-warmdark-text uppercase font-display">
                Research Library
              </p>
              <p className="text-[11px] text-cream-muted dark:text-warmdark-muted mt-1 font-sans">
                Inspect extracted page text and chunks
              </p>
            </button>

            {/* Action 3 */}
            <button
              onClick={() => navigate('/chat')}
              className="p-4 bg-cream-surface dark:bg-warmdark-surface border border-cream-border dark:border-warmdark-border rounded-md shadow-editorial-sm hover:border-charcoal-main dark:hover:border-warmdark-sky active:translate-x-[1px] active:translate-y-[1px] active:shadow-none text-left transition-all cursor-pointer group"
            >
              <div className="w-8 h-8 border border-charcoal-main dark:border-warmdark-border bg-sky-primary text-charcoal-main rounded-xs flex items-center justify-center mb-3">
                <MessageSquare className="w-4 h-4" />
              </div>
              <p className="font-bold text-xs text-cream-text dark:text-warmdark-text uppercase font-display">
                AI Research Chat
              </p>
              <p className="text-[11px] text-cream-muted dark:text-warmdark-muted mt-1 font-sans">
                Grounded RAG with verified page citations
              </p>
            </button>

            {/* Action 4 */}
            <button
              onClick={() => navigate('/comparison')}
              className="p-4 bg-cream-surface dark:bg-warmdark-surface border border-cream-border dark:border-warmdark-border rounded-md shadow-editorial-sm hover:border-charcoal-main dark:hover:border-warmdark-sky active:translate-x-[1px] active:translate-y-[1px] active:shadow-none text-left transition-all cursor-pointer group"
            >
              <div className="w-8 h-8 border border-charcoal-main dark:border-warmdark-border bg-sky-pale dark:bg-sky-deep/20 text-sky-deep dark:text-sky-light rounded-xs flex items-center justify-center mb-3">
                <Scale className="w-4 h-4" />
              </div>
              <p className="font-bold text-xs text-cream-text dark:text-warmdark-text uppercase font-display">
                Compare Papers
              </p>
              <p className="text-[11px] text-cream-muted dark:text-warmdark-muted mt-1 font-sans">
                Multi-document methodology comparison
              </p>
            </button>
          </div>
        </div>

        {/* Recent Papers Table + Diagnostics Split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-mono">
          {/* Recent Papers (2 cols) */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-xs uppercase tracking-wider text-cream-muted dark:text-warmdark-muted">
                // RECENT_DOCUMENTS
              </h3>
              {recentDocs.length > 0 && (
                <button
                  onClick={() => navigate('/library')}
                  className="text-xs font-semibold text-sky-deep dark:text-sky-light hover:underline inline-flex items-center gap-1 cursor-pointer font-sans"
                >
                  View All
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="bg-cream-surface dark:bg-warmdark-surface border border-cream-border dark:border-warmdark-border rounded-md shadow-editorial-sm overflow-hidden">
              {isLoading ? (
                <div className="p-5 space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : recentDocs.length === 0 ? (
                <div className="p-8 text-center space-y-3">
                  <div className="w-12 h-12 border border-cream-border dark:border-warmdark-border bg-sky-pale dark:bg-sky-deep/20 text-sky-deep dark:text-sky-light rounded-xs mx-auto flex items-center justify-center">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-cream-text dark:text-warmdark-text uppercase font-display">
                      NO PAPERS DETECTED
                    </h4>
                    <p className="text-xs text-cream-muted dark:text-warmdark-muted mt-1 font-sans">
                      Ingest your first academic paper to initiate semantic search and RAG capabilities.
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={Upload}
                    onClick={() => navigate('/library?action=upload')}
                  >
                    Ingest Paper
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-cream-border dark:divide-warmdark-border">
                  {recentDocs.map((doc, idx) => (
                    <div
                      key={doc.id}
                      onClick={() => navigate(`/documents/${doc.id}`)}
                      className="p-3.5 hover:bg-cream-secondary/40 dark:hover:bg-warmdark-elevated transition-colors cursor-pointer flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-cream-muted dark:text-warmdark-muted font-bold">
                            #{idx + 1}
                          </span>
                          <h4 className="text-xs font-bold text-cream-text dark:text-warmdark-text truncate font-display">
                            {doc.title || doc.original_filename}
                          </h4>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-cream-muted dark:text-warmdark-muted mt-0.5 truncate">
                          <span>{doc.original_filename}</span>
                          <span>•</span>
                          <span>{doc.page_count}p</span>
                          <span>•</span>
                          <span>{formatBytes(doc.file_size)}</span>
                          <span>•</span>
                          <span>{formatDate(doc.created_at)}</span>
                        </div>
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        <StatusBadge status={doc.processing_status} />
                        <ExternalLink className="w-3.5 h-3.5 text-cream-muted dark:text-warmdark-muted" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* System Diagnostics (1 col) */}
          <div className="space-y-3">
            <h3 className="font-medium text-xs uppercase tracking-wider text-cream-muted dark:text-warmdark-muted">
              // SYSTEM_DIAGNOSTICS
            </h3>
            <div className="p-4 bg-cream-surface dark:bg-warmdark-surface border border-cream-border dark:border-warmdark-border rounded-md shadow-editorial-sm space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-cream-border dark:border-warmdark-border">
                <span className="text-cream-muted dark:text-warmdark-muted flex items-center gap-1.5 font-medium">
                  <Database className="w-3.5 h-3.5 text-sky-deep dark:text-sky-light" />
                  SQLITE_DB:
                </span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400">
                  [{healthData?.database?.toUpperCase() || 'HEALTHY'}]
                </span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-cream-border dark:border-warmdark-border">
                <span className="text-cream-muted dark:text-warmdark-muted flex items-center gap-1.5 font-medium">
                  <Layers className="w-3.5 h-3.5 text-sky-deep dark:text-sky-light" />
                  FAISS_STORE:
                </span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400">
                  [{healthData?.storage?.toUpperCase() || 'READY'}]
                </span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-cream-border dark:border-warmdark-border">
                <span className="text-cream-muted dark:text-warmdark-muted flex items-center gap-1.5 font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-sky-deep dark:text-sky-light" />
                  EMBEDDINGS:
                </span>
                <span className="font-bold text-cream-text dark:text-warmdark-text truncate max-w-[120px]">
                  BGE-SMALL-EN
                </span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-cream-border dark:border-warmdark-border">
                <span className="text-cream-muted dark:text-warmdark-muted flex items-center gap-1.5 font-medium">
                  <Server className="w-3.5 h-3.5 text-sky-deep dark:text-sky-light" />
                  ACTIVE_LLM:
                </span>
                <span className="font-bold text-sky-deep dark:text-sky-light uppercase">
                  {healthData?.llm_provider || 'OLLAMA'}
                </span>
              </div>

              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs font-mono"
                  onClick={() => navigate('/settings')}
                >
                  CONFIGURE_SETTINGS
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
