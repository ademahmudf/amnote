import React, { useState, useRef } from 'react';
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
  Image as ImageIcon,
  ChevronDown,
  Palette,
  X,
} from 'lucide-react';
import { useSettingsStore } from '../../store/useSettingsStore';

interface BubbleToolbarProps {
  editor: Editor | null;
}

const HIGHLIGHT_PRESETS = [
  { name: 'Yellow', color: '#fef08a' },
  { name: 'Mint Green', color: '#bbf7d0' },
  { name: 'Sky Blue', color: '#bfdbfe' },
  { name: 'Lavender', color: '#e9d5ff' },
  { name: 'Rose Coral', color: '#fecaca' },
  { name: 'Warm Amber', color: '#fed7aa' },
];

export const BubbleToolbar: React.FC<BubbleToolbarProps> = ({ editor }) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const defaultHighlightColor = useSettingsStore((state) => state.defaultHighlightColor);
  const setDefaultHighlightColor = useSettingsStore((state) => state.setDefaultHighlightColor);

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

  const applyHighlight = (color: string) => {
    editor.chain().focus().toggleHighlight({ color }).run();
    setDefaultHighlightColor(color);
    setShowColorPicker(false);
  };

  const removeHighlight = () => {
    editor.chain().focus().unsetHighlight().run();
    setShowColorPicker(false);
  };

  const isHighlightActive = editor.isActive('highlight');

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
    {
      icon: ImageIcon,
      label: 'Insert Image',
      action: () => {
        const event = new CustomEvent('amnote:trigger-image-upload');
        window.dispatchEvent(event);
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
    <div className="relative inline-block select-none">
      <div
        className="flex items-center gap-0.5 p-1 rounded-xl shadow-2xl border backdrop-blur-md transition-all animate-in fade-in zoom-in-95 duration-150"
        style={{
          backgroundColor: 'var(--card-notelist-bg)',
          borderColor: 'var(--color-border)',
          color: 'var(--text-editor)',
        }}
      >
        {/* Highlight with Custom Color Popover Trigger */}
        <div className="relative flex items-center">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyHighlight(defaultHighlightColor)}
            title={`Highlight text (Current: ${defaultHighlightColor})`}
            className={`p-1.5 rounded-l-lg text-xs flex items-center justify-center transition-all ${
              isHighlightActive
                ? 'bg-accent text-white font-bold shadow-sm'
                : 'hover:bg-black/10 dark:hover:bg-white/10 opacity-80 hover:opacity-100'
            }`}
            style={{
              backgroundColor: isHighlightActive ? 'var(--color-accent)' : undefined,
              color: isHighlightActive ? 'var(--color-accent-text)' : undefined,
            }}
          >
            <Highlighter size={14} />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setShowColorPicker(!showColorPicker)}
            title="Choose custom highlight color"
            className={`px-1 py-1.5 rounded-r-lg text-xs flex items-center justify-center transition-all border-l ${
              showColorPicker
                ? 'bg-accent/20 text-accent font-bold'
                : 'hover:bg-black/10 dark:hover:bg-white/10 opacity-70 hover:opacity-100'
            }`}
            style={{ borderColor: 'rgba(128, 128, 128, 0.2)' }}
          >
            <span
              className="w-2.5 h-2.5 rounded-full border border-black/20 dark:border-white/20 shadow-xs mr-0.5"
              style={{ backgroundColor: defaultHighlightColor }}
            />
            <ChevronDown size={10} className={`transition-transform duration-150 ${showColorPicker ? 'rotate-180' : ''}`} />
          </button>
        </div>

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

      {/* Floating Highlight Color Swatches Popover */}
      {showColorPicker && (
        <div
          className="absolute left-0 top-full mt-2 p-2.5 rounded-2xl shadow-2xl border backdrop-blur-xl z-50 flex flex-col gap-2 min-w-[200px] animate-in fade-in zoom-in-95 duration-100"
          style={{
            backgroundColor: 'var(--card-notelist-bg)',
            borderColor: 'var(--color-border)',
            color: 'var(--text-editor)',
          }}
        >
          <div className="text-[11px] font-bold uppercase tracking-wider opacity-60 px-1">
            Highlight Color
          </div>

          <div className="grid grid-cols-6 gap-1.5">
            {HIGHLIGHT_PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyHighlight(preset.color)}
                title={`${preset.name} (${preset.color})`}
                className="w-6 h-6 rounded-lg border border-black/15 dark:border-white/15 transition-transform hover:scale-115 active:scale-95 flex items-center justify-center shadow-xs"
                style={{ backgroundColor: preset.color }}
              >
                {defaultHighlightColor.toLowerCase() === preset.color.toLowerCase() && (
                  <span className="w-1.5 h-1.5 rounded-full bg-black/60" />
                )}
              </button>
            ))}
          </div>

          <div className="pt-1 border-t flex items-center justify-between gap-2" style={{ borderColor: 'var(--color-divider)' }}>
            {/* Custom HTML Color Picker */}
            <label className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs opacity-80 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-all">
              <Palette size={13} />
              <span>Custom Hex</span>
              <input
                ref={colorInputRef}
                type="color"
                value={defaultHighlightColor}
                onChange={(e) => applyHighlight(e.target.value)}
                className="w-0 h-0 opacity-0 absolute"
              />
            </label>

            {/* Remove / Clear Highlight */}
            {isHighlightActive && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={removeHighlight}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-rose-400 hover:bg-rose-500/10 transition-all font-medium"
              >
                <X size={12} />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
