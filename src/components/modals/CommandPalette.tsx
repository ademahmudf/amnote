import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  FileText,
  Hash,
  Plus,
  Palette,
  Maximize2,
  Minimize2,
  Download,
  Settings,
  Calendar,
  CheckSquare,
  Trash2,
} from 'lucide-react';
import { useNoteStore } from '../../store/useNoteStore';
import { useThemeStore } from '../../store/useThemeStore';
import { THEMES } from '../../themes/themeDefinitions';
import type { ThemeId } from '../../types/note';
import { notify } from '../../store/useNotificationStore';
import { promptEmptyTrashConfirmation } from '../../utils/trashConfirmation';

export const CommandPalette: React.FC = () => {
  const isCommandPaletteOpen = useNoteStore((state) => state.isCommandPaletteOpen);
  const setCommandPaletteOpen = useNoteStore((state) => state.setCommandPaletteOpen);
  const notes = useNoteStore((state) => state.notes);
  const setActiveNoteId = useNoteStore((state) => state.setActiveNoteId);
  const setSelectedTag = useNoteStore((state) => state.setSelectedTag);
  const createNote = useNoteStore((state) => state.createNote);
  const toggleFocusMode = useNoteStore((state) => state.toggleFocusMode);
  const isFocusMode = useNoteStore((state) => state.isFocusMode);
  const setSettingsOpen = useNoteStore((state) => state.setSettingsOpen);
  const setExportModalOpen = useNoteStore((state) => state.setExportModalOpen);

  const { setTheme } = useThemeStore();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const allTags = Array.from(new Set(notes.flatMap((n) => n.tags)));

  const todayStr = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const actions = [
    {
      id: 'action-new-note',
      category: 'Actions',
      title: 'Create New Note',
      icon: Plus,
      run: () => createNote(),
    },
    {
      id: 'template-journal',
      category: 'Templates',
      title: 'New Note from Template: Daily Journal',
      icon: Calendar,
      run: () => {
        const body = `# Daily Journal — ${todayStr}\n\n#journal\n\n### Top Priorities\n- [ ] \n- [ ] \n- [ ] \n\n### Reflections & Notes\n\n`;
        void createNote('journal', `Daily Journal — ${todayStr}`, body);
        notify({
          title: 'AmNote Template',
          sender: 'Daily Journal',
          message: 'Created new daily journal note',
          type: 'success',
        });
      },
    },
    {
      id: 'template-meeting',
      category: 'Templates',
      title: 'New Note from Template: Meeting Notes',
      icon: FileText,
      run: () => {
        const body = `# Meeting Notes\n\n#work/meeting\n\n**Date:** ${todayStr}\n**Attendees:** \n\n### Agenda\n1. \n\n### Key Discussion Points\n\n### Action Items\n- [ ] \n`;
        void createNote('work/meeting', 'Meeting Notes', body);
        notify({
          title: 'AmNote Template',
          sender: 'Meeting Notes',
          message: 'Created new meeting notes template',
          type: 'success',
        });
      },
    },
    {
      id: 'template-tasks',
      category: 'Templates',
      title: 'New Note from Template: Sprint Tasks',
      icon: CheckSquare,
      run: () => {
        const body = `# Sprint Tasks\n\n#todo\n\n- [ ] Task 1\n- [ ] Task 2\n- [ ] Task 3\n`;
        void createNote('todo', 'Sprint Tasks', body);
        notify({
          title: 'AmNote Template',
          sender: 'Sprint Tasks',
          message: 'Created new sprint tasks checklist',
          type: 'success',
        });
      },
    },
    {
      id: 'action-toggle-zen',
      category: 'Actions',
      title: isFocusMode ? 'Exit Focus Mode' : 'Enter Focus / Zen Mode',
      icon: isFocusMode ? Minimize2 : Maximize2,
      run: () => toggleFocusMode(),
    },
    {
      id: 'action-export',
      category: 'Actions',
      title: 'Export Note / Vault',
      icon: Download,
      run: () => setExportModalOpen(true),
    },
    {
      id: 'action-settings',
      category: 'Actions',
      title: 'Open Settings & Typography',
      icon: Settings,
      run: () => setSettingsOpen(true),
    },
    ...(notes.some((n) => n.isTrashed)
      ? [
          {
            id: 'action-empty-trash',
            category: 'Actions',
            title: 'Empty Trash',
            icon: Trash2,
            run: () => promptEmptyTrashConfirmation(),
          },
        ]
      : []),
  ];

  const matchedActions = actions.filter(
    (a) =>
      !query.trim() ||
      a.title.toLowerCase().includes(query.toLowerCase()) ||
      a.category.toLowerCase().includes(query.toLowerCase())
  );

  const matchedNotes = notes
    .filter((n) => !n.isTrashed)
    .filter(
      (n) =>
        n.title.toLowerCase().includes(query.toLowerCase()) ||
        n.content.toLowerCase().includes(query.toLowerCase())
    )
    .slice(0, 5)
    .map((n) => ({
      id: n.id,
      category: 'Notes',
      title: n.title || 'Untitled',
      icon: FileText,
      run: () => setActiveNoteId(n.id),
    }));

  const matchedTags = allTags
    .filter((t) => t.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 4)
    .map((t) => ({
      id: `tag-${t}`,
      category: 'Tags',
      title: `#${t}`,
      icon: Hash,
      run: () => setSelectedTag(t),
    }));

  const matchedThemes = Object.values(THEMES)
    .filter((th) => th.name.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 4)
    .map((th) => ({
      id: `theme-${th.id}`,
      category: 'Themes',
      title: `Theme: ${th.name}`,
      icon: Palette,
      run: () => {
        setTheme(th.id as ThemeId);
        notify({
          title: 'AmNote Appearance',
          sender: 'Theme',
          message: `Switched theme to ${th.name}`,
          type: 'info',
        });
      },
    }));

  const allItems = [...matchedActions, ...matchedNotes, ...matchedTags, ...matchedThemes];

  useEffect(() => {
    if (isCommandPaletteOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isCommandPaletteOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isCommandPaletteOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % allItems.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + allItems.length) % allItems.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (allItems[selectedIndex]) {
          allItems[selectedIndex].run();
          setCommandPaletteOpen(false);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setCommandPaletteOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, allItems, selectedIndex, setCommandPaletteOpen]);

  if (!isCommandPaletteOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-100"
      onClick={() => setCommandPaletteOpen(false)}
    >
      <div
        className="w-full max-w-xl rounded-2xl shadow-2xl border overflow-hidden flex flex-col max-h-[70vh] animate-in zoom-in-95 duration-150"
        style={{
          backgroundColor: 'var(--card-notelist-bg)',
          borderColor: 'var(--color-border)',
          color: 'var(--text-notelist)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div
          className="flex items-center gap-3 px-4 py-3.5 border-b"
          style={{ borderColor: 'var(--color-divider)' }}
        >
          <Search size={18} className="opacity-60 text-accent" style={{ color: 'var(--color-accent)' }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, note title, #tag, or theme..."
            className="bg-transparent border-none outline-none text-sm w-full placeholder:opacity-40"
            style={{ color: 'var(--text-notelist)' }}
          />
          <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 font-mono opacity-60">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {allItems.length === 0 ? (
            <div className="p-8 text-center text-xs opacity-50">No matching commands or notes.</div>
          ) : (
            allItems.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    item.run();
                    setCommandPaletteOpen(false);
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-accent/15 text-accent font-semibold'
                      : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-80'
                  }`}
                  style={{
                    backgroundColor: isSelected ? 'var(--card-notelist-hover)' : undefined,
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon size={14} className={isSelected ? 'text-accent' : 'opacity-60'} />
                    <span>{item.title}</span>
                  </div>
                  <span className="text-[10px] opacity-40 uppercase tracking-wider font-mono">
                    {item.category}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div
          className="px-4 py-2 border-t text-[11px] flex items-center justify-between opacity-50 select-none"
          style={{ borderColor: 'var(--color-divider)' }}
        >
          <div className="flex items-center gap-2">
            <span>↑↓ Navigate</span>
            <span>•</span>
            <span>↵ Select</span>
          </div>
          <span>AmNote for Omarchy & macOS</span>
        </div>
      </div>
    </div>
  );
};
