import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams, useOutletContext } from 'react-router-dom';
import Header from '../components/layout/Header';
import Button from '../components/common/Button';
import Badge, { StatusBadge } from '../components/common/Badge';
import Skeleton from '../components/common/Skeleton';
import ConfirmationModal from '../components/common/ConfirmationModal';
import { documentsApi } from '../api/documents';
import { useToast } from '../context/ToastContext';
import { formatBytes, formatDate } from '../utils/formatters';
import {
  ArrowLeft,
  BookOpen,
  MessageSquare,
  Sparkles,
  Download,
  RefreshCw,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
} from 'lucide-react';

export default function DocumentDetails() {
  const { documentId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { setMobileOpen } = useOutletContext();
  const navigate = useNavigate();
  const { success, error, info } = useToast();

  const [document, setDocument] = useState(null);
  const [textData, setTextData] = useState(null);
  const [chunksData, setChunksData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('text');

  const initialPage = parseInt(searchParams.get('page'), 10) || 1;
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [isCopied, setIsCopied] = useState(false);

  const [isReprocessing, setIsReprocessing] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [doc, text, chunks] = await Promise.all([
        documentsApi.get(documentId),
        documentsApi.getText(documentId).catch(() => null),
        documentsApi.getChunks(documentId).catch(() => null),
      ]);
      setDocument(doc);
      setTextData(text);
      setChunksData(chunks);
    } catch (err) {
      error(err.message || 'Failed to load document details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [documentId]);

  useEffect(() => {
    const pageParam = parseInt(searchParams.get('page'), 10);
    if (pageParam && pageParam !== currentPage) {
      setCurrentPage(pageParam);
    }
  }, [searchParams]);

  const handlePageChange = (newPage) => {
    if (!textData || !textData.pages) return;
    if (newPage < 1 || newPage > textData.pages.length) return;
    setCurrentPage(newPage);
    setSearchParams({ page: newPage.toString() }, { replace: true });
  };

  const handleDownload = async () => {
    if (!document) return;
    try {
      await documentsApi.downloadBlob(document.id, document.original_filename);
      success(`Downloading ${document.original_filename}`);
    } catch (err) {
      error('Failed to download PDF.');
    }
  };

  const handleReprocess = async () => {
    setIsReprocessing(true);
    info('Reprocessing document...');
    try {
      await documentsApi.reprocess(documentId);
      success('Document reprocessed successfully.');
      loadData();
    } catch (err) {
      error(err.message || 'Reprocessing failed.');
    } finally {
      setIsReprocessing(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await documentsApi.delete(documentId);
      success('Document purged.');
      navigate('/library');
    } catch (err) {
      error(err.message || 'Failed to delete document.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopyText = (text) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    success('Text copied to clipboard');
  };

  if (isLoading) {
    return (
      <div>
        <Header setMobileOpen={setMobileOpen} pageTitle="Document Details" />
        <div className="p-6 max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div>
        <Header setMobileOpen={setMobileOpen} pageTitle="Document Not Found" />
        <div className="p-8 text-center max-w-md mx-auto space-y-4 font-mono">
          <p className="text-sm text-cream-muted dark:text-warmdark-muted">// Document does not exist or has been deleted.</p>
          <Button variant="primary" onClick={() => navigate('/library')}>
            Back to Library
          </Button>
        </div>
      </div>
    );
  }

  const currentPageObj = textData?.pages?.find((p) => p.page_number === currentPage);

  return (
    <div>
      <Header
        setMobileOpen={setMobileOpen}
        pageTitle={document.title || document.original_filename}
        pageSubtitle={document.original_filename}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={ArrowLeft}
              onClick={() => navigate('/library')}
            >
              Library
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={MessageSquare}
              onClick={() => navigate(`/chat?documentId=${document.id}`)}
            >
              Ask AI
            </Button>
          </div>
        }
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Document Header Metadata Card */}
        <div className="p-6 bg-cream-surface dark:bg-warmdark-surface border border-cream-border dark:border-warmdark-border rounded-md shadow-editorial space-y-4">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap font-mono text-xs">
                <StatusBadge status={document.processing_status} />
                <span className="font-medium text-cream-muted dark:text-warmdark-muted">
                  {formatBytes(document.file_size)}
                </span>
                <span className="text-cream-border dark:text-warmdark-border">•</span>
                <span className="font-medium text-cream-muted dark:text-warmdark-muted">
                  {document.page_count} PAGES
                </span>
                {document.publication_year && (
                  <>
                    <span className="text-cream-border dark:text-warmdark-border">•</span>
                    <span className="font-medium text-cream-muted dark:text-warmdark-muted">
                      YEAR: {document.publication_year}
                    </span>
                  </>
                )}
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-cream-text dark:text-warmdark-text tracking-tight font-display">
                {document.title || document.original_filename}
              </h2>

              {document.authors && (
                <p className="text-xs text-cream-text dark:text-warmdark-muted font-serif italic">
                  by {document.authors}
                </p>
              )}
            </div>

            {/* Actions Bar */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                icon={Download}
                onClick={handleDownload}
                title="Download original PDF"
              >
                Download PDF
              </Button>

              <Button
                variant="primary"
                size="sm"
                icon={Sparkles}
                onClick={() => navigate(`/analysis?documentId=${document.id}`)}
                title="View or generate structured analysis"
              >
                Summarize
              </Button>

              <Button
                variant="secondary"
                size="sm"
                icon={RefreshCw}
                onClick={handleReprocess}
                isLoading={isReprocessing}
                title="Reprocess"
              />

              <Button
                variant="dangerOutline"
                size="sm"
                icon={Trash2}
                onClick={() => setIsDeleteOpen(true)}
                title="Delete document"
              />
            </div>
          </div>

          {document.abstract && (
            <div className="p-4 border border-cream-border dark:border-warmdark-border bg-cream-secondary/30 dark:bg-warmdark-elevated rounded-sm text-xs text-cream-text dark:text-warmdark-text leading-relaxed font-sans">
              <span className="font-mono font-bold block uppercase mb-1 text-sky-deep dark:text-sky-light">
                // ABSTRACT:
              </span>
              {document.abstract}
            </div>
          )}
        </div>

        {/* Tab Bar */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            onClick={() => setActiveTab('text')}
            className={`px-3.5 py-1.5 border rounded-sm font-medium uppercase transition-all cursor-pointer ${
              activeTab === 'text'
                ? 'bg-sky-pale dark:bg-sky-deep/20 text-charcoal-main dark:text-sky-light font-bold border-sky-primary shadow-editorial-sm'
                : 'bg-cream-surface dark:bg-warmdark-surface text-cream-muted dark:text-warmdark-muted border-cream-border dark:border-warmdark-border hover:bg-cream-secondary/60'
            }`}
          >
            [01] PAGE TEXT ({textData?.pages?.length || 0})
          </button>

          <button
            onClick={() => setActiveTab('chunks')}
            className={`px-3.5 py-1.5 border rounded-sm font-medium uppercase transition-all cursor-pointer ${
              activeTab === 'chunks'
                ? 'bg-sky-pale dark:bg-sky-deep/20 text-charcoal-main dark:text-sky-light font-bold border-sky-primary shadow-editorial-sm'
                : 'bg-cream-surface dark:bg-warmdark-surface text-cream-muted dark:text-warmdark-muted border-cream-border dark:border-warmdark-border hover:bg-cream-secondary/60'
            }`}
          >
            [02] SEMANTIC CHUNKS ({chunksData?.total || 0})
          </button>

          <button
            onClick={() => setActiveTab('metadata')}
            className={`px-3.5 py-1.5 border rounded-sm font-medium uppercase transition-all cursor-pointer ${
              activeTab === 'metadata'
                ? 'bg-sky-pale dark:bg-sky-deep/20 text-charcoal-main dark:text-sky-light font-bold border-sky-primary shadow-editorial-sm'
                : 'bg-cream-surface dark:bg-warmdark-surface text-cream-muted dark:text-warmdark-muted border-cream-border dark:border-warmdark-border hover:bg-cream-secondary/60'
            }`}
          >
            [03] TECHNICAL META
          </button>
        </div>

        {/* Tab 1: Page Text Reader */}
        {activeTab === 'text' && (
          <div className="space-y-4">
            {/* Page Navigation Controls */}
            <div className="flex items-center justify-between bg-cream-surface dark:bg-warmdark-surface p-3 border border-cream-border dark:border-warmdark-border rounded-md shadow-editorial-sm font-mono text-xs">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  icon={ChevronLeft}
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                >
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={!textData?.pages || currentPage >= textData.pages.length}
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-bold text-cream-text dark:text-warmdark-text">
                  PAGE {currentPage} / {textData?.pages?.length || 1}
                </span>

                <select
                  value={currentPage}
                  onChange={(e) => handlePageChange(parseInt(e.target.value, 10))}
                  className="px-2 py-1 bg-cream-secondary/40 dark:bg-warmdark-elevated border border-cream-border dark:border-warmdark-border rounded-xs text-xs font-medium text-cream-text dark:text-warmdark-text focus:outline-none cursor-pointer"
                >
                  {textData?.pages?.map((p) => (
                    <option key={p.page_number} value={p.page_number}>
                      Jump to Page {p.page_number}
                    </option>
                  ))}
                </select>

                <Button
                  variant="secondary"
                  size="sm"
                  icon={isCopied ? Check : Copy}
                  onClick={() => handleCopyText(currentPageObj?.text || '')}
                  title="Copy page text"
                >
                  {isCopied ? 'COPIED' : 'COPY'}
                </Button>
              </div>
            </div>

            {/* Extracted Text Box */}
            <div className="p-6 bg-cream-surface dark:bg-warmdark-surface border border-cream-border dark:border-warmdark-border rounded-md shadow-editorial-sm">
              {currentPageObj ? (
                <div className="space-y-3 font-mono">
                  <div className="flex items-center justify-between pb-2 border-b border-cream-border dark:border-warmdark-border text-xs text-cream-muted dark:text-warmdark-muted font-medium uppercase">
                    <span>// PAGE_{currentPageObj.page_number}</span>
                    <span>{currentPageObj.char_count} CHARACTERS</span>
                  </div>
                  <pre className="whitespace-pre-wrap font-mono text-xs sm:text-sm text-cream-text dark:text-warmdark-text leading-relaxed overflow-x-auto selection:bg-sky-light">
                    {currentPageObj.text || <span className="italic text-cream-muted dark:text-warmdark-muted">[NO TEXT DETECTED ON THIS PAGE]</span>}
                  </pre>
                </div>
              ) : (
                <div className="text-center py-12 text-cream-muted dark:text-warmdark-muted text-xs font-mono">
                  [NO EXTRACTED TEXT FOUND FOR PAGE {currentPage}]
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Chunks */}
        {activeTab === 'chunks' && (
          <div className="space-y-4">
            <p className="text-xs text-cream-muted dark:text-warmdark-muted font-mono">
              // FAISS VECTOR CHUNKS: {chunksData?.total || 0} TOTAL SLICES EMBEDDED
            </p>

            <div className="space-y-3">
              {chunksData?.chunks?.map((chunk) => (
                <div key={chunk.id} className="p-4 bg-cream-surface dark:bg-warmdark-surface border border-cream-border dark:border-warmdark-border rounded-md shadow-editorial-sm space-y-2 font-mono text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-cream-border dark:border-warmdark-border text-cream-muted dark:text-warmdark-muted font-medium">
                    <span className="text-sky-deep dark:text-sky-light font-bold">
                      CHUNK #{chunk.chunk_index + 1}
                    </span>
                    <div className="flex items-center gap-3">
                      <span>PAGE {chunk.page_number}</span>
                      <span>•</span>
                      <span>{chunk.char_count} CHARS</span>
                      <span>•</span>
                      <span>{chunk.token_count || '—'} TOKENS</span>
                    </div>
                  </div>

                  {chunk.section_heading && (
                    <div className="font-bold text-cream-text dark:text-warmdark-text uppercase font-display">
                      § {chunk.section_heading}
                    </div>
                  )}

                  <p className="text-cream-text dark:text-warmdark-text leading-relaxed bg-cream-secondary/30 dark:bg-warmdark-elevated p-3 border border-cream-border dark:border-warmdark-border rounded-xs whitespace-pre-wrap font-sans">
                    {chunk.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Technical Meta */}
        {activeTab === 'metadata' && (
          <div className="p-5 bg-cream-surface dark:bg-warmdark-surface border border-cream-border dark:border-warmdark-border rounded-md shadow-editorial-sm divide-y divide-cream-border dark:divide-warmdark-border font-mono text-xs">
            <div className="py-2.5 flex justify-between">
              <span className="text-cream-muted dark:text-warmdark-muted font-medium uppercase">DOCUMENT ID:</span>
              <span className="text-cream-text dark:text-warmdark-text select-all font-bold">{document.id}</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-cream-muted dark:text-warmdark-muted font-medium uppercase">ORIGINAL FILENAME:</span>
              <span className="text-cream-text dark:text-warmdark-text">{document.original_filename}</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-cream-muted dark:text-warmdark-muted font-medium uppercase">STORAGE FILENAME:</span>
              <span className="text-cream-text dark:text-warmdark-text">{document.internal_filename}</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-cream-muted dark:text-warmdark-muted font-medium uppercase">SHA-256 CHECKSUM:</span>
              <span className="text-cream-text dark:text-warmdark-text select-all truncate max-w-sm font-bold">
                {document.sha256_hash}
              </span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-cream-muted dark:text-warmdark-muted font-medium uppercase">EXTRACTION STATUS:</span>
              <span className="text-cream-text dark:text-warmdark-text font-bold">{document.extraction_status.toUpperCase()}</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-cream-muted dark:text-warmdark-muted font-medium uppercase">CREATED TIMESTAMP:</span>
              <span className="text-cream-text dark:text-warmdark-text">{formatDate(document.created_at)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="PURGE PAPER RECORD"
        message={`Confirm permanent deletion of "${document.title || document.original_filename}". All vectors, text, and metadata will be permanently unindexed.`}
        isLoading={isDeleting}
      />
    </div>
  );
}
