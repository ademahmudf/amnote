import React from 'react';
import { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Strikethrough,
  Highlighter,
  Underline as UnderlineIcon,
  Code,
  Link as LinkIcon,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  FileText,
} from 'lucide-react';

interface BubbleToolbarProps {
  editor: Editor | null;
}

export const BubbleToolbar: React.FC<BubbleToolbarProps> = ({ editor }) => {
  if (!editor) return null;

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Enter URL:', previousUrl);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const buttons = [
    {
      icon: Bold,
      label: 'Bold',
      action: () => editor.chain().focus().toggleBold().run(),
      isActive: editor.isActive('bold'),
    },
    {
      icon: Italic,
      label: 'Italic',
      action: () => editor.chain().focus().toggleItalic().run(),
      isActive: editor.isActive('italic'),
    },
    {
      icon: UnderlineIcon,
      label: 'Underline',
      action: () => editor.chain().focus().toggleUnderline().run(),
      isActive: editor.isActive('underline'),
    },
    {
      icon: Strikethrough,
      label: 'Strikethrough',
      action: () => editor.chain().focus().toggleStrike().run(),
      isActive: editor.isActive('strike'),
    },
    {
      icon: Highlighter,
      label: 'Highlight',
      action: () => editor.chain().focus().toggleHighlight().run(),
      isActive: editor.isActive('highlight'),
    },
    {
      icon: Code,
      label: 'Code',
      action: () => editor.chain().focus().toggleCode().run(),
      isActive: editor.isActive('code'),
    },
    {
      icon: LinkIcon,
      label: 'Link Web',
      action: setLink,
      isActive: editor.isActive('link'),
    },
    {
      icon: FileText,
      label: 'Link Note ([[)',
      action: () => {
        const { state } = editor;
        const { from, to } = state.selection;
        const selectedText = state.doc.textBetween(from, to, ' ');
        if (selectedText) {
          editor.chain().focus().insertContent(`[[${selectedText}]]`).run();
        } else {
          editor.chain().focus().insertContent('[[').run();
        }
      },
      isActive: false,
    },
    { type: 'divider' },
    {
      icon: Heading1,
      label: 'H1',
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      isActive: editor.isActive('heading', { level: 1 }),
    },
    {
      icon: Heading2,
      label: 'H2',
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: editor.isActive('heading', { level: 2 }),
    },
    {
      icon: Heading3,
      label: 'H3',
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      isActive: editor.isActive('heading', { level: 3 }),
    },
    { type: 'divider' },
    {
      icon: CheckSquare,
      label: 'Task List',
      action: () => editor.chain().focus().toggleTaskList().run(),
      isActive: editor.isActive('taskList'),
    },
    {
      icon: List,
      label: 'Bullet List',
      action: () => editor.chain().focus().toggleBulletList().run(),
      isActive: editor.isActive('bulletList'),
    },
    {
      icon: ListOrdered,
      label: 'Numbered List',
      action: () => editor.chain().focus().toggleOrderedList().run(),
      isActive: editor.isActive('orderedList'),
    },
    {
      icon: Quote,
      label: 'Quote',
      action: () => editor.chain().focus().toggleBlockquote().run(),
      isActive: editor.isActive('blockquote'),
    },
  ];

  return (
    <div
      className="flex items-center gap-0.5 p-1 rounded-xl shadow-2xl border backdrop-blur-md transition-all animate-in fade-in zoom-in-95 duration-150"
      style={{
        backgroundColor: 'var(--card-notelist-bg)',
        borderColor: 'var(--color-border)',
        color: 'var(--text-editor)',
      }}
    >
      {buttons.map((btn, idx) => {
        if (btn.type === 'divider') {
          return (
            <div
              key={`div-${idx}`}
              className="w-px h-4 mx-1"
              style={{ backgroundColor: 'var(--color-border)' }}
            />
          );
        }

        const Icon = btn.icon!;
        return (
          <button
            key={btn.label}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={btn.action}
            title={btn.label}
            className={`p-1.5 rounded-lg text-xs flex items-center justify-center transition-all ${
              btn.isActive
                ? 'bg-accent text-white font-bold shadow-sm'
                : 'hover:bg-black/10 dark:hover:bg-white/10 opacity-80 hover:opacity-100'
            }`}
            style={{
              backgroundColor: btn.isActive ? 'var(--color-accent)' : undefined,
              color: btn.isActive ? 'var(--color-accent-text)' : undefined,
            }}
          >
            <Icon size={14} />
          </button>
        );
      })}
    </div>
  );
};
