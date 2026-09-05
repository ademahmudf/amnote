import React, { useState, useEffect, useRef } from 'react';
import { Editor } from '@tiptap/react';
import {
  Heading1,
  Heading2,
  Heading3,
  CheckSquare,
  List,
  ListOrdered,
  Quote,
  Code,
  Table as TableIcon,
  Minus,
  Info,
  Lightbulb,
  AlertTriangle,
  Highlighter,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  FileText,
  Image as ImageIcon,
  Calendar,
} from 'lucide-react';
import { useSettingsStore } from '../../store/useSettingsStore';
import { markdownToHtml } from '../utils/markdownConverter';
import type { EditorDatePickerMode } from './EditorDatePicker';

interface SlashCommandMenuProps {
  editor: Editor;
  isOpen: boolean;
  onClose: () => void;
  query: string;
  onRequestDatePicker: (mode: EditorDatePickerMode) => void;
}

interface CommandItem {
  title: string;
  description: string;
  category: 'Structure' | 'Lists & Tasks' | 'Formatting' | 'Cards & Blocks' | 'Templates' | 'Annotations';
  keywords?: string[];
  icon: React.ComponentType<{ size?: number; className?: string }>;
  colorIndicator?: string;
  command: (
    editor: Editor,
    requestDatePicker: (mode: EditorDatePickerMode) => void
  ) => void;
}

