import React from 'react';
import { Lock, KeyRound, AlertCircle, ShieldCheck } from 'lucide-react';

export interface EditorLockScreenProps {
  hasLockHash: boolean;
  password: string;
  onPasswordChange: (pwd: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  error: boolean;
  passwordInputRef: React.RefObject<HTMLInputElement | null>;
  onOpenLockSettings: () => void;
}

export const EditorLockScreen: React.FC<EditorLockScreenProps> = ({
  hasLockHash,
  password,
  onPasswordChange,
  onSubmit,
  error,
  passwordInputRef,
  onOpenLockSettings,
}) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 select-none animate-in fade-in duration-200">
      <div
        className="w-full max-w-sm rounded-3xl p-8 border shadow-2xl flex flex-col items-center text-center backdrop-blur-md"
        style={{
          backgroundColor: 'var(--card-notelist-bg)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 text-amber-400 shadow-inner"
          style={{ backgroundColor: 'rgba(251, 191, 36, 0.12)' }}
        >
          <Lock size={32} />
        </div>

        <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--text-editor)' }}>
          Note is Locked
        </h2>
        <p className="text-xs opacity-60 mb-6 max-w-xs leading-relaxed">
          This note is protected. Enter your password to view and edit its contents.
        </p>

        <form onSubmit={onSubmit} className="w-full space-y-3">
          {hasLockHash && (
            <div className="relative">
              <KeyRound
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40"
              />
              <input
                ref={passwordInputRef}
                type="password"
                value={password}
                onChange={(e) => onPasswordChange(e.target.value)}
                placeholder="Enter password..."
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border bg-black/10 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-(--color-accent)"
                style={{ borderColor: 'var(--color-border)' }}
              />
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center gap-1.5 text-xs text-rose-400">
              <AlertCircle size={14} />
              <span>Incorrect password. Please try again.</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            <ShieldCheck size={16} />
            <span>Unlock Note</span>
          </button>

          <button
            type="button"
            onClick={onOpenLockSettings}
            className="text-[11px] opacity-50 hover:opacity-100 transition-opacity pt-1 underline underline-offset-2 cursor-pointer"
          >
            Lock Settings
          </button>
        </form>
      </div>
    </div>
  );
};
