import React, { forwardRef, useEffect, useState, type ComponentPropsWithoutRef } from 'react';
import { cn } from '../../utils/cn';
import { X, Sparkles, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';

const EXIT_MS = 260;

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface AppleNotificationBannerProps extends ComponentPropsWithoutRef<'output'> {
  title?: string;
  sender?: string;
  message?: string;
  time?: string;
  type?: NotificationType;
  icon?: React.ReactNode;
  avatarSrc?: string;
  avatarAlt?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  showTriggerLabel?: string;
  onDismiss?: () => void;
  onShow?: () => void;
}

// iOS/macOS-style frosted notification banner with fluid slide + fade
export const AppleNotificationBanner = forwardRef<HTMLOutputElement, AppleNotificationBannerProps>(
  (
    {
      className,
      title = 'AmNote',
      sender,
      message = 'Operation completed successfully.',
      time = 'now',
      type = 'info',
      icon,
      avatarSrc,
      avatarAlt = 'AmNote',
      action,
      showTriggerLabel = 'Show notification',
      onDismiss,
      onShow,
      ...props
    },
    ref
  ) => {
    const [phase, setPhase] = useState<'open' | 'closing' | 'closed'>('open');

    useEffect(() => {
      if (phase !== 'closing') return;
      const timer = globalThis.setTimeout(() => setPhase('closed'), EXIT_MS);
      return () => globalThis.clearTimeout(timer);
    }, [phase]);

    const handleDismiss = () => {
      if (phase !== 'open') return;
      setPhase('closing');
      onDismiss?.();
    };

    const handleShow = () => {
      setPhase('open');
      onShow?.();
    };

    if (phase === 'closed') {
      if (!showTriggerLabel) return null;
      return (
        <button
          type="button"
          data-slot="apple-notification-banner-trigger"
          onClick={handleShow}
          className={cn(
            'cursor-pointer rounded-xl px-4 py-2 text-xs font-medium transition-opacity duration-200 hover:opacity-90 shadow-sm',
            className
          )}
          style={{
            backgroundColor: 'var(--card-notelist-bg)',
            color: 'var(--text-editor)',
            border: '1px solid var(--color-border)',
          }}
        >
          {showTriggerLabel}
        </button>
      );
    }

    // Default icon based on type
    const defaultIcon = (() => {
      switch (type) {
        case 'success':
          return <CheckCircle2 size={18} className="text-emerald-500" />;
        case 'warning':
          return <AlertTriangle size={18} className="text-amber-500" />;
        case 'error':
          return <AlertCircle size={18} className="text-rose-500" />;
        default:
          return <Sparkles size={18} style={{ color: 'var(--color-accent)' }} />;
      }
    })();

    return (
      <output
        ref={ref}
        data-slot="apple-notification-banner"
        data-phase={phase}
        className={cn(
          'relative block w-84 max-w-[calc(100vw-2rem)] overflow-hidden rounded-[1.25rem] p-0 font-sans',
          'border shadow-[0_12px_40px_-6px_rgba(0,0,0,0.3)] backdrop-blur-2xl',
          'translate-y-0 opacity-100 starting:-translate-y-3 starting:opacity-0',
          'transition-all duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]',
          'data-[phase=closing]:-translate-y-2 data-[phase=closing]:opacity-0',
          'data-[phase=closing]:duration-260 data-[phase=closing]:ease-[cubic-bezier(0.4,0,0.6,1)]',
          className
        )}
        style={{
          backgroundColor: 'color-mix(in srgb, var(--card-notelist-bg) 88%, transparent)',
          borderColor: 'var(--color-border)',
          color: 'var(--text-editor)',
        }}
        {...props}
      >
        {/* Dismiss X button */}
        <button
          type="button"
          data-slot="apple-notification-banner-dismiss"
          onClick={handleDismiss}
          aria-label="Dismiss notification"
          className="absolute top-2.5 right-2.5 z-10 flex size-6 cursor-pointer items-center justify-center rounded-full opacity-60 transition-all duration-150 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10"
        >
          <X size={12} />
        </button>

        {/* Icon + text grid — matches iOS banner spacing */}
        <div className="grid grid-cols-[2.5rem_minmax(0,1fr)] items-start gap-x-3 gap-y-0.5 px-4 py-3.5 pr-8">
          <div
            data-slot="apple-notification-banner-avatar"
            className="relative row-span-2 mt-0.5 size-10 shrink-0 overflow-hidden rounded-[0.75rem] flex items-center justify-center shadow-xs border"
            style={{
              backgroundColor: 'var(--color-tag-bg)',
              borderColor: 'var(--color-border)',
            }}
          >
            {avatarSrc ? (
              <img src={avatarSrc} alt={avatarAlt} className="w-full h-full object-cover" />
            ) : (
              icon ?? defaultIcon
            )}
          </div>

          <div data-slot="apple-notification-banner-header" className="col-start-2 flex min-w-0 items-center justify-between gap-2">
            <p className="truncate text-[12.5px] leading-tight font-bold tracking-tight" style={{ color: 'var(--text-editor)' }}>
              {title}
            </p>
            <span className="shrink-0 text-[10.5px] leading-none tracking-tight opacity-50 capitalize font-mono">
              {time}
            </span>
          </div>

          <p data-slot="apple-notification-banner-content" className="col-start-2 text-[12.5px] leading-[1.38] opacity-85 mt-0.5 break-words">
            {sender && (
              <span className="font-semibold" style={{ color: 'var(--color-accent)' }}>
                {sender}:{' '}
              </span>
            )}
            {message}
          </p>

          {action && (
            <div className="col-start-2 mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  action.onClick();
                }}
                className="px-3 py-1 rounded-lg text-xs font-semibold text-white shadow-xs hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                style={{
                  backgroundColor: 'var(--color-accent)',
                  color: 'var(--color-accent-text)',
                }}
              >
                {action.label}
              </button>
            </div>
          )}
        </div>
      </output>
    );
  }
);

AppleNotificationBanner.displayName = 'AppleNotificationBanner';
