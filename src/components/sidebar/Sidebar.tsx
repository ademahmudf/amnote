import React from 'react';
import {
  FileText,
  Calendar,
  CheckSquare,
  Tag as TagIcon,
  Archive,
  Trash2,
  Lock,
  Plus,
  Settings,
  Sun,
  Moon,
  Command,
} from 'lucide-react';
import { useNoteStore } from '../../store/useNoteStore';
import { useThemeStore } from '../../store/useThemeStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { TagTree } from './TagTree';
import type { SystemFilter } from '../../types/note';

export const Sidebar: React.FC = () => {
  const notes = useNoteStore((state) => state.notes);
  const activeFilter = useNoteStore((state) => state.activeFilter);
  const setActiveFilter = useNoteStore((state) => state.setActiveFilter);
  const createNote = useNoteStore((state) => state.createNote);
  const getSystemCounts = useNoteStore((state) => state.getSystemCounts);
  const setSettingsOpen = useNoteStore((state) => state.setSettingsOpen);
  const setCommandPaletteOpen = useNoteStore((state) => state.setCommandPaletteOpen);
  const emptyTrash = useNoteStore((state) => state.emptyTrash);

  const { toggleDarkLight, getThemeColors } = useThemeStore();
  const currentTheme = getThemeColors();
  const counts = React.useMemo(() => getSystemCounts(), [notes, getSystemCounts]);

  const uiScale = useSettingsStore((state) => state.uiScale);

  const itemTextClass = {
    compact: 'text-xs py-1',
    standard: 'text-[13px] py-1.5',
    comfortable: 'text-sm py-1.5',
    spacious: 'text-[15px] py-2',
  }[uiScale] || 'text-sm py-1.5';

  const systemItems: { id: SystemFilter; label: string; icon: React.FC<{ size?: number; className?: string }>; count: number }[] = [
    { id: 'notes', label: 'Notes', icon: FileText, count: counts.notes },
    { id: 'today', label: 'Today', icon: Calendar, count: counts.today },
    { id: 'todo', label: 'Todo', icon: CheckSquare, count: counts.todo },
    { id: 'untagged', label: 'Untagged', icon: TagIcon, count: counts.untagged },
    { id: 'locked', label: 'Locked', icon: Lock, count: counts.locked },
    { id: 'archive', label: 'Archive', icon: Archive, count: counts.archive },
    { id: 'trash', label: 'Trash', icon: Trash2, count: counts.trash },
  ];

  return (
    <div
      className="w-60 h-full flex flex-col justify-between border-r select-none shrink-0"
      style={{
        backgroundColor: 'var(--bg-sidebar)',
        color: 'var(--text-sidebar)',
        borderColor: 'var(--color-border)',
      }}
    >
      {/* Top Header & Brand */}
      <div className="p-3 pb-2 flex items-center justify-between border-b" style={{ borderColor: 'var(--color-divider)' }}>
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shadow-sm"
            style={{
              backgroundColor: 'var(--color-accent)',
              color: 'var(--color-accent-text)',
            }}
          >
            ʕ•ᴥ•ʔ
          </div>
          <span className="font-bold text-sm tracking-tight" style={{ color: 'var(--text-sidebar-active)' }}>
            AmNote
          </span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/10 dark:bg-white/10 opacity-70 font-mono">
            Vault
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
            title="Command Palette (Ctrl+K)"
            className="p-1.5 rounded-lg opacity-60 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 transition-all text-xs"
          >
            <Command size={14} />
          </button>
          <button
            type="button"
            onClick={() => createNote()}
            title="New Note (Ctrl+N)"
            className="p-1.5 rounded-lg opacity-80 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 transition-all text-xs"
            style={{
              backgroundColor: 'var(--color-accent)',
              color: 'var(--color-accent-text)',
            }}
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* Main Navigation Scroll Area */}
      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        {/* System Views */}
        <div className="space-y-0.5">
          {systemItems.map((item) => {
            const Icon = item.icon;
            const isSelected = activeFilter === item.id;
            return (
              <div
                key={item.id}
                onClick={() => setActiveFilter(item.id)}
                className={`group flex items-center justify-between px-2.5 rounded-lg font-medium cursor-pointer transition-all duration-150 ${itemTextClass} ${
                  isSelected
                    ? 'shadow-xs'
                    : 'opacity-75 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
                style={{
                  backgroundColor: isSelected ? 'var(--active-sidebar-bg)' : undefined,
                  color: isSelected ? 'var(--text-sidebar-active)' : 'var(--text-sidebar)',
                  borderLeft: isSelected
                    ? '2px solid var(--active-sidebar-border)'
                    : '2px solid transparent',
                }}
              >
                <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
                  <div className="w-4 h-4 flex items-center justify-center shrink-0">
                    <Icon size={14} className={isSelected ? 'text-accent' : 'opacity-70'} />
                  </div>
                  <span className="truncate font-medium">{item.label}</span>
                </div>

                <div className="flex items-center gap-1">
                  {item.id === 'trash' && counts.trash > 0 && isSelected && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Empty all notes in Trash permanently?')) {
                          emptyTrash();
                        }
                      }}
                      title="Empty Trash"
                      className="text-[10px] px-1 py-0.5 rounded bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 transition-colors"
                    >
                      Empty
                    </button>
                  )}
                  {item.count > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono transition-opacity ${
                        isSelected ? 'opacity-90 font-semibold' : 'opacity-40 group-hover:opacity-80'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="h-px mx-2" style={{ backgroundColor: 'var(--color-divider)' }} />

        {/* Tag Tree */}
        <TagTree />
      </div>

      {/* Bottom Footer Actions */}
      <div
        className="p-2.5 border-t flex items-center justify-between text-xs select-none"
        style={{ borderColor: 'var(--color-divider)' }}
      >
        <button
          type="button"
          onClick={toggleDarkLight}
          title={`Switch Theme (Current: ${currentTheme.name})`}
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-all text-xs"
        >
          {currentTheme.isDark ? <Moon size={14} /> : <Sun size={14} />}
          <span className="truncate max-w-[90px]">{currentTheme.name.split(' ')[0]}</span>
        </button>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            title="Settings & Themes"
            className="p-1.5 rounded-lg opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-all text-xs"
          >
            <Settings size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