export const SlashCommandMenu: React.FC<SlashCommandMenuProps> = ({
  editor,
  isOpen,
  onClose,
  query,
  onRequestDatePicker,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const selectedButtonRef = useRef<HTMLButtonElement>(null);
  const defaultHighlightColor = useSettingsStore((state) => state.defaultHighlightColor);

  const items: CommandItem[] = [
    // 1. Structure & Headings
    {
      title: 'Heading 1',
      description: 'Large title heading (#)',
      category: 'Structure',
      keywords: ['heading', 'h1', 'title', 'large'],
      icon: Heading1,
      command: (ed) => ed.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      title: 'Heading 2',
      description: 'Medium section subtitle (##)',
      category: 'Structure',
      keywords: ['heading', 'h2', 'subtitle', 'medium'],
      icon: Heading2,
      command: (ed) => ed.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      title: 'Heading 3',
      description: 'Small subsection header (###)',
      category: 'Structure',
      keywords: ['heading', 'h3', 'section', 'small'],
      icon: Heading3,
      command: (ed) => ed.chain().focus().toggleHeading({ level: 3 }).run(),
    },

    // 2. Lists & Tasks
    {
      title: 'Todo Task List',
      description: 'Interactive checklist box ([] or - [ ])',
      category: 'Lists & Tasks',
      keywords: ['todo', 'task', 'check', 'box', 'list', 'checklist'],
      icon: CheckSquare,
      command: (ed) => ed.chain().focus().toggleTaskList().run(),
    },
    {
      title: 'Due Date',
      description: 'Add @due(YYYY-MM-DD) to a task',
      category: 'Lists & Tasks',
      keywords: ['due', 'date', 'deadline', 'calendar', 'task'],
      icon: Calendar,
      command: (_ed, requestDatePicker) => requestDatePicker('task-due'),
    },
    {
      title: 'Bullet List',
      description: 'Unordered bulleted list (-)',
      category: 'Lists & Tasks',
      keywords: ['bullet', 'list', 'ul', 'unordered'],
      icon: List,
      command: (ed) => ed.chain().focus().toggleBulletList().run(),
    },
    {
      title: 'Numbered List',
      description: 'Ordered sequence list (1.)',
      category: 'Lists & Tasks',
      keywords: ['numbered', 'ordered', 'list', 'ol', '1', 'numbers'],
      icon: ListOrdered,
      command: (ed) => ed.chain().focus().toggleOrderedList().run(),
    },

    // 3. Formatting & Style
    {
      title: 'Highlight Text',
      description: 'Highlight text (==text==)',
      category: 'Formatting',
      keywords: ['highlight', 'hl', 'mark', 'color', 'style'],
      icon: Highlighter,
      colorIndicator: defaultHighlightColor,
      command: (ed) => ed.chain().focus().toggleHighlight({ color: defaultHighlightColor }).run(),
    },
    {
      title: 'Bold Text',
      description: 'Bold text (**text**)',
      category: 'Formatting',
      keywords: ['bold', 'strong', 'b', 'style', 'format'],
      icon: Bold,
      command: (ed) => ed.chain().focus().toggleBold().run(),
    },
    {
      title: 'Italic Text',
      description: 'Italic text (*text*)',
      category: 'Formatting',
      keywords: ['italic', 'em', 'i', 'emphasis', 'style', 'format'],
      icon: Italic,
      command: (ed) => ed.chain().focus().toggleItalic().run(),
    },
    {
      title: 'Underline Text',
      description: 'Underline text',
      category: 'Formatting',
      keywords: ['underline', 'u', 'style', 'format'],
      icon: UnderlineIcon,
      command: (ed) => ed.chain().focus().toggleUnderline().run(),
    },
    {
      title: 'Strikethrough',
      description: 'Cross out text (~~text~~)',
      category: 'Formatting',
      keywords: ['strike', 'strikethrough', 'del', 'style', 'format'],
      icon: Strikethrough,
      command: (ed) => ed.chain().focus().toggleStrike().run(),
    },
    {
      title: 'Inline Code',
      description: 'Inline monospace code snippet (`code`)',
      category: 'Formatting',
      keywords: ['code', 'inline', 'monospace', 'mono', 'style'],
      icon: Code,
      command: (ed) => ed.chain().focus().toggleCode().run(),
    },

    // 4. Cards & Blocks
    {
      title: 'Insert Image',
      description: 'Upload file or insert image from URL / paste',
      category: 'Cards & Blocks',
      keywords: ['image', 'photo', 'picture', 'img', 'upload', 'media'],
      icon: ImageIcon,
      command: () => {
        // Dispatch custom event for native file picker or prompt URL
        const event = new CustomEvent('amnote:trigger-image-upload');
        window.dispatchEvent(event);
      },
    },
    {
      title: 'Link to Note',
      description: 'Wiki-style cross link [[Note Title]]',
      category: 'Cards & Blocks',
      keywords: ['link', 'wiki', 'note', 'page', 'reference'],
      icon: FileText,
      command: (ed) => ed.chain().focus().insertContent('[[').run(),
    },
    {
      title: 'Code Block',
      description: 'Syntax-highlighted code block (```)',
      category: 'Cards & Blocks',
      keywords: ['code', 'block', 'pre', 'snippet', 'syntax'],
      icon: Code,
      command: (ed) => ed.chain().focus().toggleCodeBlock().run(),
    },
    {
      title: 'Table',
      description: '3x3 structured grid table',
      category: 'Cards & Blocks',
      keywords: ['table', 'grid', 'rows', 'columns'],
      icon: TableIcon,
      command: (ed) =>
        ed
          .chain()
          .focus()
          .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
          .run(),
    },
    {
      title: 'Quote Block',
      description: 'Indented quotation block (>)',
      category: 'Cards & Blocks',
      keywords: ['quote', 'blockquote', 'quotation'],
      icon: Quote,
      command: (ed) => ed.chain().focus().toggleBlockquote().run(),
    },
    {
      title: 'Callout Note',
      description: 'Informational highlight card (> [!NOTE])',
      category: 'Cards & Blocks',
      keywords: ['callout', 'note', 'info', 'box', 'card'],
      icon: Info,
      command: (ed) => ed.chain().focus().setCallout({ type: 'note' }).run(),
    },
    {
      title: 'Callout Tip',
      description: 'Helpful tip suggestion card (> [!TIP])',
      category: 'Cards & Blocks',
      keywords: ['callout', 'tip', 'lightbulb', 'idea', 'advice'],
      icon: Lightbulb,
      command: (ed) => ed.chain().focus().setCallout({ type: 'tip' }).run(),
    },
    {
      title: 'Callout Warning',
      description: 'Caution alert container (> [!WARNING])',
      category: 'Cards & Blocks',
      keywords: ['callout', 'warning', 'alert', 'caution'],
      icon: AlertTriangle,
      command: (ed) => ed.chain().focus().setCallout({ type: 'warning' }).run(),
    },
    {
      title: 'Horizontal Divider',
      description: 'Visual separation line (---)',
      category: 'Cards & Blocks',
      keywords: ['divider', 'line', 'hr', 'rule', 'separator'],
      icon: Minus,
      command: (ed) => ed.chain().focus().setHorizontalRule().run(),
    },

    // 5. Templates
    {
      title: 'Insert Date Link',
      description: 'Choose a date and insert [[YYYY-MM-DD]]',
      category: 'Templates',
      keywords: ['insert', 'date', 'calendar', 'daily', 'link'],
      icon: Calendar,
      command: (_ed, requestDatePicker) => requestDatePicker('date-link'),
    },
    {
      title: 'Daily Journal Template',
      description: 'Insert daily journal with date & priorities',
      category: 'Templates',
      keywords: ['template', 'journal', 'daily', 'log', 'today'],
      icon: Calendar,
      command: (ed) => {
        const todayStr = new Date().toLocaleDateString(undefined, {
          weekday: 'long',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
        const md = `### Daily Journal — ${todayStr}\n\n#journal\n\n**Top Priorities**\n- [ ] \n- [ ] \n- [ ] \n\n**Reflections & Notes**\n\n`;
        ed.chain().focus().insertContent(markdownToHtml(md)).run();
      },
    },
    {
      title: 'Meeting Notes Template',
      description: 'Insert meeting notes with agenda & action items',
      category: 'Templates',
      keywords: ['template', 'meeting', 'minutes', 'agenda', 'work'],
      icon: FileText,
      command: (ed) => {
        const todayStr = new Date().toLocaleDateString(undefined, {
          weekday: 'long',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
        const md = `### Meeting Notes\n\n#work/meeting\n\n**Date:** ${todayStr}  \n**Attendees:** \n\n**Agenda**\n1. \n\n**Key Discussion Points**\n\n**Action Items**\n- [ ] \n`;
        ed.chain().focus().insertContent(markdownToHtml(md)).run();
      },
    },
    {
      title: 'Sprint Tasks Template',
      description: 'Insert checklist for sprint tasks',
      category: 'Templates',
      keywords: ['template', 'tasks', 'todo', 'sprint', 'checklist'],
      icon: CheckSquare,
      command: (ed) => {
        const md = `### Sprint Tasks\n\n#todo\n\n- [ ] Task 1\n- [ ] Task 2\n- [ ] Task 3\n`;
        ed.chain().focus().insertContent(markdownToHtml(md)).run();
      },
    },
  ];

  const cleanQuery = query.toLowerCase().trim();

  const filteredItems = items.filter((item) => {
    if (!cleanQuery) return true;
    if (item.title.toLowerCase().includes(cleanQuery)) return true;
    if (item.description.toLowerCase().includes(cleanQuery)) return true;
    if (item.category.toLowerCase().includes(cleanQuery)) return true;
    if (item.keywords && item.keywords.some((k) => k.toLowerCase().includes(cleanQuery))) return true;
    return false;
  });

  const executeItem = (item: CommandItem) => {
    // Delete the slash trigger text (/...) backwards
    const { selection } = editor.state;
    const { $from } = selection;
    const lineText = $from.parent.textBetween(0, $from.parentOffset, undefined, '\ufffc');
    const slashIdx = lineText.lastIndexOf('/');

    if (slashIdx !== -1) {
      const fromPos = $from.start() + slashIdx;
      const toPos = $from.pos;
      editor.chain().focus().deleteRange({ from: fromPos, to: toPos }).run();
    }

    item.command(editor, onRequestDatePicker);
    onClose();
  };

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keep selected element visible inside scrolling menu
  useEffect(() => {
    if (selectedButtonRef.current) {
      selectedButtonRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // Capture phase keyboard interception for instant Enter / Arrow execution
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();
        if (filteredItems[selectedIndex]) {
          executeItem(filteredItems[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [editor, isOpen, filteredItems, selectedIndex, onClose, onRequestDatePicker]);

  if (!isOpen || filteredItems.length === 0) return null;

  return (
    <div
      ref={menuRef}
      className="absolute z-50 w-76 max-h-80 overflow-y-auto rounded-2xl shadow-2xl border p-1.5 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100 select-none scroll-smooth"
      style={{
        backgroundColor: 'var(--card-notelist-bg)',
        borderColor: 'var(--color-border)',
        color: 'var(--text-editor)',
      }}
    >
      <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider opacity-50 flex items-center justify-between border-b mb-1" style={{ borderColor: 'var(--color-divider)' }}>
        <span>Insert & Style</span>
        <span className="font-mono lowercase opacity-70">↑↓ navigate • ↵ select</span>
      </div>

      <div className="space-y-0.5">
        {filteredItems.map((item, index) => {
          const Icon = item.icon;
          const isSelected = index === selectedIndex;
          return (
            <button
              key={`${item.category}-${item.title}`}
              ref={isSelected ? selectedButtonRef : undefined}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                executeItem(item);
              }}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-xl text-left text-xs transition-all ${
                isSelected
                  ? 'bg-accent/15 text-accent font-medium shadow-xs'
                  : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-80 hover:opacity-100'
              }`}
            >
              <div
                className={`p-1.5 rounded-lg shrink-0 flex items-center justify-center relative ${
                  isSelected ? 'bg-accent text-white' : 'bg-black/5 dark:bg-white/5'
                }`}
                style={{
                  backgroundColor: isSelected ? 'var(--color-accent)' : undefined,
                  color: isSelected ? 'var(--color-accent-text)' : undefined,
                }}
              >
                <Icon size={14} />
                {item.colorIndicator && (
                  <span
                    className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-black/20 dark:border-white/20 shadow-xs"
                    style={{ backgroundColor: item.colorIndicator }}
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-xs leading-tight truncate">{item.title}</div>
                <div className="text-[10.5px] opacity-60 leading-tight truncate mt-0.5">{item.description}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
