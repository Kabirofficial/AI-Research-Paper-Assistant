import React, { useEffect, useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Header from '../components/layout/Header';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Skeleton from '../components/common/Skeleton';
import ConfirmationModal from '../components/common/ConfirmationModal';
import { papersApi } from '../api/papers';
import { documentsApi } from '../api/documents';
import { useToast } from '../context/ToastContext';
import { formatDate } from '../utils/formatters';
import {
  Scale,
  Sparkles,
  CheckSquare,
  Square,
  BookOpen,
  Target,
  Cpu,
  Layers,
  Database,
  BarChart2,
  TrendingUp,
  GitBranch,
  Trash2,
  Clock,
  History,
  Plus,
} from 'lucide-react';

export default function Comparison() {
  const { setMobileOpen } = useOutletContext();
  const navigate = useNavigate();
  const { success, error, warning } = useToast();

  const [activeTab, setActiveTab] = useState('new'); // 'new' | 'saved'
  const [documents, setDocuments] = useState([]);
  const [selectedDocIds, setSelectedDocIds] = useState([]);
  const [customTitle, setCustomTitle] = useState('');

  // Results & History
  const [comparisonData, setComparisonData] = useState(null);
  const [savedComparisons, setSavedComparisons] = useState([]);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);

  // Deletion modal
  const [deleteComp, setDeleteComp] = useState(null);
  const [isDeletingComp, setIsDeletingComp] = useState(false);

  // Load documents
  useEffect(() => {
    async function loadDocuments() {
      setIsLoadingDocs(true);
      try {
        const data = await documentsApi.list(0, 100);
        const docs = data.documents || [];
        setDocuments(docs);
        if (docs.length >= 2) {
          setSelectedDocIds([docs[0].id, docs[1].id]);
        }
      } catch (err) {
        error(err.message || 'Failed to load research documents.');
      } finally {
        setIsLoadingDocs(false);
      }
    }
    loadDocuments();
    loadSavedComparisons();
  }, []);

  const loadSavedComparisons = async () => {
    setIsLoadingSaved(true);
    try {
      const data = await papersApi.listComparisons(0, 50);
      setSavedComparisons(data.comparisons || []);
    } catch (err) {
      // Ignored if empty or fresh DB
    } finally {
      setIsLoadingSaved(false);
    }
  };

  const toggleSelectDoc = (id) => {
    setSelectedDocIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((dId) => dId !== id);
      } else {
        if (prev.length >= 10) {
          warning('Maximum 10 papers can be compared at once.');
          return prev;
        }
        return [...prev, id];
      }
    });
  };

  const handleRunComparison = async () => {
    if (selectedDocIds.length < 2) {
      warning('Select at least 2 research papers to run comparison.');
      return;
    }

    setIsComparing(true);
    setComparisonData(null);
    try {
      const result = await papersApi.compare({
        documentIds: selectedDocIds,
        title: customTitle.trim() || undefined,
      });
      setComparisonData(result);
      success(`Compared ${result.compared_papers?.length || selectedDocIds.length} papers successfully.`);
      loadSavedComparisons();
    } catch (err) {
      error(err.message || 'Failed to compare papers.');
    } finally {
      setIsComparing(false);
    }
  };

  const handleSelectSavedComparison = async (compId) => {
    setIsComparing(true);
    try {
      const detail = await papersApi.getComparison(compId);
      setComparisonData(detail);
      setActiveTab('new');
      success(`Loaded comparison "${detail.title || 'Saved Analysis'}"`);
    } catch (err) {
      error(err.message || 'Failed to load saved comparison.');
    } finally {
      setIsComparing(false);
    }
  };

  const confirmDeleteComparison = async () => {
    if (!deleteComp) return;
    setIsDeletingComp(true);
    try {
      await papersApi.deleteComparison(deleteComp.id);
      success('Comparison record removed.');
      setSavedComparisons((prev) => prev.filter((c) => c.id !== deleteComp.id));
      if (comparisonData?.id === deleteComp.id) {
        setComparisonData(null);
      }
      setDeleteComp(null);
    } catch (err) {
      error(err.message || 'Failed to delete saved comparison.');
    } finally {
      setIsDeletingComp(false);
    }
  };

  return (
    <div>
      <Header
        setMobileOpen={setMobileOpen}
        pageTitle="Paper Comparison"
        pageSubtitle="MULTI-DOCUMENT SYNTHESIS // METHODOLOGICAL TRADE-OFFS & GAPS"
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Navigation Tabs between New Comparison and Saved Analyses */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            onClick={() => setActiveTab('new')}
            className={`px-4 py-2 border rounded-sm font-medium uppercase transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'new'
                ? 'bg-sky-pale dark:bg-sky-deep/20 text-charcoal-main dark:text-sky-light font-bold border-sky-primary shadow-editorial-sm'
                : 'bg-cream-surface dark:bg-warmdark-surface text-cream-muted dark:text-warmdark-muted border-cream-border dark:border-warmdark-border hover:bg-cream-secondary/60'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            [01] SYNTHESIS ENGINE
          </button>

          <button
            onClick={() => setActiveTab('saved')}
            className={`px-4 py-2 border rounded-sm font-medium uppercase transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'saved'
                ? 'bg-sky-pale dark:bg-sky-deep/20 text-charcoal-main dark:text-sky-light font-bold border-sky-primary shadow-editorial-sm'
                : 'bg-cream-surface dark:bg-warmdark-surface text-cream-muted dark:text-warmdark-muted border-cream-border dark:border-warmdark-border hover:bg-cream-secondary/60'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            [02] PAST COMPARISONS ({savedComparisons.length})
          </button>
        </div>

        {/* Tab 1: New Comparison Engine */}
        {activeTab === 'new' && (
          <div className="space-y-6">
            {/* Paper Selection Workspace */}
            <div className="p-5 bg-cream-surface dark:bg-warmdark-surface border border-cream-border dark:border-warmdark-border rounded-md shadow-editorial space-y-4 font-mono">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-cream-border dark:border-warmdark-border">
                <div>
                  <h3 className="text-xs font-bold uppercase text-cream-text dark:text-warmdark-text">
                    // SELECT_PAPERS_FOR_COMPARISON ({selectedDocIds.length} / {documents.length} SELECTED)
                  </h3>
                  <p className="text-xs text-cream-muted dark:text-warmdark-muted mt-0.5 font-sans">
                    Select between 2 and 10 research papers to compare side-by-side
                  </p>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  icon={Scale}
                  onClick={handleRunComparison}
                  disabled={selectedDocIds.length < 2 || isComparing}
                  isLoading={isComparing}
                  className="uppercase"
                >
                  {isComparing ? 'Comparing...' : `Compare ${selectedDocIds.length} Papers`}
                </Button>
              </div>

              {/* Optional Custom Title Field */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-cream-muted dark:text-warmdark-muted uppercase">
                  // ANALYSIS_LABEL (OPTIONAL)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Transformer Architectures vs Convolutional Baselines"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-cream-secondary/40 dark:bg-warmdark-elevated border border-cream-border dark:border-warmdark-border rounded-sm text-xs font-sans text-cream-text dark:text-warmdark-text focus:outline-none focus:border-charcoal-main dark:focus:border-sky-primary"
                />
              </div>

              {/* Paper Checkbox Grid */}
              {isLoadingDocs ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : documents.length < 2 ? (
                <div className="p-6 text-center text-xs text-cream-muted dark:text-warmdark-muted space-y-2">
                  <p>// AT LEAST 2 PAPERS REQUIRED IN LIBRARY TO RUN COMPARISON</p>
                  <Button size="sm" variant="outline" onClick={() => navigate('/library?action=upload')}>
                    Upload Papers
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {documents.map((doc) => {
                    const isSelected = selectedDocIds.includes(doc.id);
                    return (
                      <div
                        key={doc.id}
                        onClick={() => toggleSelectDoc(doc.id)}
                        className={`p-3 border rounded-sm text-xs cursor-pointer transition-all flex items-start gap-3 ${
                          isSelected
                            ? 'border-sky-primary bg-sky-pale/50 dark:bg-sky-deep/20 text-cream-text dark:text-warmdark-text shadow-editorial-sm font-bold'
                            : 'border-cream-border dark:border-warmdark-border bg-cream-surface dark:bg-warmdark-surface text-cream-muted dark:text-warmdark-muted hover:border-charcoal-main dark:hover:border-warmdark-border'
                        }`}
                      >
                        <div className="mt-0.5 shrink-0 text-sky-deep dark:text-sky-light">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-sky-deep dark:text-sky-light" />
                          ) : (
                            <Square className="w-4 h-4 text-cream-muted dark:text-warmdark-muted" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold font-display truncate text-cream-text dark:text-warmdark-text">
                            {doc.title || doc.original_filename}
                          </p>
                          <p className="text-[10px] text-cream-muted dark:text-warmdark-muted font-mono truncate mt-0.5">
                            {doc.original_filename} • {doc.page_count}p
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Results Canvas */}
            {isComparing ? (
              <div className="space-y-4 font-mono">
                <div className="p-8 border border-cream-border dark:border-warmdark-border bg-cream-surface dark:bg-warmdark-surface rounded-md shadow-editorial text-center space-y-3">
                  <Scale className="w-8 h-8 text-sky-deep dark:text-sky-light animate-spin mx-auto" />
                  <h3 className="text-sm font-bold text-cream-text dark:text-warmdark-text uppercase font-display">
                    SYNTHESIZING CROSS-DOCUMENT TECHNICAL MATRIX
                  </h3>
                  <p className="text-xs text-cream-muted dark:text-warmdark-muted max-w-md mx-auto font-sans">
                    Correlating methodologies, detecting architecture divergence, analyzing benchmark metrics, and compiling research gaps...
                  </p>
                </div>
                <div className="space-y-4">
                  <Skeleton className="h-44 w-full" />
                  <Skeleton className="h-44 w-full" />
                  <Skeleton className="h-44 w-full" />
                </div>
              </div>
            ) : comparisonData ? (
              <div className="space-y-6">
                {/* Header: Compared Papers */}
                <div className="p-4 bg-sky-pale/40 dark:bg-sky-deep/15 border border-sky-primary rounded-md shadow-editorial font-mono text-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-sky-primary/40">
                    <span className="font-bold text-cream-text dark:text-warmdark-text uppercase font-display">
                      {comparisonData.title || `COMPARISON OF ${comparisonData.compared_papers?.length || 0} PAPERS`}
                    </span>
                    <span className="text-cream-muted dark:text-warmdark-muted font-bold">
                      VIA {comparisonData.llm_provider?.toUpperCase()} ({comparisonData.llm_model})
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-3">
                    {comparisonData.compared_papers?.map((p, idx) => (
                      <div
                        key={p.document_id || idx}
                        onClick={() => navigate(`/documents/${p.document_id}`)}
                        className="p-3 border border-cream-border dark:border-warmdark-border bg-cream-surface dark:bg-warmdark-surface rounded-sm text-xs cursor-pointer hover:bg-cream-secondary/40 transition-colors shadow-editorial-sm"
                      >
                        <p className="font-bold text-cream-text dark:text-warmdark-text truncate font-display">
                          {p.title}
                        </p>
                        <p className="text-[10px] text-cream-muted dark:text-warmdark-muted mt-0.5 truncate font-serif italic">
                          {p.authors || 'Authors unlisted'} {p.publication_year ? `(${p.publication_year})` : ''}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Comparison Sections */}
                <div className="space-y-6 font-mono text-xs">
                  {/* Problem */}
                  <div className="p-5 bg-cream-surface dark:bg-warmdark-surface border border-cream-border dark:border-warmdark-border rounded-md shadow-editorial-sm space-y-3">
                    <div className="flex items-center gap-2 font-bold uppercase text-cream-text dark:text-warmdark-text border-b border-cream-border dark:border-warmdark-border pb-2">
                      <Target className="w-4 h-4 text-sky-deep dark:text-sky-light" />
                      [01] PROBLEM FORMULATIONS COMPARED
                    </div>
                    <div className="prose prose-sm max-w-none text-cream-text dark:text-warmdark-text font-sans">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {comparisonData.problem_comparison}
                      </ReactMarkdown>
                    </div>
                  </div>

                  {/* Methodology */}
                  <div className="p-5 bg-cream-surface dark:bg-warmdark-surface border border-cream-border dark:border-warmdark-border rounded-md shadow-editorial-sm space-y-3">
                    <div className="flex items-center gap-2 font-bold uppercase text-cream-text dark:text-warmdark-text border-b border-cream-border dark:border-warmdark-border pb-2">
                      <Cpu className="w-4 h-4 text-sky-deep dark:text-sky-light" />
                      [02] METHODOLOGY & ALGORITHMIC APPROACHES
                    </div>
                    <div className="prose prose-sm max-w-none text-cream-text dark:text-warmdark-text font-sans">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {comparisonData.methodology_comparison}
                      </ReactMarkdown>
                    </div>
                  </div>

                  {/* Architecture */}
                  <div className="p-5 bg-cream-surface dark:bg-warmdark-surface border border-cream-border dark:border-warmdark-border rounded-md shadow-editorial-sm space-y-3">
                    <div className="flex items-center gap-2 font-bold uppercase text-cream-text dark:text-warmdark-text border-b border-cream-border dark:border-warmdark-border pb-2">
                      <Layers className="w-4 h-4 text-sky-deep dark:text-sky-light" />
                      [03] MODEL ARCHITECTURES & SYSTEM TOPOLOGIES
                    </div>
                    <div className="prose prose-sm max-w-none text-cream-text dark:text-warmdark-text font-sans">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {comparisonData.architecture_comparison}
                      </ReactMarkdown>
                    </div>
                  </div>

                  {/* Datasets */}
                  <div className="p-5 bg-cream-surface dark:bg-warmdark-surface border border-cream-border dark:border-warmdark-border rounded-md shadow-editorial-sm space-y-3">
                    <div className="flex items-center gap-2 font-bold uppercase text-cream-text dark:text-warmdark-text border-b border-cream-border dark:border-warmdark-border pb-2">
                      <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      [04] EVALUATION DATASETS, BENCHMARKS & METRICS
                    </div>
                    <div className="prose prose-sm max-w-none text-cream-text dark:text-warmdark-text font-sans">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {comparisonData.dataset_comparison}
                      </ReactMarkdown>
                    </div>
                  </div>

                  {/* Results */}
                  <div className="p-5 bg-cream-surface dark:bg-warmdark-surface border border-cream-border dark:border-warmdark-border rounded-md shadow-editorial-sm space-y-3">
                    <div className="flex items-center gap-2 font-bold uppercase text-cream-text dark:text-warmdark-text border-b border-cream-border dark:border-warmdark-border pb-2">
                      <BarChart2 className="w-4 h-4 text-sky-deep dark:text-sky-light" />
                      [05] REPORTED PERFORMANCE & EMPIRICAL FINDINGS
                    </div>
                    <div className="prose prose-sm max-w-none text-cream-text dark:text-warmdark-text font-sans">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {comparisonData.results_comparison}
                      </ReactMarkdown>
                    </div>
                  </div>

                  {/* Strengths & Weaknesses */}
                  <div className="p-5 bg-cream-surface dark:bg-warmdark-surface border border-cream-border dark:border-warmdark-border rounded-md shadow-editorial-sm space-y-3">
                    <div className="flex items-center gap-2 font-bold uppercase text-cream-text dark:text-warmdark-text border-b border-cream-border dark:border-warmdark-border pb-2">
                      <TrendingUp className="w-4 h-4 text-amber-500" />
                      [06] TRADE-OFF MATRIX & RELATIVE SHORTCOMINGS
                    </div>
                    <div className="prose prose-sm max-w-none text-cream-text dark:text-warmdark-text font-sans">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {comparisonData.strengths_and_weaknesses}
                      </ReactMarkdown>
                    </div>
                  </div>

                  {/* Research Gaps */}
                  <div className="p-5 bg-sky-pale/40 dark:bg-sky-deep/20 border border-sky-primary rounded-md shadow-editorial-sky space-y-3">
                    <div className="flex items-center gap-2 font-bold uppercase text-sky-deep dark:text-sky-light border-b border-sky-primary pb-2 font-display">
                      <GitBranch className="w-4 h-4" />
                      [07] SYNTHESIZED RESEARCH GAPS & FUTURE VECTORS
                    </div>
                    <div className="prose prose-sm max-w-none text-cream-text dark:text-warmdark-text font-sans">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {comparisonData.research_gaps}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Empty / Prompt State */
              <div className="p-12 text-center border border-cream-border dark:border-warmdark-border bg-cream-surface dark:bg-warmdark-surface rounded-md shadow-editorial space-y-4 font-mono">
                <div className="w-14 h-14 border border-charcoal-main dark:border-warmdark-border bg-sky-pale dark:bg-sky-deep/20 text-sky-deep dark:text-sky-light rounded-xs flex items-center justify-center mx-auto shadow-editorial-sm">
                  <Scale className="w-7 h-7" />
                </div>
                <div className="max-w-md mx-auto">
                  <h3 className="text-base font-bold text-cream-text dark:text-warmdark-text uppercase font-display">
                    COMPARATIVE SYNTHESIS ENGINE
                  </h3>
                  <p className="text-xs text-cream-muted dark:text-warmdark-muted mt-1 font-sans">
                    Select 2 or more research papers above to generate a synthesized cross-document comparison across methodologies, empirical results, and collective gaps.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Saved Comparisons List */}
        {activeTab === 'saved' && (
          <div className="space-y-4">
            <div className="p-5 bg-cream-surface dark:bg-warmdark-surface border border-cream-border dark:border-warmdark-border rounded-md shadow-editorial">
              <h3 className="text-xs font-bold font-mono uppercase text-cream-text dark:text-warmdark-text pb-3 border-b border-cream-border dark:border-warmdark-border">
                // PERSISTED_SQLITE_COMPARISONS ({savedComparisons.length})
              </h3>

              {isLoadingSaved ? (
                <div className="p-6 space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : savedComparisons.length === 0 ? (
                <div className="p-10 text-center text-xs font-mono text-cream-muted dark:text-warmdark-muted space-y-3">
                  <p>// NO PAST COMPARISONS STORED IN SQLITE DATABASE</p>
                  <Button variant="outline" size="sm" onClick={() => setActiveTab('new')}>
                    Launch New Comparison
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-cream-border dark:divide-warmdark-border mt-3 font-mono text-xs">
                  {savedComparisons.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => handleSelectSavedComparison(c.id)}
                      className="py-3 px-2 flex items-center justify-between gap-4 hover:bg-cream-secondary/40 dark:hover:bg-warmdark-elevated rounded-xs cursor-pointer transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-cream-text dark:text-warmdark-text truncate font-display">
                          {c.title || 'Untitled Comparison'}
                        </p>
                        <p className="text-[11px] text-cream-muted dark:text-warmdark-muted mt-0.5">
                          {c.document_count} PAPERS • VIA {c.llm_provider?.toUpperCase()} ({c.llm_model}) • {formatDate(c.created_at)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSelectSavedComparison(c.id)}
                        >
                          View Matrix
                        </Button>
                        <button
                          onClick={() => setDeleteComp(c)}
                          className="p-1.5 border border-cream-border dark:border-warmdark-border bg-vermilion-pale/60 dark:bg-vermilion-deep/20 hover:bg-vermilion-primary hover:text-white text-vermilion-deep dark:text-vermilion-soft rounded-xs transition-colors cursor-pointer"
                          title="Delete comparison"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!deleteComp}
        onClose={() => setDeleteComp(null)}
        onConfirm={confirmDeleteComparison}
        title="DELETE SAVED COMPARISON"
        message={`Delete saved comparison "${deleteComp?.title || 'Analysis'}" from SQLite database?`}
        isLoading={isDeletingComp}
      />
    </div>
  );
}
