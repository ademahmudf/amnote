import React, { useState, useRef, useEffect } from 'react';
import { useNoteStore } from '../../store/useNoteStore';
import { TagItem } from './TagItem';
import { Tag as TagIcon, Plus, Hash, Check, X } from 'lucide-react';

export const TagTree: React.FC = () => {
  const notes = useNoteStore((state) => state.notes);
  const getTagTree = useNoteStore((state) => state.getTagTree);
  const createNote = useNoteStore((state) => state.createNote);
  const tagNodes = React.useMemo(() => getTagTree(), [notes, getTagTree]);

  const [isCreating, setIsCreating] = useState(false);
  const [tagName, setTagName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCreating) {
      inputRef.current?.focus();
    }
  }, [isCreating]);

  const handleCommit = () => {
    const clean = tagName.trim().toLowerCase().replace(/^#+/, '');
    if (clean) {
      createNote(clean);
    }
    setTagName('');
    setIsCreating(false);
  };

  const handleCancel = () => {
    setTagName('');
    setIsCreating(false);
  };

  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider opacity-50 select-none">
        <div className="flex items-center gap-1.5">
          <TagIcon size={11} />
          <span>Tags</span>
        </div>
        <button
          type="button"
          onClick={() => {
            setIsCreating(true);
          }}
          title="Create New Tag"
          className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 opacity-70 hover:opacity-100 transition-opacity"
        >
          <Plus size={11} />
        </button>
      </div>

      {/* Inline Tag Creator */}
      {isCreating && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleCommit();
          }}
          className="px-1.5 py-1 mb-1"
        >
          <div
            className="flex items-center gap-1 px-2 py-1 rounded-lg border shadow-xs transition-all ring-1 ring-accent/30"
            style={{
              backgroundColor: 'var(--card-notelist-bg)',
              borderColor: 'var(--color-accent)',
            }}
          >
            <Hash size={12} className="text-accent shrink-0" style={{ color: 'var(--color-accent)' }} />
            <input
              ref={inputRef}
              type="text"
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.stopPropagation();
                  handleCancel();
                }
              }}
              placeholder="new/tag or ideas..."
              className="w-full bg-transparent text-xs outline-none min-w-0"
              style={{ color: 'var(--text-sidebar-active)' }}
            />
            <button
              type="submit"
              disabled={!tagName.trim()}
              title="Save Tag"
              className="p-0.5 rounded text-accent hover:opacity-80 disabled:opacity-30 transition-opacity shrink-0"
              style={{ color: 'var(--color-accent)' }}
            >
              <Check size={12} />
            </button>
            <button
              type="button"
              onClick={handleCancel}
              title="Cancel (Esc)"
              className="p-0.5 rounded opacity-50 hover:opacity-100 transition-opacity shrink-0"
            >
              <X size={12} />
            </button>
          </div>
        </form>
      )}

      {tagNodes.length === 0 ? (
        <div className="px-2 py-1 text-[11px] opacity-40 italic select-none">
          No tags yet. Type #tag in any note!
        </div>
      ) : (
        <div className="flex flex-col space-y-0">
          {tagNodes.map((node) => (
            <TagItem key={node.name} node={node} />
          ))}
        </div>
      )}
    </div>
  );
};
