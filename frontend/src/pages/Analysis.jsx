import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, useOutletContext } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Header from '../components/layout/Header';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Skeleton from '../components/common/Skeleton';
import { papersApi } from '../api/papers';
import { documentsApi } from '../api/documents';
import { useToast } from '../context/ToastContext';
import { formatDate } from '../utils/formatters';
import {
  FileSearch,
  Sparkles,
  BookOpen,
  Target,
  Cpu,
  Database,
  BarChart2,
  AlertTriangle,
  Compass,
  Layers,
  RefreshCw,
  Clock,
  CheckCircle,
} from 'lucide-react';

export default function Analysis() {
  const { setMobileOpen } = useOutletContext();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { success, error, info } = useToast();

  const [documents, setDocuments] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState('');
  const [summaryType, setSummaryType] = useState('comprehensive');

  const [summaryData, setSummaryData] = useState(null);
  const [isCheckingCache, setIsCheckingCache] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);

  // Load documents on mount
  useEffect(() => {
    async function loadDocuments() {
      setIsLoadingDocs(true);
      try {
        const data = await documentsApi.list(0, 100);
        const docs = data.documents || [];
        setDocuments(docs);

        const paramDocId = searchParams.get('documentId');
        if (paramDocId && docs.some((d) => d.id === paramDocId)) {
          setSelectedDocId(paramDocId);
        } else if (docs.length > 0) {
          setSelectedDocId(docs[0].id);
        }
      } catch (err) {
        error(err.message || 'Failed to load research papers.');
      } finally {
        setIsLoadingDocs(false);
      }
    }
    loadDocuments();
  }, []);

  // When selectedDocId changes, check for persistent SQLite cached summary
  useEffect(() => {
    if (!selectedDocId) {
      setSummaryData(null);
      return;
    }

    let isSubscribed = true;
    async function checkExistingSummary() {
      setIsCheckingCache(true);
      try {
        const cached = await papersApi.getSummary(selectedDocId);
        if (isSubscribed && cached) {
          setSummaryData(cached);
          if (cached.summary_type) {
            setSummaryType(cached.summary_type);
          }
        }
      } catch (err) {
        // 404 Not Found is expected if not generated yet
        if (isSubscribed) {
          setSummaryData(null);
        }
      } finally {
        if (isSubscribed) {
          setIsCheckingCache(false);
        }
      }
    }

    checkExistingSummary();
    return () => {
      isSubscribed = false;
    };
  }, [selectedDocId]);

  const handleGenerate = async (forceRefresh = false) => {
    if (!selectedDocId) return;
    setIsGenerating(true);
    if (forceRefresh) {
      info('Re-running academic deconstruction via active LLM...');
    }
    try {
      const result = await papersApi.summarize(selectedDocId, {
        summaryType,
        forceRefresh,
      });
      setSummaryData(result);
      success(forceRefresh ? 'Fresh analysis synthesized.' : 'Academic summary ready.');
    } catch (err) {
      error(err.message || 'Failed to generate academic summary.');
    } finally {
      setIsGenerating(false);
    }
  };

  const selectedDoc = documents.find((d) => d.id === selectedDocId);

  return (
    <div>
      <Header
        setMobileOpen={setMobileOpen}
        pageTitle="Paper Analysis"
        pageSubtitle="ACADEMIC DECONSTRUCTION // METHODOLOGY & EMPIRICAL FINDINGS"
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Selection & Controls Bar */}
        <div className="p-5 bg-cream-surface dark:bg-warmdark-surface border border-cream-border dark:border-warmdark-border rounded-md shadow-editorial">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 font-mono">
            {/* Paper Picker */}
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-bold text-cream-text dark:text-warmdark-text uppercase block">
                // SELECT_PAPER
              </label>
              <select
                value={selectedDocId}
                onChange={(e) => setSelectedDocId(e.target.value)}
                disabled={isGenerating || isLoadingDocs || documents.length === 0}
                className="w-full px-3 py-2 bg-cream-secondary/40 dark:bg-warmdark-elevated border border-cream-border dark:border-warmdark-border rounded-sm text-xs text-cream-text dark:text-warmdark-text font-bold focus:outline-none cursor-pointer"
              >
                {documents.length === 0 ? (
                  <option value="">NO PAPERS AVAILABLE IN LIBRARY</option>
                ) : (
                  documents.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title || d.original_filename} ({d.page_count}p)
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Depth Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-cream-text dark:text-warmdark-text uppercase block">
                // DEPTH_MODE
              </label>
              <div className="flex items-center gap-1 border border-cream-border dark:border-warmdark-border rounded-sm p-1 bg-cream-secondary/30 dark:bg-warmdark-elevated">
                {[
                  { id: 'brief', label: 'BRIEF' },
                  { id: 'detailed', label: 'DETAILED' },
                  { id: 'comprehensive', label: 'COMPREHENSIVE' },
                ].map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setSummaryType(type.id)}
                    className={`px-3 py-1 text-xs font-medium rounded-xs transition-all cursor-pointer ${
                      summaryType === type.id
                        ? 'bg-sky-pale dark:bg-sky-deep/30 text-charcoal-main dark:text-sky-light font-bold shadow-editorial-sm'
                        : 'text-cream-muted dark:text-warmdark-muted hover:text-cream-text'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="sm:self-end flex items-center gap-2">
              {summaryData && (
                <Button
                  variant="outline"
                  size="md"
                  icon={RefreshCw}
                  onClick={() => handleGenerate(true)}
                  disabled={!selectedDocId || isGenerating}
                  isLoading={isGenerating}
                  className="font-mono text-xs uppercase"
                  title="Re-analyze with active LLM bypassing cached summary"
                >
                  Regenerate
                </Button>
              )}

              <Button
                variant="primary"
                size="md"
                icon={Sparkles}
                onClick={() => handleGenerate(false)}
                disabled={!selectedDocId || isGenerating}
                isLoading={isGenerating}
                className="w-full sm:w-auto font-mono text-xs uppercase"
              >
                {isGenerating
                  ? 'Synthesizing...'
                  : summaryData
                  ? 'Re-execute'
                  : 'Execute Analysis'}
              </Button>
            </div>
          </div>
        </div>

        {/* Results Canvas */}
        {isCheckingCache ? (
          <div className="p-8 border border-cream-border dark:border-warmdark-border bg-cream-surface dark:bg-warmdark-surface rounded-md shadow-editorial text-center space-y-3 font-mono">
            <RefreshCw className="w-6 h-6 text-sky-deep dark:text-sky-light animate-spin mx-auto" />
            <p className="text-xs text-cream-muted dark:text-warmdark-muted">
              // CHECKING_SQLITE_CACHED_ANALYSIS...
            </p>
          </div>
        ) : isGenerating ? (
          <div className="space-y-4 font-mono">
            <div className="p-8 border border-cream-border dark:border-warmdark-border bg-cream-surface dark:bg-warmdark-surface rounded-md shadow-editorial text-center space-y-3">
              <Sparkles className="w-8 h-8 text-sky-deep dark:text-sky-light animate-spin mx-auto" />
              <h3 className="text-sm font-bold text-cream-text dark:text-warmdark-text uppercase font-display">
                DECONSTRUCTING RESEARCH PAPER VIA LLM
              </h3>
              <p className="text-xs text-cream-muted dark:text-warmdark-muted max-w-md mx-auto font-sans">
                Parsing methodology formulations, mapping benchmark metrics, and isolating acknowledged caveats...
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-44 w-full" />
              <Skeleton className="h-44 w-full" />
              <Skeleton className="h-44 w-full" />
              <Skeleton className="h-44 w-full" />
            </div>
          </div>
        ) : summaryData ? (
          <div className="space-y-6">
            {/* Header Metadata Banner */}
            <div className="p-4 bg-sky-pale/40 dark:bg-sky-deep/15 border border-sky-primary rounded-md shadow-editorial flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-mono text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={summaryData.is_cached ? 'default' : 'sky'}>
                    {summaryData.is_cached ? 'CACHED ANALYSIS' : 'FRESH SYNTHESIS'}
                  </Badge>
                  <span className="font-bold text-cream-text dark:text-warmdark-text font-display">
                    {summaryData.title}
                  </span>
                </div>
                <p className="text-[11px] text-cream-muted dark:text-warmdark-muted">
                  GENERATED VIA {summaryData.llm_provider?.toUpperCase()} // MODEL: {summaryData.llm_model}
                  {summaryData.created_at && ` // ${formatDate(summaryData.created_at)}`}
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                icon={BookOpen}
                onClick={() => navigate(`/documents/${summaryData.document_id}`)}
              >
                Inspect Paper Text
              </Button>
            </div>

            {/* Overview / Executive Summary */}
            <div className="p-6 bg-cream-surface dark:bg-warmdark-surface border border-cream-border dark:border-warmdark-border rounded-md shadow-editorial space-y-3">
              <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-cream-text dark:text-warmdark-text border-b border-cream-border dark:border-warmdark-border pb-2">
                <BookOpen className="w-4 h-4 text-sky-deep dark:text-sky-light" />
                [01] EXECUTIVE SUMMARY
              </div>
              <div className="prose prose-sm max-w-none text-cream-text dark:text-warmdark-text font-serif text-sm leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {summaryData.short_summary}
                </ReactMarkdown>
              </div>
            </div>

            {/* Grid Sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Problem */}
              <div className="p-5 bg-cream-surface dark:bg-warmdark-surface border border-cream-border dark:border-warmdark-border rounded-md shadow-editorial-sm space-y-3">
                <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-cream-text dark:text-warmdark-text border-b border-cream-border dark:border-warmdark-border pb-2">
                  <Target className="w-4 h-4 text-sky-deep dark:text-sky-light" />
                  [02] PROBLEM STATEMENT & MOTIVATION
                </div>
                <div className="prose prose-sm max-w-none text-cream-text dark:text-warmdark-text font-sans">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {summaryData.problem_statement}
                  </ReactMarkdown>
                </div>
              </div>

              {/* Objectives */}
              <div className="p-5 bg-cream-surface dark:bg-warmdark-surface border border-cream-border dark:border-warmdark-border rounded-md shadow-editorial-sm space-y-3">
                <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-cream-text dark:text-warmdark-text border-b border-cream-border dark:border-warmdark-border pb-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  [03] RESEARCH OBJECTIVES & CONTRIBUTIONS
                </div>
                <div className="prose prose-sm max-w-none text-cream-text dark:text-warmdark-text font-sans">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {summaryData.research_objectives}
                  </ReactMarkdown>
                </div>
              </div>

              {/* Methodology */}
              <div className="p-5 bg-cream-surface dark:bg-warmdark-surface border border-cream-border dark:border-warmdark-border rounded-md shadow-editorial-sm space-y-3">
                <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-cream-text dark:text-warmdark-text border-b border-cream-border dark:border-warmdark-border pb-2">
                  <Cpu className="w-4 h-4 text-sky-deep dark:text-sky-light" />
                  [04] METHODOLOGY & FORMULATIONS
                </div>
                <div className="prose prose-sm max-w-none text-cream-text dark:text-warmdark-text font-sans">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {summaryData.methodology}
                  </ReactMarkdown>
                </div>
              </div>

              {/* Architecture (if present) */}
              {summaryData.architecture && (
                <div className="p-5 bg-cream-surface dark:bg-warmdark-surface border border-cream-border dark:border-warmdark-border rounded-md shadow-editorial-sm space-y-3">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-cream-text dark:text-warmdark-text border-b border-cream-border dark:border-warmdark-border pb-2">
                    <Layers className="w-4 h-4 text-sky-deep dark:text-sky-light" />
                    [05] SYSTEM ARCHITECTURE
                  </div>
                  <div className="prose prose-sm max-w-none text-cream-text dark:text-warmdark-text font-sans">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {summaryData.architecture}
                    </ReactMarkdown>
                  </div>
                </div>
              )}

              {/* Dataset (if present) */}
              {summaryData.dataset && (
                <div className="p-5 bg-cream-surface dark:bg-warmdark-surface border border-cream-border dark:border-warmdark-border rounded-md shadow-editorial-sm space-y-3">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-cream-text dark:text-warmdark-text border-b border-cream-border dark:border-warmdark-border pb-2">
                    <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    [06] DATASETS & BENCHMARKS
                  </div>
                  <div className="prose prose-sm max-w-none text-cream-text dark:text-warmdark-text font-sans">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {summaryData.dataset}
                    </ReactMarkdown>
                  </div>
                </div>
              )}

              {/* Results */}
              <div className="p-5 bg-cream-surface dark:bg-warmdark-surface border border-cream-border dark:border-warmdark-border rounded-md shadow-editorial-sm space-y-3">
                <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-cream-text dark:text-warmdark-text border-b border-cream-border dark:border-warmdark-border pb-2">
                  <BarChart2 className="w-4 h-4 text-sky-deep dark:text-sky-light" />
                  [07] EMPIRICAL RESULTS & METRICS
                </div>
                <div className="prose prose-sm max-w-none text-cream-text dark:text-warmdark-text font-sans">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {summaryData.results}
                  </ReactMarkdown>
                </div>
              </div>

              {/* Limitations */}
              {summaryData.limitations && (
                <div className="p-5 bg-vermilion-pale/20 dark:bg-vermilion-deep/15 border border-vermilion-primary/40 rounded-md shadow-editorial-sm space-y-3">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-vermilion-deep dark:text-vermilion-soft border-b border-vermilion-primary/40 pb-2">
                    <AlertTriangle className="w-4 h-4 text-vermilion-primary" />
                    [08] ACKNOWLEDGED LIMITATIONS
                  </div>
                  <div className="prose prose-sm max-w-none text-cream-text dark:text-warmdark-text font-sans">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {summaryData.limitations}
                    </ReactMarkdown>
                  </div>
                </div>
              )}

              {/* Future Directions */}
              {summaryData.future_directions && (
                <div className="p-5 bg-sky-pale/30 dark:bg-sky-deep/15 border border-sky-primary/40 rounded-md shadow-editorial-sm space-y-3">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-sky-deep dark:text-sky-light border-b border-sky-primary/40 pb-2">
                    <Compass className="w-4 h-4 text-sky-deep dark:text-sky-light" />
                    [09] FUTURE RESEARCH AVENUES
                  </div>
                  <div className="prose prose-sm max-w-none text-cream-text dark:text-warmdark-text font-sans">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {summaryData.future_directions}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Empty / Prompt State */
          <div className="p-12 text-center border border-cream-border dark:border-warmdark-border bg-cream-surface dark:bg-warmdark-surface rounded-md shadow-editorial space-y-4 font-mono">
            <div className="w-14 h-14 border border-charcoal-main dark:border-warmdark-border bg-sky-pale dark:bg-sky-deep/20 text-sky-deep dark:text-sky-light rounded-xs flex items-center justify-center mx-auto shadow-editorial-sm">
              <FileSearch className="w-7 h-7" />
            </div>
            <div className="max-w-md mx-auto">
              <h3 className="text-base font-bold text-cream-text dark:text-warmdark-text uppercase font-display">
                READY FOR ACADEMIC DECONSTRUCTION
              </h3>
              <p className="text-xs text-cream-muted dark:text-warmdark-muted mt-1 font-sans">
                Select a paper above to generate a structured academic analysis identifying motivations, contributions, methodology, datasets, and limitations.
              </p>
            </div>
            {selectedDoc && (
              <Button
                variant="primary"
                size="sm"
                icon={Sparkles}
                onClick={() => handleGenerate(false)}
              >
                Analyze "{selectedDoc.title || selectedDoc.original_filename}"
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
