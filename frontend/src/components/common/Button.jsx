import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  className = '',
  icon: Icon,
  type = 'button',
  onClick,
  ...props
}) {
  const baseStyles = 'inline-flex items-center justify-center font-sans font-semibold tracking-tight rounded-sm transition-all duration-75 select-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none cursor-pointer';

  const variants = {
    // Architectural Sky Blue (Primary interaction color)
    primary: 'bg-sky-primary hover:bg-sky-hover text-charcoal-main border border-charcoal-main dark:border-warmdark-border shadow-editorial-sm active:translate-x-[1px] active:translate-y-[1px] active:shadow-none',
    // Muted Vermilion Accent
    vermilion: 'bg-vermilion-primary hover:bg-vermilion-hover text-white border border-vermilion-deep shadow-editorial-sm active:translate-x-[1px] active:translate-y-[1px] active:shadow-none',
    // Warm Elevated Surface Secondary
    secondary: 'bg-cream-elevated dark:bg-warmdark-elevated hover:bg-cream-secondary dark:hover:bg-warmdark-surface text-cream-text dark:text-warmdark-text border border-cream-border dark:border-warmdark-border shadow-editorial-sm active:translate-x-[1px] active:translate-y-[1px] active:shadow-none',
    // Outline (Deliberate hairline border)
    outline: 'bg-transparent hover:bg-cream-secondary/60 dark:hover:bg-warmdark-elevated text-cream-text dark:text-warmdark-text border border-cream-border dark:border-warmdark-border shadow-editorial-sm active:translate-x-[1px] active:translate-y-[1px] active:shadow-none',
    // Ghost (Minimalist)
    ghost: 'bg-transparent hover:bg-cream-secondary/60 dark:hover:bg-warmdark-elevated text-cream-text dark:text-warmdark-text border border-transparent',
    // Danger
    danger: 'bg-vermilion-primary hover:bg-vermilion-hover text-white border border-vermilion-deep shadow-editorial-sm active:translate-x-[1px] active:translate-y-[1px] active:shadow-none',
    // Danger Outline
    dangerOutline: 'bg-transparent hover:bg-vermilion-pale/60 dark:hover:bg-vermilion-deep/20 text-vermilion-primary border border-vermilion-primary shadow-editorial-sm active:translate-x-[1px] active:translate-y-[1px] active:shadow-none',
  };

  const sizes = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-xs sm:text-sm px-3.5 py-2 gap-2',
    lg: 'text-sm sm:text-base px-5 py-2.5 gap-2.5',
    icon: 'p-2 aspect-square',
  };

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
      ) : Icon ? (
        <Icon className="w-3.5 h-3.5 shrink-0" />
      ) : null}
      {children}
    </button>
  );
}
