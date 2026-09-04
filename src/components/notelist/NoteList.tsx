import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Plus, FileText, Pin, CheckSquare, Lock, Calendar } from 'lucide-react';
import { useNoteStore } from '../../store/useNoteStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { resolveTagIcon, formatTagDisplay } from '../../utils/tagIcons';
import { NoteCard } from './NoteCard';
import { SortDropdown } from './SortDropdown';

export const NoteList: React.FC = () => {
  // Subscribe to notes array so NoteList re-renders on EVERY keystroke!
  const notes = useNoteStore((state) => state.notes);
  const activeNoteId = useNoteStore((state) => state.activeNoteId);
  const setActiveNoteId = useNoteStore((state) => state.setActiveNoteId);
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

  const [showSyntaxHelper, setShowSyntaxHelper] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);

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

  // Check if search query contains an open '@' query to show syntax helper
  useEffect(() => {
    const hasAtQuery = /(?:^|\s)@\w*$/.test(searchQuery);
    setShowSyntaxHelper(hasAtQuery);
  }, [searchQuery]);

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

  // Keyboard navigation handler across note cards
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (filteredNotes.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const currentIndex = filteredNotes.findIndex((n) => n.id === activeNoteId);
      if (currentIndex === -1 || currentIndex >= filteredNotes.length - 1) {
        setActiveNoteId(filteredNotes[0].id);
      } else {
        setActiveNoteId(filteredNotes[currentIndex + 1].id);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const currentIndex = filteredNotes.findIndex((n) => n.id === activeNoteId);
      if (currentIndex > 0) {
        setActiveNoteId(filteredNotes[currentIndex - 1].id);
      } else if (currentIndex === -1 && filteredNotes.length > 0) {
        setActiveNoteId(filteredNotes[filteredNotes.length - 1].id);
      }
    } else if (e.key === 'Enter') {
      // Focus into the ProseMirror editor canvas
      const editorEl = document.querySelector('.ProseMirror') as HTMLElement;
      if (editorEl) {
        e.preventDefault();
        editorEl.focus();
      }
    }
  };

  const applySyntaxToken = (token: string) => {
    const updated = searchQuery.replace(/(?:^|\s)@\w*$/, (m) => (m.startsWith(' ') ? ` ${token} ` : `${token} `));
    setSearchQuery(updated.trim() + ' ');
    setShowSyntaxHelper(false);
    searchInputRef.current?.focus();
  };

  return (
    <div
      ref={listContainerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className={`${panelWidthClass} h-full flex flex-col border-r select-none shrink-0 transition-all duration-150 outline-none`}
      style={{
        backgroundColor: 'var(--bg-notelist)',
        color: 'var(--text-notelist)',
        borderColor: 'var(--color-border)',
      }}
    >
      {/* Search Header */}
      <div className="p-3 pb-2 border-b space-y-2 relative" style={{ borderColor: 'var(--color-divider)' }} data-tauri-drag-region>
        <div
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border transition-all focus-within:ring-2 focus-within:ring-accent/40"
          style={{
            backgroundColor: 'var(--card-notelist-bg)',
            borderColor: 'var(--card-notelist-border)',
          }}
        >
          <Search size={15} className="opacity-50 shrink-0" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown' && !showSyntaxHelper) {
                e.preventDefault();
                handleKeyDown(e);
              }
            }}
            placeholder="Search notes, #tags, @todo..."
            className={`bg-transparent border-none outline-none ${searchInputClass} w-full placeholder:opacity-50`}
            style={{ color: 'var(--text-notelist)' }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setShowSyntaxHelper(false);
              }}
              className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 opacity-60 hover:opacity-100 transition-opacity shrink-0"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Quick Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5 pb-0.5 select-none">
          {[
            { id: 'all', label: 'All', icon: null, query: '' },
            { id: 'todo', label: 'Todo', icon: CheckSquare, query: '@todo' },
            { id: 'pinned', label: 'Pinned', icon: Pin, query: '@pinned' },
            { id: 'locked', label: 'Locked', icon: Lock, query: '@locked' },
          ].map((chip) => {
            const isSelected =
              chip.id === 'all'
                ? !searchQuery.includes('@todo') && !searchQuery.includes('@pinned') && !searchQuery.includes('@locked')
                : searchQuery.includes(chip.query);

            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => {
                  if (chip.id === 'all') {
                    setSearchQuery(searchQuery.replace(/@\w+/g, '').trim());
                  } else {
                    if (isSelected) {
                      setSearchQuery(searchQuery.replace(chip.query, '').trim());
                    } else {
                      const base = searchQuery.replace(/@\w+/g, '').trim();
                      setSearchQuery(base ? `${base} ${chip.query}` : chip.query);
                    }
                  }
                }}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium transition-all ${
                  isSelected
                    ? 'bg-accent text-white shadow-2xs font-semibold'
                    : 'bg-black/5 dark:bg-white/5 opacity-65 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10'
                }`}
                style={{
                  backgroundColor: isSelected ? 'var(--color-accent)' : undefined,
                  color: isSelected ? 'var(--color-accent-text)' : undefined,
                }}
              >
                {chip.icon && <chip.icon size={10.5} />}
                <span>{chip.label}</span>
              </button>
            );
          })}
        </div>

        {/* Syntax Helper Dropdown (shows when typing '@') */}
        {showSyntaxHelper && (
          <div
            className="absolute left-3 right-3 top-[74px] z-30 p-1.5 rounded-xl border shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
            style={{
              backgroundColor: 'var(--card-notelist-bg)',
              borderColor: 'var(--color-border)',
            }}
          >
            <div className="text-[10px] font-semibold px-2 py-1 opacity-50 uppercase tracking-wider">
              Search Filters
            </div>
            {[
              { token: '@todo', label: 'Pending Tasks', desc: 'Notes with unchecked todo items', icon: CheckSquare },
              { token: '@pinned', label: 'Pinned Notes', desc: 'Important pinned notes', icon: Pin },
              { token: '@locked', label: 'Locked Notes', desc: 'Password protected notes', icon: Lock },
              { token: '@today', label: 'Today', desc: 'Created or modified today', icon: Calendar },
            ].map((item) => (
              <button
                key={item.token}
                type="button"
                onClick={() => applySyntaxToken(item.token)}
                className="w-full flex items-center justify-between p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-left transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <item.icon size={13} className="text-accent shrink-0" style={{ color: 'var(--color-accent)' }} />
                  <span className="font-mono text-xs font-semibold text-accent" style={{ color: 'var(--color-accent)' }}>
                    {item.token}
                  </span>
                  <span className="text-[11px] opacity-60 truncate">{item.desc}</span>
                </div>
              </button>
            ))}
          </div>
        )}

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

      {/* Note Cards List or Actionable Empty State */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 flex flex-col">
        {filteredNotes.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none animate-in fade-in duration-150">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3 shadow-xs border"
              style={{
                backgroundColor: 'var(--card-notelist-bg)',
                borderColor: 'var(--card-notelist-border)',
              }}
            >
              <TagIconComponent
                size={22}
                className="opacity-50"
                style={{ color: customColor || (selectedTag ? 'var(--color-accent)' : undefined) }}
              />
            </div>
            <div className="font-semibold text-xs mb-1" style={{ color: 'var(--text-notelist)' }}>
              {searchQuery
                ? 'No matching notes'
                : selectedTag
                ? `No notes in #${formatTagDisplay(selectedTag)}`
                : 'No notes in this view'}
            </div>
            <p className="text-[11px] opacity-60 mb-4 max-w-[200px] leading-relaxed">
              {searchQuery
                ? `No notes match "${searchQuery}". Clear query or start a new note.`
                : `Capture thoughts, tasks, or reference material in this section.`}
            </p>
            <div className="flex flex-col gap-1.5 w-full max-w-[190px]">
              <button
                type="button"
                onClick={() => createNote(selectedTag || undefined)}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-semibold text-white shadow-sm transition-transform active:scale-[0.98]"
                style={{ backgroundColor: 'var(--color-accent)' }}
              >
                <Plus size={13} />
                <span>Create Note</span>
              </button>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="w-full py-1 text-[11px] opacity-60 hover:opacity-100 transition-opacity"
                >
                  Clear search query
                </button>
              )}
            </div>
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
