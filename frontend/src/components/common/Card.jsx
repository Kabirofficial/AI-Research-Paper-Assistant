import React from 'react';

export default function Card({
  children,
  className = '',
  hoverEffect = false,
  variant = 'default', // 'default', 'sky', 'vermilion', 'elevated'
  onClick,
  ...props
}) {
  const variantStyles = {
    default: 'bg-cream-surface dark:bg-warmdark-surface border border-cream-border dark:border-warmdark-border shadow-editorial-sm',
    elevated: 'bg-cream-elevated dark:bg-warmdark-elevated border border-cream-border dark:border-warmdark-border shadow-editorial',
    sky: 'bg-sky-pale/40 dark:bg-sky-deep/15 border border-sky-primary shadow-editorial-sky',
    vermilion: 'bg-vermilion-pale/30 dark:bg-vermilion-deep/15 border border-vermilion-primary shadow-editorial-red',
  };

  return (
    <div
      onClick={onClick}
      className={`rounded-md p-5 transition-all duration-75 ${variantStyles[variant] || variantStyles.default} ${
        hoverEffect ? 'hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-editorial cursor-pointer' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, className = '' }) {
  return (
    <div className={`flex items-start justify-between gap-4 pb-3 border-b border-cream-border dark:border-warmdark-border ${className}`}>
      <div>
        <h3 className="text-sm sm:text-base font-bold tracking-tight text-cream-text dark:text-warmdark-text font-display">
          {title}
        </h3>
        {subtitle && (
          <p className="text-xs text-cream-muted dark:text-warmdark-muted mt-0.5 font-mono">
            // {subtitle}
          </p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
