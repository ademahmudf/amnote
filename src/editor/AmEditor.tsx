import React, { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { wrappingInputRule } from '@tiptap/core';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import Highlight from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Typography from '@tiptap/extension-typography';
import { ResizableImageExtension } from './extensions/ResizableImageExtension';

import { TagMark } from './extensions/TagExtension';
import { WikiLinkMark } from './extensions/WikiLinkExtension';
import { CalloutNode } from './extensions/CalloutExtension';
import { AutoCapitalizeTitle } from './extensions/AutoCapitalizeTitle';
import { HybridHeadingExtension } from './extensions/HybridHeadingExtension';
import { TypewriterMode } from './extensions/TypewriterMode';
import { BubbleToolbar } from './components/BubbleToolbar';
import { SlashCommandMenu } from './components/SlashCommandMenu';
import { WikiLinkMenu } from './components/WikiLinkMenu';
import { markdownToHtml, htmlToMarkdown } from './utils/markdownConverter';
import { useNoteStore } from '../store/useNoteStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { resolveTagIcon } from '../utils/tagIcons';
import {
  Pin,
  PinOff,
  Info,
  Share2,
  Trash2,
  RotateCcw,
  Clock,
  FileText,
  Lock,
  Unlock,
  KeyRound,
  ShieldCheck,
  AlertCircle,
  X,
  ZoomIn,
  ZoomOut,
  Download,
  Copy,
  Check,
} from 'lucide-react';

// Enhanced TaskItem with extra markdown input rules (- [ ] and * [ ])
const CustomTaskItem = TaskItem.extend({
  addInputRules() {
    return [
      ...(this.parent ? this.parent() : []),
      wrappingInputRule({
        find: /^\s*([-+*]\s+\[([ |x])?\])\s$/,
        type: this.type,
        getAttributes: (match) => ({
          checked: match[match.length - 1] === 'x',
        }),
      }),
    ];
  },
});

export const AmEditor: React.FC = () => {
  const activeNote = useNoteStore((state) => state.getActiveNote());
  const updateNoteContent = useNoteStore((state) => state.updateNoteContent);
  const togglePin = useNoteStore((state) => state.togglePin);
  const trashNote = useNoteStore((state) => state.trashNote);
  const restoreNote = useNoteStore((state) => state.restoreNote);
  const deletePermanently = useNoteStore((state) => state.deletePermanently);
  const toggleInfoDrawer = useNoteStore((state) => state.toggleInfoDrawer);
  const isInfoDrawerOpen = useNoteStore((state) => state.isInfoDrawerOpen);
  const setExportModalOpen = useNoteStore((state) => state.setExportModalOpen);
  const setPasswordModalOpen = useNoteStore((state) => state.setPasswordModalOpen);
  const unlockNote = useNoteStore((state) => state.unlockNote);
  const isNoteUnlocked = useNoteStore((state) => state.isNoteUnlocked);
  const relockNote = useNoteStore((state) => state.relockNote);
  const setSelectedTag = useNoteStore((state) => state.setSelectedTag);
  const setActiveNoteId = useNoteStore((state) => state.setActiveNoteId);
  const createNote = useNoteStore((state) => state.createNote);

  const {
    fontFamily,
    fontSize,
    editorWidth,
    autoSaveDelayMs,
    tagIcons,
    tagColors,
    typewriterMode,
    setTypewriterMode,
    wordGoal,
  } = useSettingsStore();

  const [isSlashOpen, setIsSlashOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [isWikiMenuOpen, setIsWikiMenuOpen] = useState(false);
  const [wikiQuery, setWikiQuery] = useState('');
  const [wikiPosition, setWikiPosition] = useState({ top: 0, left: 0 });
  const [showBubbleMenu, setShowBubbleMenu] = useState(false);
  const [bubblePosition, setBubblePosition] = useState({ top: 0, left: 0 });

  const isSlashOpenRef = useRef(isSlashOpen);
  isSlashOpenRef.current = isSlashOpen;

  const isWikiMenuOpenRef = useRef(isWikiMenuOpen);
  isWikiMenuOpenRef.current = isWikiMenuOpen;

  // Image Upload & Lightbox state
  const [lightboxImage, setLightboxImage] = useState<{ src: string; alt: string } | null>(null);
  const [lightboxZoom, setLightboxZoom] = useState(1);
  const [copiedImage, setCopiedImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Unlock screen state
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlockError, setUnlockError] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedNoteIdRef = useRef<string | null>(null);
  const isInternalUpdatingRef = useRef(false);

  const isUnlocked = activeNote ? isNoteUnlocked(activeNote.id) : true;

  const editor = useEditor({
    autofocus: 'end',
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      Placeholder.configure({
        placeholder: "Write your note here... Type '/' for commands, '-' for bullets, or '[]' for tasks",
      }),
      TaskList.configure({
        HTMLAttributes: {
          class: 'am-task-list bear-task-list',
        },
      }),
      CustomTaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: 'am-task-item bear-task-item',
        },
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Highlight.configure({ multicolor: true }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'underline text-accent hover:opacity-80 transition-opacity',
        },
      }),
      ResizableImageExtension,
      Typography,
      TagMark,
      WikiLinkMark,
      CalloutNode,
      AutoCapitalizeTitle,
      HybridHeadingExtension,
      TypewriterMode,
    ],
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[500px] leading-relaxed max-w-none text-editor',
      },
      handleKeyDown: (_view, event) => {
        if (isSlashOpenRef.current || isWikiMenuOpenRef.current) {
          if (['ArrowDown', 'ArrowUp', 'Enter', 'Tab', 'Escape'].includes(event.key)) {
            // Tells ProseMirror this key is handled by the open dropdown menu
            return true;
          }
        }
        return false;
      },
      handlePaste: (view, event) => {
        const files = event.clipboardData?.files;
        if (files && files.length > 0) {
          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.type.startsWith('image/')) {
              event.preventDefault();
              const reader = new FileReader();
              reader.onload = (e) => {
                const src = e.target?.result as string;
                if (src) {
                  const { schema } = view.state;
                  const node = schema.nodes.image.create({ src, alt: file.name || 'Pasted image' });
                  const tr = view.state.tr.replaceSelectionWith(node);
                  view.dispatch(tr);
                }
              };
              reader.readAsDataURL(file);
              return true;
            }
          }
        }
        return false;
      },
      handleDrop: (view, event) => {
        const files = event.dataTransfer?.files;
        if (files && files.length > 0) {
          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.type.startsWith('image/')) {
              event.preventDefault();
              const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
              const reader = new FileReader();
              reader.onload = (e) => {
                const src = e.target?.result as string;
                if (src) {
                  const { schema } = view.state;
                  const node = schema.nodes.image.create({ src, alt: file.name || 'Dropped image' });
                  const pos = coords ? coords.pos : view.state.selection.from;
                  const tr = view.state.tr.insert(pos, node);
                  view.dispatch(tr);
                }
              };
              reader.readAsDataURL(file);
              return true;
            }
          }
        }
        return false;
      },
      handleClick: (_view, _pos, event) => {
        const target = event.target as HTMLElement;

        // Handle Tag Pill clicks
        const tagPill = target.closest('[data-tag]') as HTMLElement | null;
        if (tagPill) {
          const tag = tagPill.getAttribute('data-tag');
          if (tag) {
            setSelectedTag(tag);
            return true;
          }
        }

        // Handle WikiLink clicks
        const wikiLink = target.closest('[data-wiki-target]') as HTMLElement | null;
        if (wikiLink) {
          const targetTitle = wikiLink.getAttribute('data-wiki-target');
          if (targetTitle) {
            const cleanTarget = targetTitle.trim();
            const currentNotes = useNoteStore.getState().notes;
            const matched = currentNotes.find(
              (n) => !n.isTrashed && n.title.toLowerCase().trim() === cleanTarget.toLowerCase()
            );
            if (matched) {
              setActiveNoteId(matched.id);
              return true;
            } else {
              // Target note doesn't exist yet -> create and navigate to it!
              createNote(undefined, cleanTarget).then((newId) => {
                if (newId) setActiveNoteId(newId);
              });
              return true;
            }
          }
        }

        return false;
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      const activeId = useNoteStore.getState().activeNoteId;
      if (isInternalUpdatingRef.current || !activeId) return;

      const html = currentEditor.getHTML();
      const markdown = htmlToMarkdown(html);
      const jsonStr = JSON.stringify(currentEditor.getJSON());

      // 1. INSTANT LIVE SYNC: Updates left panel NoteCard title, snippet preview & tags at 60fps
      updateNoteContent(activeId, markdown, jsonStr, false);

      // 2. DEBOUNCED DISK SAVE: Write to ~/Documents/AmNotes in background
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        const latest = useNoteStore.getState().notes.find((n) => n.id === activeId);
        if (latest) {
          useNoteStore.getState().updateNote(activeId, { content: markdown, contentJson: jsonStr });
        }
      }, autoSaveDelayMs);

      // Check slash commands
      const { selection } = currentEditor.state;
      const { $from } = selection;
      const textBefore = $from.parent.textBetween(0, $from.parentOffset, undefined, '\ufffc');

      // Check slash commands: /query
      const lastSlashIdx = textBefore.lastIndexOf('/');
      if (
        lastSlashIdx !== -1 &&
        (lastSlashIdx === 0 || /\s/.test(textBefore[lastSlashIdx - 1])) &&
        !textBefore.slice(lastSlashIdx).includes(' ')
      ) {
        const queryText = textBefore.slice(lastSlashIdx + 1);
        const coords = currentEditor.view.coordsAtPos(selection.from);
        setMenuPosition({ top: coords.bottom + 8, left: coords.left });
        setSlashQuery(queryText);
        setIsSlashOpen(true);
      } else {
        setIsSlashOpen(false);
      }

      // Check wiki link autocomplete: [[query
      const lastDoubleBracket = textBefore.lastIndexOf('[[');
      if (lastDoubleBracket !== -1 && !textBefore.slice(lastDoubleBracket).includes(']]')) {
        const queryText = textBefore.slice(lastDoubleBracket + 2);
        const coords = currentEditor.view.coordsAtPos(selection.from);
        setWikiPosition({ top: coords.bottom + 8, left: coords.left });
        setWikiQuery(queryText);
        setIsWikiMenuOpen(true);
      } else {
        setIsWikiMenuOpen(false);
      }
    },
    onSelectionUpdate: ({ editor: currentEditor }) => {
      const { from, to } = currentEditor.state.selection;
      if (from !== to) {
        const coords = currentEditor.view.coordsAtPos(from);
        setBubblePosition({
          top: Math.max(10, coords.top - 48),
          left: Math.max(20, coords.left),
        });
        setShowBubbleMenu(true);
      } else {
        setShowBubbleMenu(false);
      }
    },
  });

  // Load content ONLY when switching active note ID or unlocking note
  useEffect(() => {
    if (!editor || !activeNote) return;

    if (loadedNoteIdRef.current !== activeNote.id || isUnlocked) {
      loadedNoteIdRef.current = activeNote.id;
      isInternalUpdatingRef.current = true;
      const htmlContent = markdownToHtml(activeNote.content);
      editor.commands.setContent(htmlContent, { emitUpdate: false });
      isInternalUpdatingRef.current = false;

      // Auto-select title if new note or untitled, so user can immediately type to replace it
      setTimeout(() => {
        if (!editor.isDestroyed) {
          const firstNode = editor.state.doc.firstChild;
          if (firstNode && firstNode.type.name === 'heading' && firstNode.attrs.level === 1) {
            const titleText = firstNode.textContent.trim();
            if (titleText === 'New Note' || titleText === 'Untitled') {
              const start = 1;
              const end = 1 + firstNode.textContent.length;
              editor.chain().focus().setTextSelection({ from: start, to: end }).run();
            }
          }
        }
      }, 30);
    }
  }, [activeNote?.id, isUnlocked, editor]);

  // Focus password input when locked note is opened
  useEffect(() => {
    if (activeNote?.isLocked && !isUnlocked) {
      setUnlockPassword('');
      setUnlockError(false);
      setTimeout(() => passwordInputRef.current?.focus(), 50);
    }
  }, [activeNote?.id, isUnlocked, activeNote?.isLocked]);

  // Insert image file into editor
  const insertImageFromFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      if (src && editor) {
        editor.chain().focus().setImage({ src, alt: file.name || 'Image' }).run();
      }
    };
    reader.readAsDataURL(file);
  };

  const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        insertImageFromFile(files[i]);
      }
    }
    e.target.value = '';
  };

  // Listen for global trigger image upload event from slash menu or toolbar
  useEffect(() => {
    const handleTrigger = () => {
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    };

    const handleOpenLightbox = (e: Event) => {
      const customEvent = e as CustomEvent<{ src: string; alt: string }>;
      if (customEvent.detail) {
        setLightboxImage(customEvent.detail);
        setLightboxZoom(1);
      }
    };

    window.addEventListener('amnote:trigger-image-upload', handleTrigger);
    window.addEventListener('amnote:open-lightbox', handleOpenLightbox);
    return () => {
      window.removeEventListener('amnote:trigger-image-upload', handleTrigger);
      window.removeEventListener('amnote:open-lightbox', handleOpenLightbox);
    };
  }, []);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  if (!activeNote) {
    return (
      <div
        className="flex-1 flex flex-col items-center justify-center h-full p-8 select-none"
        style={{
          backgroundColor: 'var(--bg-editor)',
          color: 'var(--text-editor-muted)',
        }}
      >
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 bg-black/5 dark:bg-white/5 border border-border/40">
          <FileText size={32} className="opacity-40" />
        </div>
        <div className="text-lg font-semibold mb-1" style={{ color: 'var(--text-editor)' }}>
          No Note Selected
        </div>
        <div className="text-xs text-center max-w-xs opacity-60">
          Select a note from the list or press <kbd className="px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 font-mono text-[11px]">Ctrl+N</kbd> to create a new note.
        </div>
      </div>
    );
  }

  const handleUnlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await unlockNote(activeNote.id, unlockPassword);
    if (!success) {
      setUnlockError(true);
    } else {
      setUnlockError(false);
      setUnlockPassword('');
    }
  };

  const widthClasses = {
    narrow: 'max-w-xl',
    comfort: 'max-w-3xl',
    wide: 'max-w-4xl',
    full: 'max-w-full',
  }[editorWidth];

  const fontStyle = {
    fontFamily:
      fontFamily === 'clarika'
        ? '"Clarika", "Clarika Pro", "Outfit", "Plus Jakarta Sans", sans-serif'
        : fontFamily === 'bear-sans'
        ? '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        : fontFamily === 'serif'
        ? '"Newsreader", "Charter", Georgia, Cambria, "Times New Roman", Times, serif'
        : fontFamily === 'mono'
        ? '"JetBrains Mono", "Fira Code", monospace'
        : fontFamily === 'system'
        ? '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        : 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: `${fontSize}px`,
  };

  const words = activeNote.content.trim().match(/\S+/g)?.length || 0;
  const chars = activeNote.content.length;
  const readTime = Math.max(1, Math.ceil(words / 200));

  return (
    <div
      className="flex-1 flex flex-col h-full overflow-hidden relative"
      style={{
        backgroundColor: 'var(--bg-editor)',
        color: 'var(--text-editor)',
      }}
    >
      {/* Trashed Note Banner */}
      {activeNote.isTrashed && (
        <div className="bg-rose-500/15 border-b border-rose-500/30 px-6 py-2 flex items-center justify-between text-xs text-rose-400">
          <div className="flex items-center gap-2">
            <Trash2 size={14} />
            <span>This note is in the Trash.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => restoreNote(activeNote.id)}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-medium transition-colors"
            >
              <RotateCcw size={12} />
              Restore Note
            </button>
            <button
              onClick={() => deletePermanently(activeNote.id)}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white font-medium transition-colors"
            >
              Delete Permanently
            </button>
          </div>
        </div>
      )}

      {/* Editor Top Toolbar */}
      <div
        className="h-12 border-b flex items-center justify-between px-6 select-none shrink-0"
        style={{ borderColor: 'var(--color-divider)' }}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          {activeNote.tags.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              {activeNote.tags.map((tag) => {
                const customIcon = tagIcons[tag];
                const customColor = tagColors[tag];
                const IconComp = resolveTagIcon(tag, customIcon);

                return (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(tag)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition-all hover:scale-105"
                    style={{
                      backgroundColor: customColor ? `${customColor}20` : 'var(--color-tag-bg)',
                      color: customColor || 'var(--color-tag-text)',
                    }}
                  >
                    <IconComp size={10} />
                    <span>#{tag}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => togglePin(activeNote.id)}
            title={activeNote.isPinned ? 'Unpin note' : 'Pin note to top'}
            className={`p-1.5 rounded-lg text-xs transition-all ${
              activeNote.isPinned ? 'text-accent font-bold' : 'opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
            }`}
            style={{ color: activeNote.isPinned ? 'var(--color-accent)' : undefined }}
          >
            {activeNote.isPinned ? <Pin size={16} className="fill-current" /> : <PinOff size={16} />}
          </button>

          {/* Lock / Password Button */}
          <button
            type="button"
            onClick={() => {
              if (activeNote.isLocked && isUnlocked) {
                relockNote(activeNote.id);
              } else {
                setPasswordModalOpen(true, activeNote.id);
              }
            }}
            title={
              activeNote.isLocked
                ? isUnlocked
                  ? 'Note is unlocked. Click to re-lock'
                  : 'Note is locked'
                : 'Protect note with password'
            }
            className={`p-1.5 rounded-lg text-xs transition-all ${
              activeNote.isLocked
                ? isUnlocked
                  ? 'text-emerald-400 hover:bg-emerald-500/10'
                  : 'text-amber-400 hover:bg-amber-500/10'
                : 'opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            {activeNote.isLocked ? (
              isUnlocked ? <Unlock size={16} /> : <Lock size={16} />
            ) : (
              <Lock size={16} />
            )}
          </button>

          <button
            type="button"
            onClick={() => setExportModalOpen(true)}
            title="Export note (Markdown, HTML, PDF)"
            className="p-1.5 rounded-lg opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-all text-xs"
          >
            <Share2 size={16} />
          </button>

          <button
            type="button"
            onClick={() => trashNote(activeNote.id)}
            title="Move to Trash"
            className="p-1.5 rounded-lg opacity-60 hover:opacity-100 hover:bg-rose-500/10 hover:text-rose-400 transition-all text-xs"
          >
            <Trash2 size={16} />
          </button>

          <div className="w-px h-4 mx-1" style={{ backgroundColor: 'var(--color-divider)' }} />

          <button
            type="button"
            onClick={toggleInfoDrawer}
            title="Note Info & Table of Contents (Ctrl+Shift+I)"
            className={`p-1.5 rounded-lg transition-all text-xs ${
              isInfoDrawerOpen ? 'bg-accent text-white' : 'opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
            }`}
            style={{
              backgroundColor: isInfoDrawerOpen ? 'var(--color-accent)' : undefined,
              color: isInfoDrawerOpen ? 'var(--color-accent-text)' : undefined,
            }}
          >
            <Info size={16} />
          </button>
        </div>
      </div>

      {/* Main Canvas Scroll Area OR Lock Overlay Screen */}
      {activeNote.isLocked && !isUnlocked ? (
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

            <form onSubmit={handleUnlockSubmit} className="w-full space-y-3">
              {activeNote.lockHash && (
                <div className="relative">
                  <KeyRound
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40"
                  />
                  <input
                    ref={passwordInputRef}
                    type="password"
                    value={unlockPassword}
                    onChange={(e) => {
                      setUnlockPassword(e.target.value);
                      setUnlockError(false);
                    }}
                    placeholder="Enter password..."
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border bg-black/10 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-accent"
                    style={{ borderColor: 'var(--color-border)' }}
                  />
                </div>
              )}

              {unlockError && (
                <div className="flex items-center justify-center gap-1.5 text-xs text-rose-400">
                  <AlertCircle size={14} />
                  <span>Incorrect password. Please try again.</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
                style={{ backgroundColor: 'var(--color-accent)' }}
              >
                <ShieldCheck size={16} />
                <span>Unlock Note</span>
              </button>

              <button
                type="button"
                onClick={() => setPasswordModalOpen(true, activeNote.id)}
                className="text-[11px] opacity-50 hover:opacity-100 transition-opacity pt-1 underline underline-offset-2"
              >
                Lock Settings
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div
          className="flex-1 overflow-y-auto px-8 py-8 flex justify-center cursor-text scroll-smooth"
          style={{ scrollPaddingBottom: '30vh' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              editor?.commands.focus('end');
            }
          }}
        >
          <div className={`w-full ${widthClasses} pb-[50vh] transition-all`} style={fontStyle}>
            <EditorContent editor={editor} />
          </div>
        </div>
      )}

      {/* Floating Bubble Toolbar on selection */}
      {showBubbleMenu && isUnlocked && (
        <div
          className="fixed z-40"
          style={{ top: `${bubblePosition.top}px`, left: `${bubblePosition.left}px` }}
        >
          <BubbleToolbar editor={editor} />
        </div>
      )}

      {/* Slash Command Popover */}
      {editor && isUnlocked && (
        <div
          className="fixed z-50"
          style={{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px` }}
        >
          <SlashCommandMenu
            editor={editor}
            isOpen={isSlashOpen}
            onClose={() => setIsSlashOpen(false)}
            query={slashQuery}
          />
        </div>
      )}

      {/* Wiki Link Note Autocomplete Popover */}
      {editor && isUnlocked && isWikiMenuOpen && (
        <WikiLinkMenu
          editor={editor}
          isOpen={isWikiMenuOpen}
          onClose={() => setIsWikiMenuOpen(false)}
          query={wikiQuery}
          position={wikiPosition}
        />
      )}

      {/* Bottom Status & Info Bar */}
      <div
        className="h-8 border-t flex items-center justify-between px-6 text-[11px] select-none shrink-0"
        style={{
          borderColor: 'var(--color-divider)',
          color: 'var(--text-editor-muted)',
        }}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <FileText size={12} className="opacity-60" />
            <span>{words} words</span>
            <span className="opacity-40">•</span>
            <span>{chars} chars</span>
          </div>
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
          {/* Typewriter Mode Button */}
          <button
            type="button"
            onClick={() => setTypewriterMode(!typewriterMode)}
            title="Toggle Typewriter Centering Mode (Ctrl+Shift+T)"
            className={`px-1.5 py-0.5 rounded transition-all flex items-center gap-1 text-[10px] font-medium ${
              typewriterMode
                ? 'bg-accent text-white'
                : 'opacity-50 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
            }`}
            style={{
              backgroundColor: typewriterMode ? 'var(--color-accent)' : undefined,
              color: typewriterMode ? 'var(--color-accent-text)' : undefined,
            }}
          >
            <span>⌖ Typewriter</span>
          </button>

          {activeNote.isLocked && (
            <div
              className={`flex items-center gap-1 ${
                isUnlocked ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {isUnlocked ? <Unlock size={12} /> : <Lock size={12} />}
              <span>{isUnlocked ? 'Unlocked' : 'Encrypted'}</span>
            </div>
          )}
          <span>Saved</span>
        </div>
      </div>

      {/* Hidden File Input for Native Image Uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleImageFileSelect}
      />

      {/* Fullscreen Image Lightbox Preview Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150 select-none"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-w-5xl max-h-[90vh] flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Lightbox Controls */}
            <div className="absolute -top-12 right-0 flex items-center gap-2">
              {/* Zoom Out */}
              <button
                type="button"
                onClick={() => setLightboxZoom((prev) => Math.max(0.5, prev - 0.25))}
                title="Zoom Out"
                className="p-2 rounded-xl bg-black/60 hover:bg-black/80 text-white border border-white/10 backdrop-blur-md transition-all active:scale-95"
              >
                <ZoomOut size={16} />
              </button>

              {/* Reset Zoom / Current Scale */}
              <button
                type="button"
                onClick={() => setLightboxZoom(1)}
                title="Reset Zoom"
                className="px-2.5 py-1 rounded-xl bg-black/60 hover:bg-black/80 text-white border border-white/10 backdrop-blur-md text-xs font-mono transition-all"
              >
                {Math.round(lightboxZoom * 100)}%
              </button>

              {/* Zoom In */}
              <button
                type="button"
                onClick={() => setLightboxZoom((prev) => Math.min(3, prev + 0.25))}
                title="Zoom In"
                className="p-2 rounded-xl bg-black/60 hover:bg-black/80 text-white border border-white/10 backdrop-blur-md transition-all active:scale-95"
              >
                <ZoomIn size={16} />
              </button>

              {/* Copy Image / Link */}
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(lightboxImage.src);
                  setCopiedImage(true);
                  setTimeout(() => setCopiedImage(false), 1500);
                }}
                title="Copy Image Data / URL"
                className="p-2 rounded-xl bg-black/60 hover:bg-black/80 text-white border border-white/10 backdrop-blur-md transition-all active:scale-95"
              >
                {copiedImage ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
              </button>

              {/* Download Image */}
              <a
                href={lightboxImage.src}
                download={lightboxImage.alt || 'amnote-image'}
                title="Download Image"
                className="p-2 rounded-xl bg-black/60 hover:bg-black/80 text-white border border-white/10 backdrop-blur-md transition-all active:scale-95 flex items-center justify-center"
              >
                <Download size={16} />
              </a>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                title="Close (Esc)"
                className="p-2 rounded-xl bg-black/60 hover:bg-rose-600 text-white border border-white/10 backdrop-blur-md transition-all active:scale-95"
              >
                <X size={16} />
              </button>
            </div>

            {/* Lightbox Image Element */}
            <div className="overflow-auto max-h-[85vh] max-w-[90vw] flex items-center justify-center p-2">
              <img
                src={lightboxImage.src}
                alt={lightboxImage.alt}
                style={{ transform: `scale(${lightboxZoom})`, transformOrigin: 'center' }}
                className="rounded-2xl max-h-[80vh] max-w-full object-contain shadow-2xl transition-transform duration-150 border border-white/10"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
