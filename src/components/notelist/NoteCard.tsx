import React, { useState, useRef, useEffect } from 'react';
import type { Note } from '../../types/note';
import { useNoteStore } from '../../store/useNoteStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { resolveTagIcon, formatTagDisplay } from '../../utils/tagIcons';
import { promptDeletePermanentlyConfirmation } from '../../utils/trashConfirmation';
import {
  Pin,
  MoreVertical,
  Copy,
  Archive,
  Trash2,
  Lock,
  Unlock,
  RotateCcw,
  CheckSquare,
} from 'lucide-react';

interface NoteCardProps {
  note: Note;
  isActive: boolean;
}

export function formatRelativeDate(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHour < 24) return `${diffHour}h`;
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d`;

  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function cleanSnippet(content: string): string {
  let text = content.replace(/^#+\s+.*$/m, '');
  text = text
    .replace(/@due\(\d{4}-\d{2}-\d{2}\)/gi, '')
    .replace(/[#*`_~[\]()]/g, '')
    .replace(/>\s*\[!.*?\]/g, '')
    .replace(/-\s+\[[ x]\]/g, '')
    .replace(/\|.*?\|/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return text || 'No additional text';
}

// Memoized: the store replaces only the edited note object on each keystroke,
// so untouched cards skip re-renders via the unchanged `note` identity.
export const NoteCard: React.FC<NoteCardProps> = React.memo(function NoteCard({ note, isActive }) {
  const setActiveNoteId = useNoteStore((state) => state.setActiveNoteId);
  const togglePin = useNoteStore((state) => state.togglePin);
  const duplicateNote = useNoteStore((state) => state.duplicateNote);
  const toggleArchive = useNoteStore((state) => state.toggleArchive);
  const trashNote = useNoteStore((state) => state.trashNote);
  const restoreNote = useNoteStore((state) => state.restoreNote);
  const setPasswordModalOpen = useNoteStore((state) => state.setPasswordModalOpen);
  const isNoteUnlocked = useNoteStore((state) => state.isNoteUnlocked);

  const tagIcons = useSettingsStore((state) => state.tagIcons);
  const tagColors = useSettingsStore((state) => state.tagColors);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isUnlocked = isNoteUnlocked(note.id);
  const snippet = note.isLocked && !isUnlocked ? '🔒 Locked note (content protected)' : cleanSnippet(note.content);
  const formattedDate = formatRelativeDate(note.updatedAt);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const uiScale = useSettingsStore((state) => state.uiScale);
  const previewLines = useSettingsStore((state) => state.previewLines);

  const titleSize = {
    compact: 'text-[12.5px]',
    standard: 'text-[13.5px]',
    comfortable: 'text-[15px]',
    spacious: 'text-[16.5px]',
  }[uiScale] || 'text-[15px]';

  const snippetSize = {
    compact: 'text-[11px]',
    standard: 'text-[12px]',
    comfortable: 'text-[13px]',
    spacious: 'text-[14px]',
  }[uiScale] || 'text-[13px]';

  const dateSize = {
    compact: 'text-[10px]',
    standard: 'text-[11px]',
    comfortable: 'text-[11.5px]',
    spacious: 'text-[12px]',
  }[uiScale] || 'text-[11.5px]';

  const badgeSize = {
    compact: 'text-[9.5px]',
    standard: 'text-[10.5px]',
    comfortable: 'text-[11px]',
    spacious: 'text-[12px]',
  }[uiScale] || 'text-[10.5px]';

  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isActive && cardRef.current) {
      cardRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [isActive]);

  return (
    <div
      ref={cardRef}
      data-note-id={note.id}
      tabIndex={isActive ? 0 : -1}
      role="option"
      aria-selected={isActive}
      aria-label={note.title || 'Untitled'}
      onClick={() => setActiveNoteId(note.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setActiveNoteId(note.id);
        } else if (e.key === 'Escape') {
          setIsMenuOpen(false);
        }
      }}
      className={`group relative p-3 rounded-xl cursor-pointer select-none transition-all duration-150 border outline-none ${
        isActive
          ? 'shadow-md border-accent'
          : 'hover:border-border/80 opacity-85 hover:opacity-100 focus-visible:ring-1 focus-visible:ring-accent/40'
      }`}
      style={{
        backgroundColor: isActive
          ? 'var(--card-notelist-active)'
          : 'var(--card-notelist-bg)',
        borderColor: isActive ? 'var(--color-accent)' : 'var(--card-notelist-border)',
        color: 'var(--text-notelist)',
      }}
    >
      {/* Top row: Title & Date & Pin */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {note.isPinned && (
            <Pin
              size={13}
              className="text-accent fill-current shrink-0"
              style={{ color: 'var(--color-accent)' }}
            />
          )}
          {note.isLocked && (
            <Lock
              size={13}
              className={`shrink-0 ${isUnlocked ? 'text-emerald-400' : 'text-amber-400'}`}
            />
          )}
          <h3 className={`font-semibold ${titleSize} truncate leading-snug`}>{note.title || 'Untitled'}</h3>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <span className={`${dateSize} opacity-50 font-mono`}>{formattedDate}</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen(!isMenuOpen);
            }}
            title="Note actions"
            aria-label={`Actions for ${note.title || 'Untitled'}`}
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
            className="p-0.5 rounded opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 transition-opacity"
          >
            <MoreVertical size={12} />
          </button>
        </div>
      </div>

      {/* Snippet preview */}
      <p
        className={`${snippetSize} leading-relaxed mb-2 ${
          note.isLocked && !isUnlocked ? 'opacity-40 italic' : 'opacity-70'
        }`}
        style={{
          display: '-webkit-box',
          WebkitLineClamp: previewLines,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {snippet}
      </p>

      {/* Bottom tags & Task badges */}
      {(note.tags.length > 0 || (note.content.match(/- \[[ x]\]/gi) || []).length > 0) && (
        <div className="flex items-center gap-1.5 flex-wrap overflow-hidden max-h-5">
          {/* Task Progress Badge */}
          {(() => {
            const taskMatches = note.content.match(/- \[[ x]\]/gi) || [];
            if (taskMatches.length === 0) return null;
            const doneTasks = (note.content.match(/- \[x\]/gi) || []).length;
            const isAllDone = doneTasks === taskMatches.length;

            return (
              <span
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md ${badgeSize} font-mono font-medium leading-none shrink-0 ${
                  isAllDone
                    ? 'bg-emerald-500/15 text-emerald-500 dark:text-emerald-400'
                    : 'bg-black/10 dark:bg-white/10 opacity-70'
                }`}
                title={`Tasks: ${doneTasks} of ${taskMatches.length} completed`}
              >
                <CheckSquare size="0.95em" className="note-card-badge-icon" />
                <span className="note-card-badge-label">{isAllDone ? 'Done' : `${doneTasks}/${taskMatches.length}`}</span>
              </span>
            );
          })()}

          {note.tags.slice(0, 3).map((tag) => {
            const customIcon = tagIcons[tag];
            const customColor = tagColors[tag];
            const IconComp = resolveTagIcon(tag, customIcon);

            return (
              <span
                key={tag}
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full ${badgeSize} font-medium leading-none`}
                style={{
                  backgroundColor: customColor ? `${customColor}20` : 'var(--color-tag-bg)',
                  color: customColor || 'var(--color-tag-text)',
                }}
              >
                <IconComp size="0.95em" className="note-card-badge-icon" />
                <span className="note-card-badge-label">{formatTagDisplay(tag)}</span>
              </span>
            );
          })}
          {note.tags.length > 3 && (
            <span className={`${badgeSize} opacity-40 leading-none`}>+{note.tags.length - 3}</span>
          )}
        </div>
      )}

      {/* Context Action Menu */}
      {isMenuOpen && (
        <div
          ref={menuRef}
          role="menu"
          aria-label={`Actions for ${note.title || 'Untitled'}`}
          className="absolute right-2 top-8 w-44 rounded-xl shadow-2xl border p-1 z-30 backdrop-blur-lg animate-in fade-in zoom-in-95 duration-100 text-xs"
          style={{
            backgroundColor: 'var(--card-notelist-bg)',
            borderColor: 'var(--color-border)',
            color: 'var(--text-notelist)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {!note.isTrashed ? (
            <>
              <button
                type="button"
                onClick={() => {
                  togglePin(note.id);
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-left"
              >
                <Pin size={13} />
                <span>{note.isPinned ? 'Unpin' : 'Pin to Top'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPasswordModalOpen(true, note.id);
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-left"
              >
                {note.isLocked ? <Unlock size={13} /> : <Lock size={13} />}
                <span>{note.isLocked ? 'Manage Lock' : 'Lock Note'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  duplicateNote(note.id);
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-left"
              >
                <Copy size={13} />
                <span>Duplicate</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  toggleArchive(note.id);
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-left"
              >
                <Archive size={13} />
                <span>{note.isArchived ? 'Unarchive' : 'Archive'}</span>
              </button>

              <div className="h-px my-1" style={{ backgroundColor: 'var(--color-divider)' }} />

              <button
                type="button"
                onClick={() => {
                  trashNote(note.id);
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-rose-500/10 text-rose-400 text-left"
              >
                <Trash2 size={13} />
                <span>Move to Trash</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  restoreNote(note.id);
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-left"
              >
                <RotateCcw size={13} />
                <span>Restore Note</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  promptDeletePermanentlyConfirmation(note);
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-rose-600 text-rose-400 hover:text-white text-left"
              >
                <Trash2 size={13} />
                <span>Delete Forever</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
});
