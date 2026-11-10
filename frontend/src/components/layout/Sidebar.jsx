import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  MessageSquare,
  FileSearch,
  Scale,
  Settings as SettingsIcon,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  X,
} from 'lucide-react';
import { useBackendStatus } from '../../context/BackendStatusContext';
import { useTheme } from '../../context/ThemeContext';

const NAV_ITEMS = [
  { index: '01', path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { index: '02', path: '/library', label: 'Research Library', icon: BookOpen },
  { index: '03', path: '/chat', label: 'AI Research Chat', icon: MessageSquare },
  { index: '04', path: '/analysis', label: 'Paper Analysis', icon: FileSearch },
  { index: '05', path: '/comparison', label: 'Paper Comparison', icon: Scale },
  { index: '06', path: '/settings', label: 'Settings', icon: SettingsIcon },
];

export default function Sidebar({
  isCollapsed,
  setIsCollapsed,
  mobileOpen,
  setMobileOpen,
}) {
  const { isOnline, healthData, isChecking, checkHealth } = useBackendStatus();
  const { theme, toggleTheme } = useTheme();

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-charcoal-main/50 dark:bg-black/70 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Editorial Brutalist Warm Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-cream-surface dark:bg-warmdark-surface border-r border-cream-border dark:border-warmdark-border transition-all duration-100 ease-in-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${isCollapsed ? 'w-20' : 'w-64'}
        `}
      >
        {/* Top Header & Editorial Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-cream-border dark:border-warmdark-border bg-cream-secondary/40 dark:bg-warmdark-elevated/40">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 border border-vermilion-deep bg-vermilion-primary text-white rounded-xs flex items-center justify-center shrink-0 shadow-editorial-sm font-mono font-bold text-xs">
              AI
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold tracking-tight text-cream-text dark:text-warmdark-text uppercase font-display truncate">
                  Paper Assistant
                </span>
                <span className="text-[10px] font-mono text-cream-muted dark:text-warmdark-muted tracking-tight">
                  EDITORIAL_RAG//v0.2
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setMobileOpen(false)}
              className="p-1 border border-cream-border dark:border-warmdark-border text-cream-text dark:text-warmdark-text hover:bg-vermilion-primary hover:text-white rounded-xs lg:hidden cursor-pointer"
              aria-label="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:flex p-1.5 border border-cream-border dark:border-warmdark-border text-cream-text dark:text-warmdark-text hover:bg-cream-secondary dark:hover:bg-warmdark-elevated rounded-xs transition-all cursor-pointer"
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? (
                <ChevronRight className="w-3.5 h-3.5" />
              ) : (
                <ChevronLeft className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto font-mono text-xs">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-sm transition-all cursor-pointer ${
                    isActive
                      ? 'bg-sky-pale dark:bg-sky-deep/20 text-charcoal-main dark:text-sky-light font-bold border border-sky-primary shadow-editorial-sm'
                      : 'text-cream-muted dark:text-warmdark-muted hover:bg-cream-secondary/60 dark:hover:bg-warmdark-elevated hover:text-cream-text dark:hover:text-warmdark-text border border-transparent'
                  } ${isCollapsed ? 'justify-center px-2' : ''}`
                }
                title={isCollapsed ? item.label : undefined}
              >
                {!isCollapsed && (
                  <span className="text-[10px] font-bold text-cream-muted dark:text-warmdark-muted font-mono">
                    {item.index}
                  </span>
                )}
                <Icon className="w-4 h-4 shrink-0 text-cream-text dark:text-warmdark-text" />
                {!isCollapsed && (
                  <span className="truncate tracking-tight font-sans font-semibold text-xs">
                    {item.label}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom Technical Status Box & Theme Toggle */}
        <div className="p-3 border-t border-cream-border dark:border-warmdark-border space-y-2 bg-cream-secondary/30 dark:bg-warmdark-elevated/20">
          {/* Active Provider Indicator */}
          {!isCollapsed && (
            <div className="p-2 border border-cream-border dark:border-warmdark-border bg-cream-surface dark:bg-warmdark-surface rounded-xs font-mono text-[11px] space-y-1 shadow-editorial-sm">
              <div className="flex items-center justify-between">
                <span className="text-cream-muted dark:text-warmdark-muted font-medium">PROVIDER:</span>
                <span className="font-bold uppercase text-sky-deep dark:text-sky-light">
                  {healthData?.llm_provider || 'LOCAL'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-cream-muted dark:text-warmdark-muted font-medium">EMBED:</span>
                <span className="font-medium text-cream-text dark:text-warmdark-text truncate max-w-[100px]">
                  BGE-SMALL
                </span>
              </div>
            </div>
          )}

          {/* Connection Status Pill */}
          <div
            onClick={checkHealth}
            className={`flex items-center gap-2 px-2.5 py-1.5 border rounded-xs font-mono text-[11px] font-bold cursor-pointer transition-all ${
              isOnline
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 shadow-editorial-sm'
                : 'bg-vermilion-pale dark:bg-vermilion-deep/20 border-vermilion-primary text-vermilion-deep dark:text-vermilion-soft shadow-editorial-sm'
            } ${isCollapsed ? 'justify-center p-2' : ''}`}
            title="Click to ping backend"
          >
            <span
              className={`w-2 h-2 rounded-xs shrink-0 ${
                isOnline ? 'bg-emerald-600' : 'bg-vermilion-primary'
              }`}
            />
            {!isCollapsed && (
              <span className="truncate">
                {isChecking ? 'PINGING...' : isOnline ? 'BACKEND: ONLINE' : 'BACKEND: OFFLINE'}
              </span>
            )}
          </div>

          {/* Buy Me a Book / Coffee Link */}
          <a
            href="https://www.buymeacoffee.com/JinggXD"
            target="_blank"
            rel="noopener noreferrer"
            className={`w-full flex items-center justify-between px-2.5 py-1.5 border border-amber-300 dark:border-amber-700/60 bg-amber-50/80 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/50 rounded-xs font-mono text-[11px] font-bold transition-all shadow-editorial-sm cursor-pointer ${
              isCollapsed ? 'justify-center p-2' : ''
            }`}
            title="Buy me a book (Buy Me a Coffee)"
          >
            <div className="flex items-center gap-2 truncate">
              <span className="text-xs">📖</span>
              {!isCollapsed && <span className="truncate">BUY ME A BOOK</span>}
            </div>
            {!isCollapsed && (
              <span className="text-[10px] text-amber-700 dark:text-amber-400 font-normal">☕</span>
            )}
          </a>

          {/* Theme Switcher Toggle */}
          <button
            onClick={toggleTheme}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 border border-cream-border dark:border-warmdark-border bg-cream-surface dark:bg-warmdark-surface text-cream-text dark:text-warmdark-text hover:bg-cream-secondary dark:hover:bg-warmdark-elevated rounded-xs font-mono text-[11px] transition-all cursor-pointer shadow-editorial-sm ${
              isCollapsed ? 'justify-center p-2' : ''
            }`}
            title={`Switch to ${theme === 'dark' ? 'Warm Cream' : 'Warm Dark'} Mode`}
          >
            {!isCollapsed && (
              <span className="font-medium text-cream-muted dark:text-warmdark-muted uppercase">
                THEME: {theme === 'dark' ? 'DARK' : 'CREAM'}
              </span>
            )}
            {theme === 'dark' ? (
              <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-sky-deep shrink-0" />
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
