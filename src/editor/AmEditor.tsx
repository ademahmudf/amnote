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
import {
  TaskDueExtension,
  type TaskDueBadgeClickInfo,
} from './extensions/TaskDueExtension';
import { EditorLightbox } from './components/EditorLightbox';
import { EditorLockScreen } from './components/EditorLockScreen';
import { EditorStatusBar } from './components/EditorStatusBar';
import { EditorSuggestions } from './components/EditorSuggestions';
import { markdownToHtml } from './utils/markdownCodec';
import { serializeProseMirrorToMarkdown } from './utils/proseMirrorMarkdownSerializer';
import { calculateNoteMetrics } from './utils/editorTriggers';
import { useNoteStore } from '../store/useNoteStore';
import { useUIStore } from '../store/useUIStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { getFontFamilyCss } from '../domain/fontFamilies';
import { clearTagIconSvgCache } from '../utils/tagIcons';
import { useEditorContentLifecycle } from './hooks/useEditorContentLifecycle';
import { useEditorLockFocus } from './hooks/useEditorLockFocus';
import { useEditorSuggestions } from './hooks/useEditorSuggestions';
import { useImageAttachments } from './hooks/useImageAttachments';
import { AnnotatedText } from '../components/ui/AnnotatedText';
import { promptDeletePermanentlyConfirmation } from '../utils/trashConfirmation';
import {
  Trash2,
  RotateCcw,
  Clock,
  FileText,
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
  const unlockNote = useNoteStore((state) => state.unlockNote);
  const isNoteUnlocked = useNoteStore((state) => state.isNoteUnlocked);
  const setSelectedTag = useNoteStore((state) => state.setSelectedTag);
  const setActiveNoteId = useNoteStore((state) => state.setActiveNoteId);
  const createNote = useNoteStore((state) => state.createNote);
  const editorReloadToken = useNoteStore((state) => state.editorReloadToken);

  const setPasswordModalOpen = useUIStore((state) => state.setPasswordModalOpen);
  const toggleInfoDrawer = useUIStore((state) => state.toggleInfoDrawer);

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
  const suggestions = useEditorSuggestions();
  const suggestionsRef = useRef(suggestions);
  useEffect(() => {
    suggestionsRef.current = suggestions;
  }, [suggestions]);

  const {
    lightboxImage,
    setLightboxImage,
    lightboxZoom,
    setLightboxZoom,
    copiedImage,
    setCopiedImage,
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
      TaskDueExtension.configure({
        onBadgeClick: (info: TaskDueBadgeClickInfo) => {
          suggestionsRef.current.openTaskDueDatePicker(info);
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
          class: 'underline text-(--color-accent) hover:opacity-80 transition-opacity',
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
        if (suggestionsRef.current.isNavigatingMenu()) {
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

      // Check suggestions (slash commands and wiki links)
      suggestionsRef.current.handleEditorUpdate(currentEditor);
    },
    onSelectionUpdate: ({ editor: currentEditor }) => {
      suggestionsRef.current.handleSelectionUpdate(currentEditor);
    },
  });

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  useEffect(() => {
    suggestions.closeDatePicker();
  }, [activeNote?.id, editorReloadToken, suggestions]);

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
          <AnnotatedText variant="wavy" className="font-semibold" color="text-(--color-accent)">
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
                  className="flex flex-col items-center p-3 rounded-xl border bg-black/5 dark:bg-white/5 hover:bg-(--color-accent)/10 hover:border-(--color-accent)/40 transition-all text-center group"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <tmpl.icon size={16} className="mb-1.5 opacity-60 group-hover:opacity-100 text-(--color-accent) transition-colors" style={{ color: 'var(--color-accent)' }} />
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
    ['--editor-font-size' as unknown as string]: `${fontSize}px`,
    lineHeight: numericLineHeight,
    ['--line-height' as unknown as string]: `${numericLineHeight}`,
    ['--paragraph-spacing' as unknown as string]: `${paragraphSpacing ?? 8}px`,
    ['--paragraph-indent' as unknown as string]: `${paragraphIndent ?? 0}px`,
  };

  const metrics = calculateNoteMetrics(activeNote.content);

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
              onClick={() => promptDeletePermanentlyConfirmation(activeNote)}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white font-medium transition-colors cursor-pointer"
            >
              Delete Permanently
            </button>
          </div>
        </div>
      )}



      {/* Main Canvas Scroll Area OR Lock Overlay Screen */}
      {activeNote.isLocked && !isUnlocked ? (
        <EditorLockScreen
          hasLockHash={Boolean(activeNote.lockHash)}
          password={unlockPassword}
          onPasswordChange={(pwd) => {
            setUnlockPassword(pwd);
            setUnlockError(false);
          }}
          onSubmit={handleUnlockSubmit}
          error={unlockError}
          passwordInputRef={passwordInputRef}
          onOpenLockSettings={() => setPasswordModalOpen(true, activeNote.id)}
        />
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

      {/* Editor floating popovers and menus */}
      <EditorSuggestions
        editor={editor}
        isUnlocked={isUnlocked}
        suggestions={suggestions}
      />

      {/* Bottom Status & Info Bar */}
      <EditorStatusBar
        metrics={metrics}
        wordGoal={wordGoal}
        focusMode={focusMode}
        focusModeType={focusModeType}
        onCycleFocusMode={() => {
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
        typewriterMode={typewriterMode}
        onToggleTypewriterMode={() => setTypewriterMode(!typewriterMode)}
        isLocked={Boolean(activeNote.isLocked)}
        isUnlocked={isUnlocked}
        onToggleInfoDrawer={toggleInfoDrawer}
      />

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
      <EditorLightbox
        image={lightboxImage}
        zoom={lightboxZoom}
        onZoomChange={setLightboxZoom}
        onClose={() => setLightboxImage(null)}
        copied={copiedImage}
        onSetCopied={setCopiedImage}
      />
    </div>
  );
};
