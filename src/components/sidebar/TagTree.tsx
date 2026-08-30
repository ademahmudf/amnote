import React from 'react';
import { useNoteStore } from '../../store/useNoteStore';
import { TagItem } from './TagItem';
import { Tag as TagIcon, Plus } from 'lucide-react';

export const TagTree: React.FC = () => {
  const notes = useNoteStore((state) => state.notes);
  const getTagTree = useNoteStore((state) => state.getTagTree);
  const createNote = useNoteStore((state) => state.createNote);
  const tagNodes = React.useMemo(() => getTagTree(), [notes, getTagTree]);

  const handleAddNewTag = () => {
    const tagName = window.prompt('Enter new tag name (e.g. work/project or ideas):');
    if (!tagName) return;
    const clean = tagName.trim().toLowerCase().replace(/^#+/, '');
    if (clean) {
      createNote(clean);
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold uppercase tracking-wider opacity-60 select-none">
        <div className="flex items-center gap-1.5">
          <TagIcon size={12} />
          <span>Tags</span>
        </div>
        <button
          type="button"
          onClick={handleAddNewTag}
          title="Create New Tag"
          className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 opacity-70 hover:opacity-100 transition-opacity"
        >
          <Plus size={12} />
        </button>
      </div>

      {tagNodes.length === 0 ? (
        <div className="px-3 py-2 text-xs opacity-40 italic select-none">
          No tags yet. Type #tag in any note!
        </div>
      ) : (
        <div className="space-y-0.5">
          {tagNodes.map((node) => (
            <TagItem key={node.name} node={node} />
          ))}
        </div>
      )}
    </div>
  );
};
