import React, { useState } from 'react';
import { X, Search, RotateCcw, Check } from 'lucide-react';
import { TAG_ICON_LIST, resolveTagIcon } from '../../utils/tagIcons';
import { useSettingsStore } from '../../store/useSettingsStore';

interface TagIconModalProps {
  tag: string | null;
  isOpen: boolean;
  onClose: () => void;
}

const ACCENT_PRESETS = [
  '#e53935', // Red / Vermilion
  '#f59e0b', // Amber / Gold
  '#10b981', // Emerald / Mint
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#f43f5e', // Rose
];

export const TagIconModal: React.FC<TagIconModalProps> = ({ tag, isOpen, onClose }) => {
  const tagIcons = useSettingsStore((state) => state.tagIcons);
  const tagColors = useSettingsStore((state) => state.tagColors);
  const setTagIcon = useSettingsStore((state) => state.setTagIcon);
  const setTagColor = useSettingsStore((state) => state.setTagColor);

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  if (!isOpen || !tag) return null;

  const currentCustomIcon = tagIcons[tag];
  const currentColor = tagColors[tag];
  const ActiveIcon = resolveTagIcon(tag, currentCustomIcon);

  const categories = ['All', 'Work & Dev', 'Lifestyle & Travel', 'Media & Art', 'Organization'];

  const filteredIcons = TAG_ICON_LIST.filter((item) => {
    const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch =
      !search ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.id.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleSelectIcon = (iconId: string) => {
    setTagIcon(tag, iconId);
  };

  const handleResetToAuto = () => {
    setTagIcon(tag, null);
    setTagColor(tag, null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl shadow-2xl border overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150"
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
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shadow-inner"
              style={{
                backgroundColor: currentColor ? `${currentColor}25` : 'var(--color-tag-bg)',
                color: currentColor || 'var(--color-accent)',
              }}
            >
              <ActiveIcon size={20} />
            </div>
            <div>
              <h2 className="font-bold text-sm">Customize Tag Icon</h2>
              <p className="text-xs opacity-60 font-mono">#{tag}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-opacity"
          >
            <X size={16} />
          </button>
        </div>

        {/* Search & Category Filter */}
        <div className="p-4 border-b space-y-3" style={{ borderColor: 'var(--color-divider)' }}>
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl border"
            style={{
              backgroundColor: 'var(--bg-editor)',
              borderColor: 'var(--color-border)',
            }}
          >
            <Search size={14} className="opacity-40" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search icons (e.g. Code, Book, Rocket, Coffee)..."
              className="bg-transparent border-none outline-none text-xs w-full placeholder:opacity-40"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="opacity-50 hover:opacity-100 text-xs"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[11px]">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg whitespace-nowrap font-medium transition-all ${
                  selectedCategory === cat
                    ? 'bg-accent text-white shadow-xs'
                    : 'opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
                style={{
                  backgroundColor: selectedCategory === cat ? 'var(--color-accent)' : undefined,
                  color: selectedCategory === cat ? 'var(--color-accent-text)' : undefined,
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Color Accent Presets */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[11px] opacity-60 mr-1">Tag Color:</span>
            <button
              type="button"
              onClick={() => setTagColor(tag, null)}
              title="Default Theme Accent"
              className={`w-5 h-5 rounded-full border border-black/20 flex items-center justify-center ${
                !currentColor ? 'ring-2 ring-accent' : ''
              }`}
              style={{ backgroundColor: 'var(--color-accent)' }}
            >
              {!currentColor && <Check size={10} className="text-white" />}
            </button>
            {ACCENT_PRESETS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setTagColor(tag, color)}
                className={`w-5 h-5 rounded-full border border-black/20 flex items-center justify-center transition-transform hover:scale-110 ${
                  currentColor === color ? 'ring-2 ring-white ring-offset-1 scale-110' : ''
                }`}
                style={{ backgroundColor: color }}
              >
                {currentColor === color && <Check size={10} className="text-white" />}
              </button>
            ))}
          </div>
        </div>

        {/* Icon Grid */}
        <div className="p-4 overflow-y-auto max-h-[45vh] grid grid-cols-4 sm:grid-cols-6 gap-2.5">
          {filteredIcons.map((item) => {
            const Icon = item.icon;
            const isSelected = currentCustomIcon === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectIcon(item.id)}
                title={item.name}
                className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center group ${
                  isSelected
                    ? 'border-accent bg-accent/15 ring-2 ring-accent'
                    : 'hover:border-border/80 hover:bg-black/5 dark:hover:bg-white/5 opacity-75 hover:opacity-100'
                }`}
                style={{
                  borderColor: isSelected ? 'var(--color-accent)' : 'var(--color-border)',
                }}
              >
                <Icon
                  size={22}
                  className="transition-transform group-hover:scale-110"
                  style={{
                    color: isSelected
                      ? currentColor || 'var(--color-accent)'
                      : currentColor || undefined,
                  }}
                />
                <span className="text-[10px] truncate max-w-full opacity-70">
                  {item.name.split(' ')[0]}
                </span>
              </button>
            );
          })}

          {filteredIcons.length === 0 && (
            <div className="col-span-full py-8 text-center opacity-50 text-xs">
              No matching icons found for "{search}"
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="p-4 border-t flex items-center justify-between text-xs"
          style={{ borderColor: 'var(--color-divider)' }}
        >
          <button
            type="button"
            onClick={handleResetToAuto}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-all"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <RotateCcw size={13} />
            <span>Reset to Auto TagCon</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-1.5 rounded-xl font-semibold text-white shadow-md transition-transform hover:scale-105"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
