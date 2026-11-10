import React from 'react';

export default function Skeleton({ className = '' }) {
  return (
    <div
      className={`animate-pulse bg-cream-secondary/70 dark:bg-warmdark-elevated rounded-sm border border-cream-border/40 dark:border-warmdark-border/40 ${className}`}
    />
  );
}
