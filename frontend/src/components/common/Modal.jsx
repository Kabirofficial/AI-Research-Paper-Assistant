import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'max-w-lg',
  className = '',
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-charcoal-main/50 dark:bg-black/70 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Editorial Brutalist Dialog Box */}
      <div
        role="dialog"
        aria-modal="true"
        className={`relative w-full ${maxWidth} bg-cream-elevated dark:bg-warmdark-surface border border-charcoal-main dark:border-warmdark-border shadow-editorial-lg rounded-md p-6 overflow-hidden ${className}`}
      >
        <div className="flex items-start justify-between gap-4 pb-3.5 border-b border-cream-border dark:border-warmdark-border">
          <div>
            {title && (
              <h3 className="text-base sm:text-lg font-bold tracking-tight text-cream-text dark:text-warmdark-text font-display">
                {title}
              </h3>
            )}
            {description && (
              <p className="text-xs text-cream-muted dark:text-warmdark-muted mt-1 font-mono">
                // {description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="border border-cream-border dark:border-warmdark-border p-1 hover:bg-vermilion-primary hover:text-white dark:hover:text-white rounded-xs transition-colors cursor-pointer text-cream-text dark:text-warmdark-text"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
