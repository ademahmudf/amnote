import React, { useState } from 'react';
import { ChevronRight, ChevronDown, MoreHorizontal } from 'lucide-react';
import type { TagNodeItem } from '../../types/note';
import { useNoteStore } from '../../store/useNoteStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { resolveTagIcon } from '../../utils/tagIcons';
import { TagIconModal } from '../modals/TagIconModal';

interface TagItemProps {
  node: TagNodeItem;
  depth?: number;
}

export const TagItem: React.FC<TagItemProps> = ({ node, depth = 0 }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isIconModalOpen, setIsIconModalOpen] = useState(false);

  const selectedTag = useNoteStore((state) => state.selectedTag);
  const setSelectedTag = useNoteStore((state) => state.setSelectedTag);

  const uiScale = useSettingsStore((state) => state.uiScale);
  const tagIcons = useSettingsStore((state) => state.tagIcons);
  const tagColors = useSettingsStore((state) => state.tagColors);

  const tagTextClass = {
    compact: 'text-xs py-1',
    standard: 'text-[13px] py-1.5',
    comfortable: 'text-sm py-1.5',
    spacious: 'text-[15px] py-2',
  }[uiScale] || 'text-sm py-1.5';

  const hasChildren = Object.keys(node.children).length > 0;
  const isSelected = selectedTag === node.name;

  const customIcon = tagIcons[node.name] || tagIcons[node.segment];
  const customColor = tagColors[node.name] || tagColors[node.segment];
  const IconComponent = resolveTagIcon(node.name, customIcon);

  const indentPadding = depth * 14;

  return (
    <div className="select-none">
      <div
        className={`group flex items-center justify-between px-2 rounded-lg font-medium cursor-pointer transition-all duration-150 relative ${tagTextClass} ${
          isSelected
            ? 'shadow-xs'
            : 'opacity-75 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
        }`}
        style={{
          paddingLeft: `${8 + indentPadding}px`,
          backgroundColor: isSelected ? 'var(--active-sidebar-bg)' : undefined,
          color: isSelected ? 'var(--text-sidebar-active)' : 'var(--text-sidebar)',
          borderLeft: isSelected ? '2px solid var(--active-sidebar-border)' : '2px solid transparent',
        }}
        onClick={() => setSelectedTag(node.name)}
        onContextMenu={(e) => {
          e.preventDefault();
          setIsIconModalOpen(true);
        }}
      >
        <div className="flex items-center gap-1.5 overflow-hidden flex-1 min-w-0">
          {/* Fixed 14px Chevron expander slot for alignment */}
          <div className="w-3.5 h-3.5 flex items-center justify-center shrink-0">
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
                className="w-3.5 h-3.5 flex items-center justify-center rounded hover:bg-black/10 dark:hover:bg-white/10 opacity-70 hover:opacity-100 transition-opacity"
              >
                {isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
              </button>
            ) : null}
          </div>

          {/* Fixed 16px Tag Icon slot */}
          <div className="w-4 h-4 flex items-center justify-center shrink-0">
            <IconComponent
              size={13}
              className="shrink-0 transition-colors"
              style={{ color: customColor || undefined }}
            />
          </div>

          {/* Tag segment label */}
          <span className="truncate">{node.segment}</span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Edit Tag Icon button on hover */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsIconModalOpen(true);
            }}
            title="Customize Tag Icon & Color"
            className="p-1 rounded opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:bg-black/10 dark:hover:bg-white/10 transition-opacity"
          >
            <MoreHorizontal size={12} />
          </button>

          {node.count > 0 && (
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono transition-opacity ${
                isSelected ? 'opacity-90 font-semibold' : 'opacity-40 group-hover:opacity-80'
              }`}
            >
              {node.count}
            </span>
          )}
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div className="space-y-0.5 mt-0.5">
          {Object.values(node.children).map((child) => (
            <TagItem key={child.name} node={child} depth={depth + 1} />
          ))}
        </div>
      )}

      {/* Tag Customizer Modal */}
      <TagIconModal
        tag={node.name}
        isOpen={isIconModalOpen}
        onClose={() => setIsIconModalOpen(false)}
      />
    </div>
  );
};
