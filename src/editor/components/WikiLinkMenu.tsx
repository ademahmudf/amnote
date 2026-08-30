import React, { useState, useEffect, useMemo } from 'react';
import { Editor } from '@tiptap/react';
import { FileText, Plus, Hash } from 'lucide-react';
import { useNoteStore } from '../../store/useNoteStore';

interface WikiLinkMenuProps {
  editor: Editor;
  isOpen: boolean;
  onClose: () => void;
  query: string;
  position: { top: number; left: number };
}

export const WikiLinkMenu: React.FC<WikiLinkMenuProps> = ({
  editor,
  isOpen,
  onClose,
  query,
  position,
}) => {
  const notes = useNoteStore((state) => state.notes);
  const activeNoteId = useNoteStore((state) => state.activeNoteId);
  const createNote = useNoteStore((state) => state.createNote);

  const [selectedIndex, setSelectedIndex] = useState(0);

  // Filter existing notes excluding trashed notes and current note
  const filteredNotes = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes
      .filter((n) => !n.isTrashed && n.id !== activeNoteId)
      .filter((n) => {
        if (!q) return true;
        return (
          n.title.toLowerCase().includes(q) ||
          n.tags.some((t) => t.toLowerCase().includes(q))
        );
      })
      .slice(0, 8);
  }, [notes, activeNoteId, query]);

  const exactMatch = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return notes.some((n) => !n.isTrashed && n.title.toLowerCase().trim() === q);
  }, [notes, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSelectNote = (targetTitle: string) => {
    const { state } = editor;
    const { selection } = state;
    const { $from } = selection;
    const textBefore = $from.parent.textBetween(0, $from.parentOffset, undefined, '\ufffc');

    const lastDoubleBracket = textBefore.lastIndexOf('[[');
    if (lastDoubleBracket !== -1) {
      const startPos = $from.start() + lastDoubleBracket;
      const endPos = selection.from;

      editor
        .chain()
        .focus()
        .deleteRange({ from: startPos, to: endPos })
        .insertContent(`[[${targetTitle}]] `)
        .run();
    }

    onClose();
  };

  const handleCreateNewNote = () => {
    const title = query.trim() || 'New Note';
    createNote(undefined, title);
    handleSelectNote(title);
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const totalItems = filteredNotes.length + (!exactMatch && query.trim() ? 1 : 0);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, totalItems));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + totalItems) % Math.max(1, totalItems));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (selectedIndex < filteredNotes.length) {
          handleSelectNote(filteredNotes[selectedIndex].title || 'Untitled');
        } else if (!exactMatch && query.trim()) {
          handleCreateNewNote();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, selectedIndex, filteredNotes, exactMatch, query]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed z-50 w-72 rounded-2xl shadow-2xl border overflow-hidden p-1.5 animate-in fade-in zoom-in-95 duration-100 select-none"
      style={{
        top: `${position.top}px`,
        left: `${Math.min(position.left, window.innerWidth - 300)}px`,
        backgroundColor: 'var(--card-notelist-bg)',
        borderColor: 'var(--color-border)',
        color: 'var(--text-editor)',
      }}
    >
      <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider opacity-50 flex items-center justify-between border-b mb-1" style={{ borderColor: 'var(--color-divider)' }}>
        <span>Link to Note</span>
        <span>[[...]]</span>
      </div>

      <div className="max-h-60 overflow-y-auto space-y-0.5">
        {filteredNotes.length === 0 && !query.trim() && (
          <div className="px-3 py-4 text-center text-xs opacity-50">
            No other notes in vault yet.
          </div>
        )}

        {filteredNotes.map((note, index) => {
          const isSelected = index === selectedIndex;
          return (
            <button
              key={note.id}
              type="button"
              onClick={() => handleSelectNote(note.title || 'Untitled')}
              className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left transition-all ${
                isSelected
                  ? 'bg-accent/15 text-accent font-semibold'
                  : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-80'
              }`}
              style={{
                color: isSelected ? 'var(--color-accent)' : undefined,
              }}
            >
              <FileText size={14} className="shrink-0 opacity-70" />
              <div className="flex-1 min-w-0">
                <div className="text-xs truncate font-medium">{note.title || 'Untitled'}</div>
                {note.tags.length > 0 && (
                  <div className="flex items-center gap-1 text-[10px] opacity-50 truncate mt-0.5">
                    <Hash size={10} />
                    <span>{note.tags.join(', ')}</span>
                  </div>
                )}
              </div>
            </button>
          );
        })}

        {/* Option to create a new note with this query title */}
        {!exactMatch && query.trim().length > 0 && (
          <button
            type="button"
            onClick={handleCreateNewNote}
            className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left border-t transition-all ${
              selectedIndex === filteredNotes.length
                ? 'bg-accent/15 text-accent font-semibold'
                : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-80'
            }`}
            style={{
              borderColor: 'var(--color-divider)',
              color: selectedIndex === filteredNotes.length ? 'var(--color-accent)' : undefined,
            }}
          >
            <Plus size={14} className="shrink-0 text-accent" style={{ color: 'var(--color-accent)' }} />
            <div className="text-xs truncate">
              Create Note: <span className="font-semibold italic">"{query.trim()}"</span>
            </div>
          </button>
        )}
      </div>
    </div>
  );
};
