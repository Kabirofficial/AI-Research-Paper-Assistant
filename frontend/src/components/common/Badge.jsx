import React from 'react';

export default function Badge({
  children,
  variant = 'default',
  size = 'sm',
  className = '',
}) {
  const variants = {
    default: 'bg-cream-surface dark:bg-warmdark-surface text-cream-text dark:text-warmdark-text border border-cream-border dark:border-warmdark-border',
    sky: 'bg-sky-pale dark:bg-sky-deep/20 text-sky-deep dark:text-sky-light border border-sky-primary',
    vermilion: 'bg-vermilion-pale dark:bg-vermilion-deep/20 text-vermilion-deep dark:text-vermilion-soft border border-vermilion-primary',
    charcoal: 'bg-charcoal-main text-cream-surface border border-charcoal-main',
    success: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700',
    warning: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700',
    danger: 'bg-vermilion-pale dark:bg-vermilion-deep/20 text-vermilion-deep dark:text-vermilion-soft border border-vermilion-primary',
  };

  const sizes = {
    xs: 'text-[10px] px-1.5 py-0.5 tracking-wider',
    sm: 'text-[11px] px-2 py-0.5 tracking-wide',
    md: 'text-xs px-2.5 py-1 tracking-wide',
  };

  return (
    <span
      className={`inline-flex items-center font-mono font-medium uppercase rounded-xs ${variants[variant] || variants.default} ${sizes[size] || sizes.sm} ${className}`}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }) {
  const map = {
    completed: { variant: 'success', label: 'COMPLETED' },
    processing: { variant: 'sky', label: 'PROCESSING' },
    pending: { variant: 'warning', label: 'PENDING' },
    failed: { variant: 'danger', label: 'FAILED' },
    ocr_needed: { variant: 'vermilion', label: 'OCR NEEDED' },
  };

  const current = map[status] || { variant: 'default', label: (status || 'UNKNOWN').toUpperCase() };

  return <Badge variant={current.variant}>{current.label}</Badge>;
}
