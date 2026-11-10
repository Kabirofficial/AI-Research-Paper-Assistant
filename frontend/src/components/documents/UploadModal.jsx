import React, { useState, useRef } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { documentsApi } from '../../api/documents';
import { useToast } from '../../context/ToastContext';
import { formatBytes } from '../../utils/formatters';
import { Upload, FileUp, AlertCircle, X } from 'lucide-react';

export default function UploadModal({ isOpen, onClose, onUploadSuccess }) {
  const { success, error } = useToast();
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);

  const resetState = () => {
    setFile(null);
    setUploadProgress(0);
    setIsUploading(false);
    setUploadError(null);
  };

  const handleClose = () => {
    if (isUploading) return;
    resetState();
    onClose();
  };

  const validateAndSetFile = (selectedFile) => {
    setUploadError(null);
    if (!selectedFile) return;

    if (!selectedFile.name.toLowerCase().endsWith('.pdf') && selectedFile.type !== 'application/pdf') {
      setUploadError('Only PDF documents are supported for ingestion.');
      return;
    }

    const maxSizeMB = 50;
    if (selectedFile.size > maxSizeMB * 1024 * 1024) {
      setUploadError(`File exceeds maximum size of ${maxSizeMB} MB (${formatBytes(selectedFile.size)}).`);
      return;
    }

    setFile(selectedFile);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    try {
      const result = await documentsApi.upload(file, (progress) => {
        setUploadProgress(progress);
      });

      success(`Indexed "${result.title || result.original_filename}"`);
      handleClose();
      if (onUploadSuccess) {
        onUploadSuccess(result);
      }
    } catch (err) {
      let msg = err.message || 'Failed to ingest research paper.';
      if (err.status === 409 || err.code === 'DUPLICATE_DOCUMENT') {
        msg = `Duplicate document: SHA-256 matches existing "${err.details?.original_filename || 'PDF'}".`;
      }
      setUploadError(msg);
      error(msg);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="INGEST RESEARCH PAPER"
      description="Extract text, build chunks & index into FAISS vector space"
      maxWidth="max-w-xl"
    >
      <div className="space-y-4">
        {/* Dropzone */}
        {!file ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-md p-8 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-sky-deep bg-sky-pale/60 dark:bg-sky-deep/20'
                : 'border-cream-border dark:border-warmdark-border hover:bg-cream-secondary/40 dark:hover:bg-warmdark-elevated bg-cream-surface dark:bg-warmdark-surface'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="w-12 h-12 border border-charcoal-main dark:border-warmdark-border bg-sky-primary text-charcoal-main rounded-sm flex items-center justify-center mx-auto mb-3 shadow-editorial-sm">
              <FileUp className="w-6 h-6" />
            </div>
            <p className="text-xs sm:text-sm font-bold text-cream-text dark:text-warmdark-text uppercase font-mono tracking-wider">
              [CLICK OR DROP PDF HERE]
            </p>
            <p className="text-xs text-cream-muted dark:text-warmdark-muted mt-1 font-mono">
              MAX: 50 MB // FORMAT: .PDF ONLY
            </p>
          </div>
        ) : (
          /* File Preview Box */
          <div className="p-4 border border-cream-border dark:border-warmdark-border bg-cream-surface dark:bg-warmdark-surface rounded-md shadow-editorial-sm space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 border border-vermilion-deep bg-vermilion-primary text-white rounded-xs flex items-center justify-center shrink-0 font-mono font-bold text-xs">
                  PDF
                </div>
                <div className="min-w-0 font-mono">
                  <p className="text-xs font-bold text-cream-text dark:text-warmdark-text truncate">
                    {file.name}
                  </p>
                  <p className="text-[11px] text-cream-muted dark:text-warmdark-muted">
                    {formatBytes(file.size)}
                  </p>
                </div>
              </div>

              {!isUploading && (
                <button
                  onClick={() => setFile(null)}
                  className="border border-cream-border dark:border-warmdark-border p-1 hover:bg-vermilion-primary hover:text-white rounded-xs transition-colors cursor-pointer text-cream-text dark:text-warmdark-text"
                  aria-label="Remove file"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Progress Bar */}
            {isUploading && (
              <div className="space-y-1.5 pt-2 font-mono">
                <div className="flex justify-between text-xs text-cream-text dark:text-warmdark-text font-bold">
                  <span>{uploadProgress < 100 ? '// UPLOADING_STREAM' : '// EXTRACTING_PAGES_&_EMBEDDINGS'}</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full h-2.5 border border-cream-border dark:border-warmdark-border bg-cream-secondary dark:bg-warmdark-elevated rounded-xs overflow-hidden">
                  <div
                    className="h-full bg-sky-primary transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error Feedback */}
        {uploadError && (
          <div className="flex items-start gap-2.5 p-3 border border-vermilion-primary bg-vermilion-pale dark:bg-vermilion-deep/20 text-vermilion-deep dark:text-vermilion-soft rounded-sm text-xs font-mono font-bold">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-vermilion-deep" />
            <div className="leading-relaxed">{uploadError}</div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-cream-border dark:border-warmdark-border">
          <Button variant="outline" size="sm" onClick={handleClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={Upload}
            onClick={handleUpload}
            disabled={!file || isUploading}
            isLoading={isUploading}
          >
            {isUploading ? 'Ingesting PDF...' : 'Execute Ingestion'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
