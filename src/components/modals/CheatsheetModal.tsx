import React, { useState } from 'react';
import { X, BookOpen, Keyboard, Sparkles, Hash, CheckSquare, Link, Quote, Code, Table, HelpCircle, Search } from 'lucide-react';
import { useNoteStore } from '../../store/useNoteStore';
import { AnnotatedText } from '../ui/AnnotatedText';
import { GLOBAL_SHORTCUTS } from '../../utils/shortcuts';

export const CheatsheetModal: React.FC = () => {
  const isCheatsheetOpen = useNoteStore((state) => state.isCheatsheetOpen);
  const setCheatsheetOpen = useNoteStore((state) => state.setCheatsheetOpen);

  const [activeTab, setActiveTab] = useState<'markdown' | 'shortcuts'>('markdown');
  const [shortcutQuery, setShortcutQuery] = useState('');

  if (!isCheatsheetOpen) return null;

  const markdownItems = [
    {
      syntax: '# Heading 1',
      output: 'Large Heading',
      desc: 'Type # at start of line',
      icon: Hash,
    },
    {
      syntax: '## Heading 2',
      output: 'Medium Heading',
      desc: 'Type ## at start of line',
      icon: Hash,
    },
    {
      syntax: '**bold**',
      output: 'bold text',
      desc: 'Wrap text in double asterisks',
      icon: Sparkles,
    },
    {
      syntax: '*italic*',
      output: 'italic text',
      desc: 'Wrap text in single asterisk',
      icon: Sparkles,
    },
    {
      syntax: '==highlight==',
      output: 'highlighted text',
      desc: 'Wrap in double equal signs',
      icon: Sparkles,
    },
    {
      syntax: '- [ ] Task',
      output: 'Interactive checkbox',
      desc: 'Type - [ ] or * [ ]',
      icon: CheckSquare,
    },
    {
      syntax: '[[Note Title]]',
      output: 'Cross-note Wiki link',
      desc: 'Type [[ for note suggestions',
      icon: Link,
    },
    {
      syntax: '#tag or #nested/tag',
      output: 'Categorized Tag',
      desc: 'Type # followed by tag name',
      icon: Hash,
    },
    {
      syntax: '```code```',
      output: 'Syntax highlighted code',
      desc: 'Triple backticks with language',
      icon: Code,
    },
    {
      syntax: '> Quote block',
      output: 'Indented quotation',
      desc: 'Type > at start of line',
      icon: Quote,
    },
    {
      syntax: ':::info Callout',
      output: 'Colored notice callout',
      desc: ':::info, :::tip, :::warning',
      icon: HelpCircle,
    },
    {
      syntax: '| Col 1 | Col 2 |',
      output: 'Structured table grid',
      desc: 'Type | Header | or /table',
      icon: Table,
    },
    {
      syntax: '/ for Slash Menu',
      output: 'Quick block inserter',
      desc: 'Type / anywhere on a blank line',
      icon: Sparkles,
    },
  ];

  // Single source of truth lives in src/utils/shortcuts.ts (mirrors AppLayout).
  const shortcutItems = GLOBAL_SHORTCUTS;
  const filteredShortcuts = shortcutItems.filter(
    (item) =>
      !shortcutQuery.trim() ||
      item.description.toLowerCase().includes(shortcutQuery.toLowerCase()) ||
      item.keys.toLowerCase().includes(shortcutQuery.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={() => setCheatsheetOpen(false)}
    >
      <div
        className="w-full max-w-2xl max-h-[85vh] rounded-2xl shadow-2xl border overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        style={{
          backgroundColor: 'var(--card-notelist-bg)',
          borderColor: 'var(--color-border)',
          color: 'var(--text-editor)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-6 py-4 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--color-divider)' }}
        >
          <div className="flex items-center gap-2.5">
            <BookOpen size={18} className="text-accent" style={{ color: 'var(--color-accent)' }} />
            <h2 className="font-bold text-sm">
              <AnnotatedText variant="underline">AmNote Cheatsheet & Guide</AnnotatedText>
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setCheatsheetOpen(false)}
            className="p-1 rounded-lg opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-opacity"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div
          className="flex border-b px-6 text-xs font-semibold gap-6 select-none"
          style={{ borderColor: 'var(--color-divider)' }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('markdown')}
            className={`py-3 flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'markdown'
                ? 'border-accent text-accent'
                : 'border-transparent opacity-60 hover:opacity-100'
            }`}
            style={{
              borderColor: activeTab === 'markdown' ? 'var(--color-accent)' : 'transparent',
              color: activeTab === 'markdown' ? 'var(--color-accent)' : undefined,
            }}
          >
            <Sparkles size={14} />
            <span>Markdown Syntax</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('shortcuts')}
            className={`py-3 flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'shortcuts'
                ? 'border-accent text-accent'
                : 'border-transparent opacity-60 hover:opacity-100'
            }`}
            style={{
              borderColor: activeTab === 'shortcuts' ? 'var(--color-accent)' : 'transparent',
              color: activeTab === 'shortcuts' ? 'var(--color-accent)' : undefined,
            }}
          >
            <Keyboard size={14} />
            <span>Keyboard Shortcuts</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto max-h-[62vh] space-y-4">
          {activeTab === 'markdown' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {markdownItems.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border flex flex-col justify-between space-y-1"
                    style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--bg-editor)' }}
                  >
                    <div className="flex items-center justify-between">
                      <code className="font-mono text-xs text-accent font-semibold px-1.5 py-0.5 rounded bg-accent/10">
                        {item.syntax}
                      </code>
                      <Icon size={13} className="opacity-40" />
                    </div>
                    <div className="text-xs font-medium pt-1">{item.output}</div>
                    <div className="text-[11px] opacity-50">{item.desc}</div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'shortcuts' && (
            <div className="space-y-2">
              <div
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border"
                style={{
                  backgroundColor: 'var(--bg-editor)',
                  borderColor: 'var(--color-border)',
                }}
              >
                <Search size={13} className="opacity-50 shrink-0" aria-hidden="true" />
                <input
                  type="text"
                  value={shortcutQuery}
                  onChange={(e) => setShortcutQuery(e.target.value)}
                  placeholder="Filter shortcuts..."
                  aria-label="Filter shortcuts"
                  className="bg-transparent border-none outline-none text-xs w-full placeholder:opacity-50"
                />
              </div>
              {filteredShortcuts.length === 0 ? (
                <div className="p-6 text-center text-xs opacity-50">No shortcuts match.</div>
              ) : (
                filteredShortcuts.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2.5 rounded-xl border text-xs"
                    style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--bg-editor)' }}
                  >
                    <span className="font-medium opacity-80">{item.description}</span>
                    <kbd className="font-mono text-xs px-2 py-1 rounded bg-black/10 dark:bg-white/10 border border-border/40 font-semibold shadow-2xs">
                      {item.keys}
                    </kbd>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
