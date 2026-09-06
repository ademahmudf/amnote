import React from 'react';
import { FileText, Clock, Lock, Unlock } from 'lucide-react';
import type { NoteMetrics } from '../utils/editorTriggers';

export interface EditorStatusBarProps {
  metrics: NoteMetrics;
  wordGoal: number;
  focusMode: boolean;
  focusModeType: 'sentence' | 'paragraph';
  onCycleFocusMode: () => void;
  typewriterMode: boolean;
  onToggleTypewriterMode: () => void;
  isLocked: boolean;
  isUnlocked: boolean;
  onToggleInfoDrawer: () => void;
}

export const EditorStatusBar: React.FC<EditorStatusBarProps> = ({
  metrics,
  wordGoal,
  focusMode,
  focusModeType,
  onCycleFocusMode,
  typewriterMode,
  onToggleTypewriterMode,
  isLocked,
  isUnlocked,
  onToggleInfoDrawer,
}) => {
  const { words, chars, readTime } = metrics;
  return (
    <div
      className="h-8 border-t flex items-center justify-between px-6 text-[11px] select-none shrink-0"
      style={{
        borderColor: 'var(--color-divider)',
        color: 'var(--text-editor-muted)',
      }}
    >
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onToggleInfoDrawer}
          title="Open Note Stats & Details (Ctrl+Shift+I)"
          className="flex items-center gap-1.5 hover:opacity-100 hover:text-foreground transition-colors cursor-pointer"
        >
          <FileText size={12} className="opacity-60" />
          <span>{words} words</span>
          <span className="opacity-40">•</span>
          <span>{chars} chars</span>
        </button>
        <div className="flex items-center gap-1.5">
          <Clock size={12} className="opacity-60" />
          <span>{readTime} min</span>
        </div>

        {/* Word Goal Progress */}
        {wordGoal > 0 && (
          <div className="flex items-center gap-1.5 font-mono">
            <span className="opacity-40">•</span>
            <span className={words >= wordGoal ? 'text-emerald-500 font-bold' : ''}>
              🎯 {words}/{wordGoal} ({Math.min(100, Math.round((words / wordGoal) * 100))}%)
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Focus Mode Button */}
        <button
          type="button"
          onClick={onCycleFocusMode}
          title="Click to cycle: Sentence Focus → Paragraph Focus → Off (Ctrl+Shift+F)"
          className={`px-1.5 py-0.5 rounded transition-all flex items-center gap-1 text-[10px] font-medium cursor-pointer ${
            focusMode
              ? 'bg-(--color-accent) text-white'
              : 'opacity-50 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
          }`}
          style={{
            backgroundColor: focusMode ? 'var(--color-accent)' : undefined,
            color: focusMode ? 'var(--color-accent-text)' : undefined,
          }}
        >
          <span>🎯 Focus{focusMode ? `: ${focusModeType === 'sentence' ? 'Sentence' : 'Paragraph'}` : ''}</span>
        </button>

        {/* Typewriter Mode Button */}
        <button
          type="button"
          onClick={onToggleTypewriterMode}
          title="Toggle Typewriter Centering Mode (Ctrl+Shift+T)"
          className={`px-1.5 py-0.5 rounded transition-all flex items-center gap-1 text-[10px] font-medium cursor-pointer ${
            typewriterMode
              ? 'bg-(--color-accent) text-white'
              : 'opacity-50 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
          }`}
          style={{
            backgroundColor: typewriterMode ? 'var(--color-accent)' : undefined,
            color: typewriterMode ? 'var(--color-accent-text)' : undefined,
          }}
        >
          <span>⌖ Typewriter</span>
        </button>

        {isLocked && (
          <div
            className={`flex items-center gap-1 ${
              isUnlocked ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            {isUnlocked ? <Unlock size={12} /> : <Lock size={12} />}
            <span>{isUnlocked ? 'Unlocked' : 'Locked'}</span>
          </div>
        )}
        <span>Saved</span>
      </div>
    </div>
  );
};
