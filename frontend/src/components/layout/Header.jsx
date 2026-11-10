import React from 'react';
import { Menu } from 'lucide-react';

export default function Header({
  setMobileOpen,
  pageTitle,
  pageSubtitle,
  actions,
}) {
  return (
    <header className="sticky top-0 z-30 h-16 bg-cream-surface/90 dark:bg-warmdark-surface/90 backdrop-blur-xs border-b border-cream-border dark:border-warmdark-border flex items-center justify-between px-4 sm:px-6 transition-colors">
      {/* Mobile Menu & Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-1.5 border border-cream-border dark:border-warmdark-border text-cream-text dark:text-warmdark-text hover:bg-cream-secondary dark:hover:bg-warmdark-elevated rounded-xs lg:hidden cursor-pointer"
          aria-label="Open menu"
        >
          <Menu className="w-4 h-4" />
        </button>

        <div>
          <h1 className="text-sm sm:text-base font-bold tracking-tight text-cream-text dark:text-warmdark-text uppercase font-display">
            {pageTitle}
          </h1>
          {pageSubtitle && (
            <p className="text-[11px] sm:text-xs text-cream-muted dark:text-warmdark-muted font-mono hidden sm:block">
              // {pageSubtitle}
            </p>
          )}
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {actions}
      </div>
    </header>
  );
}
