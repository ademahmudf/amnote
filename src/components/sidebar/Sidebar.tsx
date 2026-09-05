import React from 'react';
import {
  FileText,
  Calendar,
  CheckSquare,
  Tag as TagIcon,
  Archive,
  Trash2,
  Lock,
  CalendarDays,
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
import { AmNoteLogo } from '../icons/AmNoteLogo';
import { promptEmptyTrashConfirmation } from '../../utils/trashConfirmation';
import type { SystemFilter } from '../../types/note';

export const Sidebar: React.FC = () => {
  const notes = useNoteStore((state) => state.notes);
  const activeFilter = useNoteStore((state) => state.activeFilter);
  const setActiveFilter = useNoteStore((state) => state.setActiveFilter);
  const createNote = useNoteStore((state) => state.createNote);
  const getSystemCounts = useNoteStore((state) => state.getSystemCounts);
  const setSettingsOpen = useNoteStore((state) => state.setSettingsOpen);
  const setCommandPaletteOpen = useNoteStore((state) => state.setCommandPaletteOpen);
  const setCalendarModalOpen = useNoteStore((state) => state.setCalendarModalOpen);

  const { toggleDarkLight, getThemeColors } = useThemeStore();
  const currentTheme = getThemeColors();
  const counts = React.useMemo(() => getSystemCounts(), [notes, getSystemCounts]);

  const uiScale = useSettingsStore((state) => state.uiScale);

  const itemTextClass = {
    compact: 'text-[12px] h-[25px] px-2',
    standard: 'text-[13.5px] h-[28px] px-2.5',
    comfortable: 'text-[15px] h-[32px] px-2.5',
    spacious: 'text-[16.5px] h-[36px] px-3',
  }[uiScale] || 'text-[13.5px] h-[28px] px-2.5';

  const iconSize = {
    compact: 13,
    standard: 14,
    comfortable: 15,
    spacious: 16.5,
  }[uiScale] || 14;

  const counterSize = {
    compact: 'text-[9.5px]',
    standard: 'text-[10.5px]',
    comfortable: 'text-[11.5px]',
    spacious: 'text-[12.5px]',
  }[uiScale] || 'text-[10.5px]';

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
      className="w-56 h-full flex flex-col justify-between border-r select-none shrink-0"
      style={{
        backgroundColor: 'var(--bg-sidebar)',
        color: 'var(--text-sidebar)',
        borderColor: 'var(--color-border)',
      }}
    >
      {/* Top Header & Brand */}
      <div className="px-3 py-2 flex items-center justify-between border-b" style={{ borderColor: 'var(--color-divider)' }} data-tauri-drag-region>
        <div className="flex items-center gap-2">
          <AmNoteLogo size={22} variant="dark-circle" />
          <span className="font-bold text-xs tracking-tight" style={{ color: 'var(--text-sidebar-active)' }}>
            AmNote
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCalendarModalOpen(true)}
            title="Calendar (Ctrl+Shift+C)"
            className="p-1 rounded opacity-60 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 transition-all text-xs"
          >
            <CalendarDays size={13} />
          </button>
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
            title="Command Palette (Ctrl+K)"
            className="p-1 rounded opacity-60 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 transition-all text-xs"
          >
            <Command size={13} />
          </button>
          <button
            type="button"
            onClick={() => createNote()}
            title="New Note (Ctrl+N)"
            className="p-1 rounded opacity-80 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 transition-all text-xs"
            style={{
              backgroundColor: 'var(--color-accent)',
              color: 'var(--color-accent-text)',
            }}
          >
            <Plus size={13} />
          </button>
        </div>
      </div>

      {/* Main Navigation Scroll Area */}
      <div className="flex-1 overflow-y-auto px-1.5 py-1.5 space-y-1">
        {/* System Views */}
        <div className="flex flex-col space-y-0">
          {systemItems.map((item) => {
            const Icon = item.icon;
            const isSelected = activeFilter === item.id;
            return (
              <div
                key={item.id}
                onClick={() => setActiveFilter(item.id)}
                className={`group flex items-center justify-between rounded-md font-medium cursor-pointer transition-all duration-100 ${itemTextClass} ${
                  isSelected
                    ? 'shadow-xs font-semibold'
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
                  <div className="flex items-center justify-center shrink-0">
                    <Icon size={iconSize} className={isSelected ? 'text-accent' : 'opacity-70'} />
                  </div>
                  <span className="truncate">{item.label}</span>
                </div>

                <div className="flex items-center gap-1">
                  {item.id === 'trash' && counts.trash > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        promptEmptyTrashConfirmation();
                      }}
                      title="Empty Trash"
                      className={`text-[9px] px-1 py-0.2 rounded bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 transition-all ${
                        isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      Empty
                    </button>
                  )}
                  {item.count > 0 && (
                    <span
                      className={`${counterSize} px-1.5 py-0.2 rounded-full font-mono transition-opacity ${
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

        {/* Tag Tree */}
        <div className="pt-1">
          <TagTree />
        </div>
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
