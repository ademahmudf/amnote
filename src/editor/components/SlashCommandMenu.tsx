import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';

interface SlashCommandMenuProps {
  editor: Editor;
  isOpen: boolean;
  onClose: () => void;
  query: string;
}

interface CommandItem {
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  command: (editor: Editor) => void;
}

export const SlashCommandMenu: React.FC<SlashCommandMenuProps> = ({
  editor,
  isOpen,
  onClose,
  query,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const items: CommandItem[] = [
    {
      title: 'Link to Note',
      description: 'Create wiki-style cross link [[Note Title]]',
      icon: CheckSquare,
      command: (ed) => ed.chain().focus().insertContent('[[').run(),
    },
    {
      title: 'Todo List',
      description: 'Interactive checklist with task boxes',
      icon: CheckSquare,
      command: (ed) => ed.chain().focus().toggleTaskList().run(),
    },
    {
      title: 'Bullet List',
      description: 'Simple bulleted list',
      icon: List,
      command: (ed) => ed.chain().focus().toggleBulletList().run(),
    },
    {
      title: 'Numbered List',
      description: 'Ordered sequence list',
      icon: ListOrdered,
      command: (ed) => ed.chain().focus().toggleOrderedList().run(),
    },
    {
      title: 'Heading 1',
      description: 'Large section heading',
      icon: Heading1,
      command: (ed) => ed.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      title: 'Heading 2',
      description: 'Medium section heading',
      icon: Heading2,
      command: (ed) => ed.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      title: 'Heading 3',
      description: 'Small subsection heading',
      icon: Heading3,
      command: (ed) => ed.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      title: 'Code Block',
      description: 'Syntax highlighted code snippet',
      icon: Code,
      command: (ed) => ed.chain().focus().toggleCodeBlock().run(),
    },
    {
      title: 'Table',
      description: '3x3 responsive grid table',
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
      description: 'Indented blockquote quotation',
      icon: Quote,
      command: (ed) => ed.chain().focus().toggleBlockquote().run(),
    },
    {
      title: 'Callout Note',
      description: 'Informational highlight card',
      icon: Info,
      command: (ed) => ed.chain().focus().setCallout({ type: 'note' }).run(),
    },
    {
      title: 'Callout Tip',
      description: 'Helpful tip advice box',
      icon: Lightbulb,
      command: (ed) => ed.chain().focus().setCallout({ type: 'tip' }).run(),
    },
    {
      title: 'Callout Warning',
      description: 'Caution alert container',
      icon: AlertTriangle,
      command: (ed) => ed.chain().focus().setCallout({ type: 'warning' }).run(),
    },
    {
      title: 'Divider',
      description: 'Horizontal separator line',
      icon: Minus,
      command: (ed) => ed.chain().focus().setHorizontalRule().run(),
    },
  ];

  const filteredItems = items.filter((item) =>
    item.title.toLowerCase().includes(query.toLowerCase()) ||
    item.description.toLowerCase().includes(query.toLowerCase())
  );

  const executeItem = (item: CommandItem) => {
    // Delete the slash trigger text from current position backwards
    const { selection } = editor.state;
    const { $from } = selection;
    const lineText = $from.parent.textBetween(0, $from.parentOffset, undefined, '\ufffc');
    const slashIdx = lineText.lastIndexOf('/');

    if (slashIdx !== -1) {
      const fromPos = $from.start() + slashIdx;
      const toPos = $from.pos;
      editor.chain().focus().deleteRange({ from: fromPos, to: toPos }).run();
    }

    item.command(editor);
    onClose();
  };

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredItems.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          executeItem(filteredItems[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex, onClose]);

  if (!isOpen || filteredItems.length === 0) return null;

  return (
    <div
      className="absolute z-50 w-72 max-h-80 overflow-y-auto rounded-xl shadow-2xl border p-1.5 backdrop-blur-lg animate-in fade-in zoom-in-95 duration-150"
      style={{
        backgroundColor: 'var(--card-notelist-bg)',
        borderColor: 'var(--color-border)',
        color: 'var(--text-editor)',
      }}
    >
      <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider opacity-60">
        Insert Block
      </div>
      {filteredItems.map((item, index) => {
        const Icon = item.icon;
        const isSelected = index === selectedIndex;
        return (
          <button
            key={item.title}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeItem(item)}
            onMouseEnter={() => setSelectedIndex(index)}
            className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-left text-sm transition-all ${
              isSelected ? 'bg-accent/15 text-accent font-medium' : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-85'
            }`}
          >
            <div
              className={`p-1.5 rounded-md ${
                isSelected ? 'bg-accent text-white' : 'bg-black/5 dark:bg-white/5'
              }`}
              style={{
                backgroundColor: isSelected ? 'var(--color-accent)' : undefined,
                color: isSelected ? 'var(--color-accent-text)' : undefined,
              }}
            >
              <Icon size={16} />
            </div>
            <div>
              <div className="font-medium text-xs leading-tight">{item.title}</div>
              <div className="text-[11px] opacity-60 leading-tight mt-0.5">{item.description}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
};
