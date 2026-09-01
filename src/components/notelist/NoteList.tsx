import React from 'react';
import { Search, X, Plus, FileText, Pin } from 'lucide-react';
import { useNoteStore } from '../../store/useNoteStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { resolveTagIcon, formatTagDisplay } from '../../utils/tagIcons';
import { NoteCard } from './NoteCard';
import { SortDropdown } from './SortDropdown';

export const NoteList: React.FC = () => {
  // Subscribe to notes array so NoteList re-renders on EVERY keystroke!
  const notes = useNoteStore((state) => state.notes);
  const activeNoteId = useNoteStore((state) => state.activeNoteId);
  const activeFilter = useNoteStore((state) => state.activeFilter);
  const selectedTag = useNoteStore((state) => state.selectedTag);
  const searchQuery = useNoteStore((state) => state.searchQuery);
  const sortOption = useNoteStore((state) => state.sortOption);
  const setSearchQuery = useNoteStore((state) => state.setSearchQuery);
  const createNote = useNoteStore((state) => state.createNote);
  const getFilteredNotes = useNoteStore((state) => state.getFilteredNotes);

  const tagIcons = useSettingsStore((state) => state.tagIcons);
  const tagColors = useSettingsStore((state) => state.tagColors);
  const uiScale = useSettingsStore((state) => state.uiScale);

  // Recalculate filtered notes using subscribed state
  const filteredNotes = React.useMemo(() => {
    return getFilteredNotes();
  }, [notes, activeFilter, selectedTag, searchQuery, sortOption, getFilteredNotes]);

  const { pinnedNotes, regularNotes } = React.useMemo(() => {
    const pinned: typeof filteredNotes = [];
    const regular: typeof filteredNotes = [];
    filteredNotes.forEach((n) => {
      if (n.isPinned) {
        pinned.push(n);
      } else {
        regular.push(n);
      }
    });
    return { pinnedNotes: pinned, regularNotes: regular };
  }, [filteredNotes]);

  // Get active view title and icon
  const viewTitle = selectedTag
    ? `#${formatTagDisplay(selectedTag)}`
    : activeFilter
    ? activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)
    : 'Notes';

  const customIcon = selectedTag ? tagIcons[selectedTag] : undefined;
  const customColor = selectedTag ? tagColors[selectedTag] : undefined;
  const TagIconComponent = selectedTag ? resolveTagIcon(selectedTag, customIcon) : FileText;

  const panelWidthClass = {
    compact: 'w-72',
    standard: 'w-76',
    comfortable: 'w-80',
    spacious: 'w-88',
  }[uiScale] || 'w-80';

  const searchInputClass = {
    compact: 'text-xs',
    standard: 'text-[12.5px]',
    comfortable: 'text-[13.5px]',
    spacious: 'text-sm',
  }[uiScale] || 'text-[13.5px]';

  const headerTitleClass = {
    compact: 'text-xs',
    standard: 'text-[13px]',
    comfortable: 'text-sm',
    spacious: 'text-base',
  }[uiScale] || 'text-sm';

  return (
    <div
      className={`${panelWidthClass} h-full flex flex-col border-r select-none shrink-0 transition-all duration-150`}
      style={{
        backgroundColor: 'var(--bg-notelist)',
        color: 'var(--text-notelist)',
        borderColor: 'var(--color-border)',
      }}
    >
      {/* Search Header */}
      <div className="p-3 pb-2 border-b space-y-2" style={{ borderColor: 'var(--color-divider)' }} data-tauri-drag-region>
        <div
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border transition-all focus-within:ring-2 focus-within:ring-accent/40"
          style={{
            backgroundColor: 'var(--card-notelist-bg)',
            borderColor: 'var(--card-notelist-border)',
          }}
        >
          <Search size={15} className="opacity-50 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes, #tags, @todo..."
            className={`bg-transparent border-none outline-none ${searchInputClass} w-full placeholder:opacity-50`}
            style={{ color: 'var(--text-notelist)' }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 opacity-60 hover:opacity-100 transition-opacity shrink-0"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Category Header Row */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5 overflow-hidden">
            <TagIconComponent
              size={15}
              className="shrink-0 transition-colors"
              style={{ color: customColor || (selectedTag ? 'var(--color-accent)' : undefined) }}
            />
            <span className={`font-bold ${headerTitleClass} truncate`}>{viewTitle}</span>
            <span className="text-[11px] opacity-50 font-mono">({filteredNotes.length})</span>
          </div>

          <div className="flex items-center gap-1">
            <SortDropdown />
            <button
              type="button"
              onClick={() => createNote(selectedTag || undefined)}
              title="Create note in this view"
              className="p-1.5 rounded-lg opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-all text-xs"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Note Cards List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {filteredNotes.length === 0 ? (
          <div className="text-center py-16 px-4 opacity-40 text-xs">
            No notes in this view.
          </div>
        ) : (
          <>
            {/* Pinned Section */}
            {pinnedNotes.length > 0 && (
              <div className="space-y-1 pb-1">
                <div className="flex items-center gap-1.5 px-2 pt-1 pb-0.5 text-[10px] font-bold uppercase tracking-wider text-accent opacity-80 select-none">
                  <Pin size={10} className="fill-current" />
                  <span>Pinned ({pinnedNotes.length})</span>
                </div>
                {pinnedNotes.map((note) => (
                  <NoteCard key={note.id} note={note} isActive={note.id === activeNoteId} />
                ))}
              </div>
            )}

            {/* Regular Notes Section */}
            {regularNotes.length > 0 && (
              <div className="space-y-1">
                {pinnedNotes.length > 0 && (
                  <div className="px-2 pt-2 pb-0.5 text-[10px] font-bold uppercase tracking-wider opacity-40 select-none">
                    Notes ({regularNotes.length})
                  </div>
                )}
                {regularNotes.map((note) => (
                  <NoteCard key={note.id} note={note} isActive={note.id === activeNoteId} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
