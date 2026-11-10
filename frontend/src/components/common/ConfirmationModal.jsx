import React from 'react';
import Modal from './Modal';
import Button from './Button';
import { AlertTriangle } from 'lucide-react';

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Execute',
  cancelText = 'Cancel',
  confirmVariant = 'danger',
  isLoading = false,
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-md">
      <div className="flex items-start gap-3.5">
        <div className="w-10 h-10 border border-vermilion-primary bg-vermilion-pale dark:bg-vermilion-deep/20 text-vermilion-deep dark:text-vermilion-soft rounded-sm flex items-center justify-center shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-bold text-cream-text dark:text-warmdark-text uppercase font-mono">
            {title}
          </h4>
          <p className="text-xs text-cream-muted dark:text-warmdark-muted mt-1 leading-relaxed font-sans">
            {message}
          </p>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-cream-border dark:border-warmdark-border">
        <Button variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
          {cancelText}
        </Button>
        <Button
          variant={confirmVariant}
          size="sm"
          onClick={onConfirm}
          isLoading={isLoading}
        >
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
}
