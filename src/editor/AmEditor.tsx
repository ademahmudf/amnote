import React, { useEffect, useRef } from 'react';
import type { Editor } from '@tiptap/react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { wrappingInputRule } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';
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
import { FocusModeExtension } from './extensions/FocusModeExtension';
import { AnnotationExtension } from './extensions/AnnotationExtension';
import { BubbleToolbar } from './components/BubbleToolbar';
import { SlashCommandMenu } from './components/SlashCommandMenu';
import { WikiLinkMenu } from './components/WikiLinkMenu';
import { markdownToHtml } from './utils/markdownConverter';
import { serializeProseMirrorToMarkdown } from './utils/proseMirrorMarkdownSerializer';
import { useNoteStore } from '../store/useNoteStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { getFontFamilyCss } from '../domain/fontFamilies';
import { clearTagIconSvgCache } from '../utils/tagIcons';
import { useEditorContentLifecycle } from './hooks/useEditorContentLifecycle';
import { useEditorLockFocus } from './hooks/useEditorLockFocus';
import { useEditorMenuState } from './hooks/useEditorMenuState';
import { useImageAttachments } from './hooks/useImageAttachments';
import { AnnotatedText } from '../components/ui/AnnotatedText';
import { notify } from '../store/useNotificationStore';
import {
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
  Plus,
  Calendar,
  CheckSquare,
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
  const restoreNote = useNoteStore((state) => state.restoreNote);
  const deletePermanently = useNoteStore((state) => state.deletePermanently);
  const setPasswordModalOpen = useNoteStore((state) => state.setPasswordModalOpen);
  const unlockNote = useNoteStore((state) => state.unlockNote);
  const isNoteUnlocked = useNoteStore((state) => state.isNoteUnlocked);
  const setSelectedTag = useNoteStore((state) => state.setSelectedTag);
  const setActiveNoteId = useNoteStore((state) => state.setActiveNoteId);
  const createNote = useNoteStore((state) => state.createNote);
  const editorReloadToken = useNoteStore((state) => state.editorReloadToken);
  const toggleInfoDrawer = useNoteStore((state) => state.toggleInfoDrawer);

  const {
    fontFamily,
    fontSize,
    lineHeight,
    editorWidth,
    paragraphSpacing,
    paragraphIndent,
    autoSaveDelayMs,
    tagIcons,
    tagColors,
    typewriterMode,
    setTypewriterMode,
    focusMode,
    setFocusMode,
    focusModeType,
    setFocusModeType,
    wordGoal,
  } = useSettingsStore();

  const editorRef = useRef<Editor | null>(null);
  const {
    isSlashOpen,
    setIsSlashOpen,
    slashQuery,
    setSlashQuery,
    menuPosition,
    setMenuPosition,
    isWikiMenuOpen,
    setIsWikiMenuOpen,
    wikiQuery,
    setWikiQuery,
    wikiPosition,
    setWikiPosition,
    showBubbleMenu,
    setShowBubbleMenu,
    bubblePosition,
    setBubblePosition,
    isSlashOpenRef,
    isWikiMenuOpenRef,
  } = useEditorMenuState();

  const {
    lightboxImage,
    setLightboxImage,
    lightboxZoom,
    setLightboxZoom,
    copiedImage,
    setCopiedImage,
    attachmentError,
    fileInputRef,
    uploadAndInsert,
    insertImageFromFile,
  } = useImageAttachments({ editorRef });

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isUnlocked = activeNote ? isNoteUnlocked(activeNote.id) : true;
  const {
    unlockPassword,
    setUnlockPassword,
    unlockError,
    setUnlockError,
    passwordInputRef,
  } = useEditorLockFocus(activeNote, isUnlocked);
  const initialHtml = activeNote ? markdownToHtml(activeNote.content) : '<p></p>';

  const editor = useEditor({
    autofocus: 'end',
    content: initialHtml,
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
      FocusModeExtension,
      AnnotationExtension,
    ],
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[500px] max-w-none text-editor',
      },
      handleTripleClick: (view, pos) => {
        const { doc } = view.state;
        const $pos = doc.resolve(pos);
        for (let d = $pos.depth; d >= 0; d--) {
          const node = $pos.node(d);
          if (node.isTextblock) {
            const start = $pos.start(d);
            const end = $pos.end(d);
            if (start <= end) {
              const tr = view.state.tr.setSelection(TextSelection.create(doc, start, end));
              view.dispatch(tr);
              return true;
            }
          }
        }
        return false;
      },
      handleDOMEvents: {
        mouseup: (view) => {
          const { state } = view;
          const { selection } = state;
          if (selection instanceof TextSelection && !selection.empty) {
            const { $from, $to } = selection;
            // If selection dragged past the end of a block, it captures parentOffset === 0 in the next block,
            // which causes browsers to draw a full-width trailing highlight box to the right screen edge.
            // Clamping back to the previous block end fixes this seamlessly.
            if ($to.parentOffset === 0 && $to.pos > $from.pos) {
              const clampedTo = $to.pos - 1;
              if (clampedTo >= $from.pos) {
                view.dispatch(state.tr.setSelection(TextSelection.create(state.doc, $from.pos, clampedTo)));
              }
            }
          }
          return false;
        },
      },
      handleKeyDown: (_view, event) => {
        if (isSlashOpenRef.current || isWikiMenuOpenRef.current) {
          if (['ArrowDown', 'ArrowUp', 'Enter', 'Tab', 'Escape'].includes(event.key)) {
            // Tells ProseMirror this key is handled by the open dropdown menu
            return true;
          }
        }
        if (event.key === 'Escape' && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
          _view.dom.blur();
          const activeCard = document.querySelector('[data-note-id][tabindex="0"]') as HTMLElement;
          if (activeCard) {
            activeCard.focus();
          } else {
            const listContainer = document.querySelector('[tabindex="0"]') as HTMLElement;
            listContainer?.focus();
          }
          return true;
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
              void uploadAndInsert(file, view);
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
              void uploadAndInsert(file, view, coords ? { left: event.clientX, top: event.clientY } : undefined);
              return true;
            }
          }
        }
        return false;
      },
      handleClick: (_view, _pos, event) => {
        const target = event.target as HTMLElement;

        // Handle Tag Pill clicks: clicking the icon or Ctrl/Cmd-clicking filters by tag
        const tagPill = target.closest('[data-tag]') as HTMLElement | null;
        if (tagPill) {
          const isIcon = Boolean(target.closest('.am-tag-icon-widget') || target.closest('.am-tag-prefix'));
          const isModifier = event.ctrlKey || event.metaKey;
          if (isIcon || isModifier) {
            const tag = tagPill.getAttribute('data-tag');
            if (tag) {
              setSelectedTag(tag);
              return true;
            }
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
      const activeId = activeNote?.id || useNoteStore.getState().activeNoteId;
      if (isInternalUpdatingRef.current || !activeId) return;

      const markdown = serializeProseMirrorToMarkdown(currentEditor.state.doc);
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
          left: Math.max(20, Math.min(window.innerWidth - 650, coords.left)),
        });
        setShowBubbleMenu(true);
      } else {
        setShowBubbleMenu(false);
      }
    },
  });

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      clearTagIconSvgCache();
      editor.view.dispatch(editor.state.tr.setMeta('tagStylesChanged', true));
    }
  }, [editor, tagIcons, tagColors]);

  const { isInternalUpdatingRef } = useEditorContentLifecycle({
    editor,
    activeNote,
    isUnlocked,
    editorReloadToken,
  });

  const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        insertImageFromFile(files[i]);
      }
    }
    e.target.value = '';
  };

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  if (!activeNote) {
    const todayStr = new Date().toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

    const handleCreateTemplate = (type: 'blank' | 'journal' | 'meeting' | 'tasks') => {
      if (type === 'blank') {
        void createNote();
      } else if (type === 'journal') {
        const body = `# Daily Journal — ${todayStr}\n\n#journal\n\n### Top Priorities\n- [ ] \n- [ ] \n- [ ] \n\n### Reflections & Notes\n\n`;
        void createNote('journal', `Daily Journal — ${todayStr}`, body);
      } else if (type === 'meeting') {
        const body = `# Meeting Notes\n\n#work/meeting\n\n**Date:** ${todayStr}\n**Attendees:** \n\n### Agenda\n1. \n\n### Key Discussion Points\n\n### Action Items\n- [ ] \n`;
        void createNote('work/meeting', 'Meeting Notes', body);
      } else if (type === 'tasks') {
        const body = `# Sprint Tasks\n\n#todo\n\n- [ ] Task 1\n- [ ] Task 2\n- [ ] Task 3\n`;
        void createNote('todo', 'Sprint Tasks', body);
      }
    };

    return (
      <div
        className="flex-1 flex flex-col items-center justify-center h-full p-8 select-none animate-in fade-in duration-200"
        style={{
          backgroundColor: 'var(--bg-editor)',
          color: 'var(--text-editor-muted)',
        }}
      >
        <div className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4 bg-black/5 dark:bg-white/5 border border-border/40 shadow-inner">
          <FileText size={30} className="opacity-40" />
        </div>

        <h2 className="text-base font-bold mb-1" style={{ color: 'var(--text-editor)' }}>
          No Note Selected
        </h2>
        <p className="text-xs text-center max-w-xs opacity-60 mb-6">
          Select a note from the sidebar or{' '}
          <AnnotatedText variant="wavy" className="font-semibold" color="text-accent">
            pick a template
          </AnnotatedText>{' '}
          below to start writing.
        </p>

        <div className="flex flex-col gap-3 w-full max-w-sm">
          <button
            type="button"
            onClick={() => handleCreateTemplate('blank')}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl text-xs font-semibold text-white shadow-md transition-transform hover:scale-[1.01] active:scale-[0.98]"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            <Plus size={15} />
            <span>New Blank Note (Ctrl+N)</span>
          </button>

          <div className="pt-2">
            <div className="text-[10px] font-semibold uppercase tracking-wider opacity-40 mb-2 px-1 text-center">
              Or Start With a Template
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { type: 'journal' as const, label: 'Journal', desc: 'Daily log', icon: Calendar },
                { type: 'meeting' as const, label: 'Meeting', desc: 'Agenda & tasks', icon: Clock },
                { type: 'tasks' as const, label: 'Tasks', desc: 'Checklist', icon: CheckSquare },
              ].map((tmpl) => (
                <button
                  key={tmpl.type}
                  type="button"
                  onClick={() => handleCreateTemplate(tmpl.type)}
                  className="flex flex-col items-center p-3 rounded-xl border bg-black/5 dark:bg-white/5 hover:bg-accent/10 hover:border-accent/40 transition-all text-center group"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <tmpl.icon size={16} className="mb-1.5 opacity-60 group-hover:opacity-100 text-accent transition-colors" style={{ color: 'var(--color-accent)' }} />
                  <span className="text-xs font-semibold" style={{ color: 'var(--text-editor)' }}>{tmpl.label}</span>
                  <span className="text-[10px] opacity-50 mt-0.5">{tmpl.desc}</span>
                </button>
              ))}
            </div>
          </div>
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

  const numericLineHeight =
    typeof lineHeight === 'number'
      ? lineHeight === 1.65 ? 1.35 : lineHeight
      : lineHeight === 'normal'
      ? 1.35
      : lineHeight === 'loose'
      ? 1.65
      : 1.35;

  const fontStyle: React.CSSProperties = {
    fontFamily: getFontFamilyCss(fontFamily),
    fontSize: `${fontSize}px`,
    lineHeight: numericLineHeight,
    ['--line-height' as unknown as string]: `${numericLineHeight}`,
    ['--paragraph-spacing' as unknown as string]: `${paragraphSpacing ?? 8}px`,
    ['--paragraph-indent' as unknown as string]: `${paragraphIndent ?? 0}px`,
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
          <div
            className={`w-full ${widthClasses} pb-[50vh] transition-all ${
              focusMode ? `am-focus-mode am-focus-mode-${focusModeType}` : ''
            }`}
            style={fontStyle}
          >
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
          <button
            type="button"
            onClick={toggleInfoDrawer}
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
            onClick={() => {
              if (!focusMode) {
                setFocusMode(true);
                setFocusModeType('sentence');
              } else if (focusModeType === 'sentence') {
                setFocusModeType('paragraph');
              } else {
                setFocusMode(false);
                setFocusModeType('sentence');
              }
            }}
            title="Click to cycle: Sentence Focus → Paragraph Focus → Off (Ctrl+Shift+F)"
            className={`px-1.5 py-0.5 rounded transition-all flex items-center gap-1 text-[10px] font-medium ${
              focusMode
                ? 'bg-accent text-white'
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

      {attachmentError && (
        <div role="alert" className="px-4 py-1.5 text-xs text-amber-600 bg-amber-500/10 border-t border-amber-500/20">
          {attachmentError}
        </div>
      )}

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
                  notify({
                    title: 'AmNote Media',
                    sender: 'Clipboard',
                    message: 'Image URL copied to clipboard',
                    type: 'success',
                  });
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
