import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams, useOutletContext } from 'react-router-dom';
import Header from '../components/layout/Header';
import Button from '../components/common/Button';
import Badge, { StatusBadge } from '../components/common/Badge';
import Skeleton from '../components/common/Skeleton';
import ConfirmationModal from '../components/common/ConfirmationModal';
import UploadModal from '../components/documents/UploadModal';
import { documentsApi } from '../api/documents';
import { useToast } from '../context/ToastContext';
import { formatBytes, formatDate } from '../utils/formatters';
import {
  Upload,
  Search,
  Filter,
  LayoutGrid,
  List,
  FileText,
  Trash2,
  RefreshCw,
  Download,
  MessageSquare,
  BookOpen,
  ArrowUpDown,
} from 'lucide-react';

export default function Library() {
  const { setMobileOpen } = useOutletContext();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { success, error, info } = useToast();

  const [documents, setDocuments] = useState([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('grid');

  // Delete modal state
  const [deleteDoc, setDeleteDoc] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Reprocess state
  const [reprocessingId, setReprocessingId] = useState(null);

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const data = await documentsApi.list(0, 100);
      setDocuments(data.documents || []);
      setTotal(data.total || 0);
    } catch (err) {
      error(err.message || 'Failed to fetch documents.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
    if (searchParams.get('action') === 'upload') {
      setIsUploadOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, []);

  const filteredDocuments = useMemo(() => {
    return documents
      .filter((doc) => {
        const query = searchQuery.toLowerCase().trim();
        const matchesQuery =
          !query ||
          (doc.title && doc.title.toLowerCase().includes(query)) ||
          doc.original_filename.toLowerCase().includes(query) ||
          (doc.authors && doc.authors.toLowerCase().includes(query));

        const matchesStatus =
          statusFilter === 'all' || doc.processing_status === statusFilter;

        return matchesQuery && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.created_at) - new Date(a.created_at);
        } else if (sortBy === 'oldest') {
          return new Date(a.created_at) - new Date(b.created_at);
        } else if (sortBy === 'title') {
          const titleA = a.title || a.original_filename;
          const titleB = b.title || b.original_filename;
          return titleA.localeCompare(titleB);
        } else if (sortBy === 'size') {
          return b.file_size - a.file_size;
        }
        return 0;
      });
  }, [documents, searchQuery, statusFilter, sortBy]);

  const confirmDelete = async () => {
    if (!deleteDoc) return;
    setIsDeleting(true);
    try {
      await documentsApi.delete(deleteDoc.id);
      success(`Deleted "${deleteDoc.title || deleteDoc.original_filename}"`);
      setDeleteDoc(null);
      loadDocuments();
    } catch (err) {
      error(err.message || 'Failed to delete document.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReprocess = async (docId, e) => {
    e.stopPropagation();
    setReprocessingId(docId);
    info('Reprocessing document: re-extracting text & semantic chunks...');
    try {
      await documentsApi.reprocess(docId);
      success('Document reprocessed successfully.');
      loadDocuments();
    } catch (err) {
      error(err.message || 'Failed to reprocess document.');
    } finally {
      setReprocessingId(null);
    }
  };

  const handleDownload = async (doc, e) => {
    e.stopPropagation();
    try {
      await documentsApi.downloadBlob(doc.id, doc.original_filename);
      success(`Downloading "${doc.original_filename}"`);
    } catch (err) {
      error(err.message || 'Failed to download original PDF.');
    }
  };

  return (
    <div>
      <Header
        setMobileOpen={setMobileOpen}
        pageTitle="Research Library"
        pageSubtitle={`REPOSITORY: ${total} ${total === 1 ? 'PAPER' : 'PAPERS'}`}
        actions={
          <Button
            variant="primary"
            size="sm"
            icon={Upload}
            onClick={() => setIsUploadOpen(true)}
          >
            Upload Paper
          </Button>
        }
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Editorial Controls Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-cream-surface dark:bg-warmdark-surface p-3.5 border border-cream-border dark:border-warmdark-border rounded-md shadow-editorial-sm">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-cream-muted dark:text-warmdark-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="SEARCH BY TITLE, FILENAME, OR AUTHOR..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-cream-secondary/40 dark:bg-warmdark-elevated border border-cream-border dark:border-warmdark-border rounded-sm font-mono text-xs text-cream-text dark:text-warmdark-text placeholder-cream-muted dark:placeholder-warmdark-muted focus:outline-none focus:border-charcoal-main dark:focus:border-sky-primary transition-all"
            />
          </div>

          <div className="flex items-center gap-2 font-mono">
            {/* Status Filter */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 bg-cream-secondary/40 dark:bg-warmdark-elevated border border-cream-border dark:border-warmdark-border rounded-sm text-xs font-medium text-cream-text dark:text-warmdark-text focus:outline-none cursor-pointer"
              >
                <option value="all">ALL_STATUS</option>
                <option value="completed">COMPLETED</option>
                <option value="processing">PROCESSING</option>
                <option value="pending">PENDING</option>
                <option value="failed">FAILED</option>
              </select>
              <Filter className="w-3.5 h-3.5 text-cream-muted dark:text-warmdark-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Sort Select */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 bg-cream-secondary/40 dark:bg-warmdark-elevated border border-cream-border dark:border-warmdark-border rounded-sm text-xs font-medium text-cream-text dark:text-warmdark-text focus:outline-none cursor-pointer"
              >
                <option value="newest">NEWEST_FIRST</option>
                <option value="oldest">OLDEST_FIRST</option>
                <option value="title">TITLE (A-Z)</option>
                <option value="size">FILE_SIZE</option>
              </select>
              <ArrowUpDown className="w-3.5 h-3.5 text-cream-muted dark:text-warmdark-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center border border-cream-border dark:border-warmdark-border rounded-sm bg-cream-secondary/40 dark:bg-warmdark-elevated overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 transition-colors cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-sky-pale dark:bg-sky-deep/30 text-charcoal-main dark:text-sky-light font-bold'
                    : 'text-cream-muted dark:text-warmdark-muted hover:text-cream-text'
                }`}
                title="Grid view"
                aria-label="Grid view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 transition-colors cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-sky-pale dark:bg-sky-deep/30 text-charcoal-main dark:text-sky-light font-bold'
                    : 'text-cream-muted dark:text-warmdark-muted hover:text-cream-text'
                }`}
                title="Table view"
                aria-label="Table view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Content View */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="p-5 border border-cream-border dark:border-warmdark-border bg-cream-surface dark:bg-warmdark-surface rounded-md shadow-editorial-sm space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="pt-4 flex justify-between">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="p-12 text-center border border-cream-border dark:border-warmdark-border bg-cream-surface dark:bg-warmdark-surface rounded-md shadow-editorial space-y-4">
            <div className="w-14 h-14 border border-charcoal-main dark:border-warmdark-border bg-sky-pale dark:bg-sky-deep/20 text-sky-deep dark:text-sky-light rounded-xs flex items-center justify-center mx-auto shadow-editorial-sm">
              <BookOpen className="w-7 h-7" />
            </div>
            <div className="max-w-md mx-auto">
              <h3 className="text-base font-bold text-cream-text dark:text-warmdark-text uppercase font-display">
                {searchQuery || statusFilter !== 'all'
                  ? 'NO MATCHING RESEARCH PAPERS'
                  : 'LIBRARY IS CURRENTLY EMPTY'}
              </h3>
              <p className="text-xs text-cream-muted dark:text-warmdark-muted mt-1 font-mono">
                {searchQuery || statusFilter !== 'all'
                  ? '// Reset filters to inspect entire library index'
                  : '// Ingest PDF papers to initiate text extraction & vector embeddings'}
              </p>
            </div>
            {searchQuery || statusFilter !== 'all' ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
              >
                Reset Filters
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                icon={Upload}
                onClick={() => setIsUploadOpen(true)}
              >
                Upload Research Paper
              </Button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          /* Editorial Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                onClick={() => navigate(`/documents/${doc.id}`)}
                className="p-5 bg-cream-surface dark:bg-warmdark-surface border border-cream-border dark:border-warmdark-border rounded-md shadow-editorial-sm hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-editorial transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <StatusBadge status={doc.processing_status} />
                    <span className="text-[11px] text-cream-muted dark:text-warmdark-muted font-mono font-medium">
                      {formatBytes(doc.file_size)}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-cream-text dark:text-warmdark-text line-clamp-2 font-display group-hover:text-sky-deep dark:group-hover:text-sky-light transition-colors">
                    {doc.title || doc.original_filename}
                  </h3>

                  <p className="text-xs text-cream-muted dark:text-warmdark-muted font-mono truncate">
                    // {doc.original_filename}
                  </p>

                  {doc.authors && (
                    <p className="text-xs text-cream-text dark:text-warmdark-muted line-clamp-1 italic font-serif">
                      by {doc.authors}
                    </p>
                  )}
                </div>

                <div className="pt-4 mt-4 border-t border-cream-border dark:border-warmdark-border flex items-center justify-between text-xs text-cream-muted dark:text-warmdark-muted font-mono">
                  <div className="flex items-center gap-2">
                    <span>{doc.page_count}p</span>
                    {doc.publication_year && <span>• {doc.publication_year}</span>}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/chat?documentId=${doc.id}`);
                      }}
                      className="p-1 border border-cream-border dark:border-warmdark-border bg-sky-pale dark:bg-sky-deep/20 hover:bg-sky-primary text-cream-text dark:text-warmdark-text rounded-xs transition-colors cursor-pointer"
                      title="Chat with paper"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={(e) => handleDownload(doc, e)}
                      className="p-1 border border-cream-border dark:border-warmdark-border bg-cream-surface dark:bg-warmdark-surface hover:bg-cream-secondary dark:hover:bg-warmdark-elevated text-cream-text dark:text-warmdark-text rounded-xs transition-colors cursor-pointer"
                      title="Download PDF"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={(e) => handleReprocess(doc.id, e)}
                      disabled={reprocessingId === doc.id}
                      className="p-1 border border-cream-border dark:border-warmdark-border bg-cream-surface dark:bg-warmdark-surface hover:bg-cream-secondary dark:hover:bg-warmdark-elevated text-cream-text dark:text-warmdark-text rounded-xs transition-colors cursor-pointer disabled:opacity-50"
                      title="Reprocess text & embeddings"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${reprocessingId === doc.id ? 'animate-spin' : ''}`} />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteDoc(doc);
                      }}
                      className="p-1 border border-cream-border dark:border-warmdark-border bg-vermilion-pale/60 dark:bg-vermilion-deep/20 hover:bg-vermilion-primary hover:text-white text-vermilion-deep dark:text-vermilion-soft rounded-xs transition-colors cursor-pointer"
                      title="Delete document"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Editorial Table View */
          <div className="border border-cream-border dark:border-warmdark-border bg-cream-surface dark:bg-warmdark-surface rounded-md shadow-editorial-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-cream-secondary/40 dark:bg-warmdark-elevated text-cream-text dark:text-warmdark-text font-bold uppercase tracking-wider border-b border-cream-border dark:border-warmdark-border">
                  <tr>
                    <th className="py-3 px-4 font-display">Title & Filename</th>
                    <th className="py-3 px-4">Authors</th>
                    <th className="py-3 px-4">Pages</th>
                    <th className="py-3 px-4">Size</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-border dark:divide-warmdark-border">
                  {filteredDocuments.map((doc) => (
                    <tr
                      key={doc.id}
                      onClick={() => navigate(`/documents/${doc.id}`)}
                      className="hover:bg-cream-secondary/30 dark:hover:bg-warmdark-elevated cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 max-w-xs font-sans">
                        <div className="font-bold text-cream-text dark:text-warmdark-text truncate font-display">
                          {doc.title || doc.original_filename}
                        </div>
                        <div className="text-[11px] text-cream-muted dark:text-warmdark-muted font-mono truncate">
                          {doc.original_filename}
                        </div>
                      </td>
                      <td className="py-3 px-4 max-w-[150px] truncate text-cream-muted dark:text-warmdark-muted font-serif italic">
                        {doc.authors || '—'}
                      </td>
                      <td className="py-3 px-4 font-bold text-cream-text dark:text-warmdark-text">
                        {doc.page_count}
                      </td>
                      <td className="py-3 px-4 text-cream-muted dark:text-warmdark-muted">
                        {formatBytes(doc.file_size)}
                      </td>
                      <td className="py-3 px-4 text-cream-muted dark:text-warmdark-muted">
                        {formatDate(doc.created_at)}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={doc.processing_status} />
                      </td>
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => navigate(`/chat?documentId=${doc.id}`)}
                            className="p-1 border border-cream-border dark:border-warmdark-border bg-sky-pale dark:bg-sky-deep/20 hover:bg-sky-primary text-cream-text dark:text-warmdark-text rounded-xs"
                            title="Chat with paper"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleDownload(doc, e)}
                            className="p-1 border border-cream-border dark:border-warmdark-border bg-cream-surface dark:bg-warmdark-surface hover:bg-cream-secondary rounded-xs text-cream-text dark:text-warmdark-text"
                            title="Download PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleReprocess(doc.id, e)}
                            disabled={reprocessingId === doc.id}
                            className="p-1 border border-cream-border dark:border-warmdark-border bg-cream-surface dark:bg-warmdark-surface hover:bg-cream-secondary rounded-xs text-cream-text dark:text-warmdark-text"
                            title="Reprocess"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${reprocessingId === doc.id ? 'animate-spin' : ''}`} />
                          </button>
                          <button
                            onClick={() => setDeleteDoc(doc)}
                            className="p-1 border border-cream-border dark:border-warmdark-border bg-vermilion-pale/60 dark:bg-vermilion-deep/20 hover:bg-vermilion-primary hover:text-white rounded-xs text-vermilion-deep dark:text-vermilion-soft"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={() => loadDocuments()}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!deleteDoc}
        onClose={() => setDeleteDoc(null)}
        onConfirm={confirmDelete}
        title="PURGE RESEARCH DOCUMENT"
        message={`Confirm permanent deletion of "${deleteDoc?.title || deleteDoc?.original_filename}". Chunks, extracted text, and FAISS vector embeddings will be permanently unindexed.`}
        confirmText="Execute Deletion"
        isLoading={isDeleting}
      />
    </div>
  );
}
