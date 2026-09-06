import React from 'react';
import {
  X,
  FileText,
  Clock,
  Calendar,
  ListTree,
  Link as LinkIcon,
  Share2,
  ExternalLink,
} from 'lucide-react';
import { useNoteStore } from '../../store/useNoteStore';
import { useUIStore } from '../../store/useUIStore';

export const InfoDrawer: React.FC = () => {
  const isInfoDrawerOpen = useUIStore((state) => state.isInfoDrawerOpen);
  const toggleInfoDrawer = useUIStore((state) => state.toggleInfoDrawer);
  const setExportModalOpen = useUIStore((state) => state.setExportModalOpen);

  const activeNote = useNoteStore((state) => state.getActiveNote());
  const getNoteStats = useNoteStore((state) => state.getNoteStats);
  const getHeadings = useNoteStore((state) => state.getHeadings);
  const getBacklinks = useNoteStore((state) => state.getBacklinks);
  const setActiveNoteId = useNoteStore((state) => state.setActiveNoteId);

  if (!isInfoDrawerOpen || !activeNote) return null;

  const stats = getNoteStats(activeNote.id);
  const headings = getHeadings(activeNote.id);
  const backlinks = getBacklinks(activeNote.id);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleJumpToHeading = (headingText: string, level: number) => {
    const headingElements = Array.from(
      document.querySelectorAll<HTMLElement>(`.ProseMirror h${level}`)
    );
    const target = headingElements.find((el) => {
      const cleanEl = el.textContent?.replace(/^#+\s*/, '').trim().toLowerCase();
      return cleanEl?.includes(headingText.trim().toLowerCase());
    });

    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.style.transition = 'background-color 0.4s ease';
      target.style.backgroundColor = 'rgba(229, 57, 53, 0.15)';
      setTimeout(() => {
        target.style.backgroundColor = '';
      }, 1200);
    }
  };

  return (
    <div
      className="w-80 h-full border-l flex flex-col justify-between select-none shrink-0 animate-in slide-in-from-right-4 duration-200"
      style={{
        backgroundColor: 'var(--bg-notelist)',
        color: 'var(--text-notelist)',
        borderColor: 'var(--color-border)',
      }}
    >
      {/* Header */}
      <div
        className="h-10 border-b px-4 flex items-center justify-between"
        style={{ borderColor: 'var(--color-divider)' }}
      >
        <div className="flex items-center gap-2">
          <FileText size={15} className="text-(--color-accent)" style={{ color: 'var(--color-accent)' }} />
          <span className="font-semibold text-xs">Note Inspector</span>
        </div>
        <button
          type="button"
          onClick={toggleInfoDrawer}
          className="p-1 rounded-lg opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-opacity"
        >
          <X size={14} />
        </button>
      </div>

      {/* Body Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Statistics Grid */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-bold uppercase tracking-wider opacity-50">
            Statistics
          </div>
          <div
            className="grid grid-cols-2 gap-2 p-3 rounded-xl border text-xs"
            style={{
              backgroundColor: 'var(--card-notelist-bg)',
              borderColor: 'var(--card-notelist-border)',
            }}
          >
            <div>
              <div className="text-[10px] opacity-60">Words</div>
              <div className="font-bold text-sm">{stats.words}</div>
            </div>
            <div>
              <div className="text-[10px] opacity-60">Characters</div>
              <div className="font-bold text-sm">{stats.characters}</div>
            </div>
            <div>
              <div className="text-[10px] opacity-60">Paragraphs</div>
              <div className="font-bold text-sm">{stats.paragraphs}</div>
            </div>
            <div>
              <div className="text-[10px] opacity-60">Reading Time</div>
              <div className="font-bold text-sm">{stats.readTimeMinutes} min</div>
            </div>
          </div>
        </div>

        {/* Timestamps */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-bold uppercase tracking-wider opacity-50">
            Timestamps
          </div>
          <div
            className="p-3 rounded-xl border space-y-2 text-xs"
            style={{
              backgroundColor: 'var(--card-notelist-bg)',
              borderColor: 'var(--card-notelist-border)',
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 opacity-70">
                <Calendar size={12} />
                <span>Created</span>
              </div>
              <span className="font-mono text-[11px] opacity-90">{formatDate(activeNote.createdAt)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 opacity-70">
                <Clock size={12} />
                <span>Modified</span>
              </div>
              <span className="font-mono text-[11px] opacity-90">{formatDate(activeNote.updatedAt)}</span>
            </div>
          </div>
        </div>

        {/* Table of Contents / Outline */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider opacity-50">
            <div className="flex items-center gap-1.5">
              <ListTree size={12} />
              <span>Table of Contents</span>
            </div>
            <span className="font-mono text-[10px]">{headings.length}</span>
          </div>

          {headings.length === 0 ? (
            <div className="text-xs opacity-40 italic px-2 py-1">No headings in this note.</div>
          ) : (
            <div
              className="p-1.5 rounded-xl border space-y-0.5 max-h-48 overflow-y-auto"
              style={{
                backgroundColor: 'var(--card-notelist-bg)',
                borderColor: 'var(--card-notelist-border)',
              }}
            >
              {headings.map((h, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleJumpToHeading(h.text, h.level)}
                  className="w-full px-2 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer text-xs text-left truncate transition-colors flex items-center gap-1.5 group"
                  style={{
                    paddingLeft: `${Math.max(8, (h.level - 1) * 12 + 8)}px`,
                  }}
                  title={`Jump to: ${h.text}`}
                >
                  <span className="font-mono opacity-40 group-hover:text-(--color-accent) group-hover:opacity-100 text-[10px]">
                    H{h.level}
                  </span>
                  <span className="truncate group-hover:text-(--color-accent) font-medium">{h.text}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Backlinks */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider opacity-50">
            <div className="flex items-center gap-1.5">
              <LinkIcon size={12} />
              <span>Mentioned In (Backlinks)</span>
            </div>
            <span className="font-mono text-[10px]">{backlinks.length}</span>
          </div>

          {backlinks.length === 0 ? (
            <div className="text-xs opacity-40 italic px-2 py-1">
              No notes reference this note via [[{activeNote.title}]].
            </div>
          ) : (
            <div
              className="p-1.5 rounded-xl border space-y-0.5 max-h-40 overflow-y-auto"
              style={{
                backgroundColor: 'var(--card-notelist-bg)',
                borderColor: 'var(--card-notelist-border)',
              }}
            >
              {backlinks.map((link) => (
                <button
                  key={link.noteId}
                  type="button"
                  onClick={() => setActiveNoteId(link.noteId)}
                  className="w-full px-2.5 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer text-xs flex items-center justify-between group transition-colors text-left"
                >
                  <span className="truncate font-medium group-hover:text-(--color-accent) transition-colors">
                    {link.title}
                  </span>
                  <ExternalLink size={11} className="opacity-40 group-hover:opacity-100 shrink-0 ml-2" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer Action */}
      <div
        className="p-3 border-t flex items-center justify-between"
        style={{ borderColor: 'var(--color-divider)' }}
      >
        <button
          type="button"
          onClick={() => setExportModalOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all hover:brightness-105"
          style={{
            backgroundColor: 'var(--color-accent)',
            color: 'var(--color-accent-text)',
          }}
        >
          <Share2 size={13} />
          <span>Export Note</span>
        </button>
      </div>
    </div>
  );
};
