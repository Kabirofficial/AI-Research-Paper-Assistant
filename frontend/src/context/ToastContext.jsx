import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

const ToastContext = createContext({
  showToast: () => {},
  success: () => {},
  error: () => {},
  info: () => {},
  warning: () => {},
});

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const success = useCallback((msg, dur) => showToast(msg, 'success', dur), [showToast]);
  const error = useCallback((msg, dur) => showToast(msg, 'error', dur || 6000), [showToast]);
  const info = useCallback((msg, dur) => showToast(msg, 'info', dur), [showToast]);
  const warning = useCallback((msg, dur) => showToast(msg, 'warning', dur), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, info, warning }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none p-4">
        {toasts.map((toast) => {
          const icons = {
            success: <CheckCircle2 className="w-4 h-4 text-emerald-800 dark:text-emerald-300 shrink-0" />,
            error: <AlertCircle className="w-4 h-4 text-white shrink-0" />,
            warning: <AlertTriangle className="w-4 h-4 text-amber-800 dark:text-amber-300 shrink-0" />,
            info: <Info className="w-4 h-4 text-sky-deep dark:text-sky-light shrink-0" />,
          };

          const styles = {
            success: 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 border border-emerald-400 dark:border-emerald-700 shadow-editorial-sm',
            error: 'bg-vermilion-primary text-white border border-vermilion-deep shadow-editorial-sm',
            warning: 'bg-amber-50 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border border-amber-400 dark:border-amber-700 shadow-editorial-sm',
            info: 'bg-cream-elevated dark:bg-warmdark-elevated text-cream-text dark:text-warmdark-text border border-cream-border dark:border-warmdark-border shadow-editorial-sm',
          };

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-2.5 p-3 rounded-sm font-sans ${styles[toast.type]}`}
            >
              {icons[toast.type]}
              <div className="flex-1 text-xs font-mono font-medium leading-snug break-words">
                {toast.message}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="p-0.5 hover:bg-black/10 rounded-xs cursor-pointer opacity-70 hover:opacity-100"
                aria-label="Close notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
