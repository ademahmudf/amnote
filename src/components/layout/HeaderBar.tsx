import React, { useState } from 'react';
import {
  Sidebar as SidebarIcon,
  Columns2,
  Maximize2,
  Minimize2,
  Search,
  Settings,
  Sparkles,
  HelpCircle,
  Info,
  FileText,
  Pin,
  Lock,
} from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useNoteStore } from '../../store/useNoteStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useThemeStore } from '../../store/useThemeStore';
import { resolveTagIcon, formatTagDisplay } from '../../utils/tagIcons';
import { AnnotatedText } from '../ui/AnnotatedText';

export const HeaderBar: React.FC = () => {
  const isSidebarOpen = useNoteStore((state) => state.isSidebarOpen);
  const toggleSidebar = useNoteStore((state) => state.toggleSidebar);
  const isNoteListOpen = useNoteStore((state) => state.isNoteListOpen);
  const toggleNoteList = useNoteStore((state) => state.toggleNoteList);
  const isFocusMode = useNoteStore((state) => state.isFocusMode);
  const toggleFocusMode = useNoteStore((state) => state.toggleFocusMode);
  const setCommandPaletteOpen = useNoteStore((state) => state.setCommandPaletteOpen);
  const setSettingsOpen = useNoteStore((state) => state.setSettingsOpen);
  const setCheatsheetOpen = useNoteStore((state) => state.setCheatsheetOpen);
  const isInfoDrawerOpen = useNoteStore((state) => state.isInfoDrawerOpen);
  const toggleInfoDrawer = useNoteStore((state) => state.toggleInfoDrawer);
  const activeNote = useNoteStore((state) => state.getActiveNote());
  const selectedTag = useNoteStore((state) => state.selectedTag);
  const activeFilter = useNoteStore((state) => state.activeFilter);

  const tagIcons = useSettingsStore((state) => state.tagIcons);
  const tagColors = useSettingsStore((state) => state.tagColors);

  const primaryTag = selectedTag || activeNote?.tags?.[0];
  const customTagIcon = primaryTag ? tagIcons[primaryTag] : undefined;
  const customTagColor = primaryTag ? tagColors[primaryTag] : undefined;
  const TagIconComp = primaryTag ? resolveTagIcon(primaryTag, customTagIcon) : FileText;

  const { getThemeColors } = useThemeStore();
  const currentTheme = getThemeColors();

  const [isMac] = useState(() => {
    if (typeof navigator !== 'undefined') {
      const platform = navigator.platform || '';
      const ua = navigator.userAgent || '';
      return /Mac|iPhone|iPod|iPad/i.test(platform) || /Mac/i.test(ua);
    }
    return false;
  });

  const handleToggleMaximize = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const appWindow = getCurrentWindow();
      await appWindow.toggleMaximize();
    } catch (err) {
      console.warn('Window toggleMaximize not available:', err);
    }
  };

  const handleDragMouseDown = (e: React.MouseEvent) => {
    // Only drag when left clicking directly on a drag-region
    if (e.button === 0) {
      const target = e.target as HTMLElement;
      if (
        target === e.currentTarget ||
        target.hasAttribute('data-tauri-drag-region') ||
        target.classList.contains('drag-handle')
      ) {
        try {
          const appWindow = getCurrentWindow();
          appWindow.startDragging();
        } catch {
          // ignore outside tauri runtime
        }
      }
    }
  };

  // macOS header is 41px (40px content + 1px border) so the 26px toggle buttons
  // centre at y=20 — same centre as the native traffic lights, which AppKit puts
  // at (trafficLightPosition.y - 9) with a 14px frame. Keep the two values in sync.
  return (
    <div
      data-tauri-drag-region
      onMouseDown={handleDragMouseDown}
      onDoubleClick={handleToggleMaximize}
      className={`${isMac ? 'h-[41px]' : 'h-10'} border-b flex items-center justify-between px-3 select-none shrink-0 relative cursor-default`}
      style={{
        backgroundColor: 'var(--bg-sidebar)',
        color: 'var(--text-sidebar)',
        borderColor: 'var(--color-divider)',
      }}
    >
      {/* Left: Window Dots on macOS, Clean layout on Linux */}
      <div className="flex items-center gap-2" data-tauri-drag-region>
        {/* On macOS: Provide dedicated spacing for the native macOS traffic lights */}
        {isMac && (
          <div className="w-20 shrink-0 pointer-events-none" data-tauri-drag-region />
        )}

        {/* View toggles */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={toggleSidebar}
            title="Toggle Sidebar (Ctrl+1)"
            className={`p-1.5 rounded-lg text-xs transition-all ${
              isSidebarOpen
                ? 'bg-black/10 dark:bg-white/10 opacity-100'
                : 'opacity-50 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <SidebarIcon size={14} />
          </button>

          <button
            type="button"
            onClick={toggleNoteList}
            title="Toggle Note List (Ctrl+2)"
            className={`p-1.5 rounded-lg text-xs transition-all ${
              isNoteListOpen
                ? 'bg-black/10 dark:bg-white/10 opacity-100'
                : 'opacity-50 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <Columns2 size={14} />
          </button>


          <button
            type="button"
            onClick={toggleFocusMode}
            title="Toggle Focus / Zen Mode (Ctrl+3 or F11)"
            className={`p-1.5 rounded-lg text-xs transition-all ${
              isFocusMode
                ? 'bg-accent text-white'
                : 'opacity-50 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
            }`}
            style={{
              backgroundColor: isFocusMode ? 'var(--color-accent)' : undefined,
              color: isFocusMode ? 'var(--color-accent-text)' : undefined,
            }}
          >
            {isFocusMode ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>

      {/* Center: Note Breadcrumb / Search launcher */}
      <div className="flex-1 flex justify-center px-4" data-tauri-drag-region>
        <button
          type="button"
          onClick={() => setCommandPaletteOpen(true)}
          className="flex items-center gap-2 px-3 py-1 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent hover:border-border/60 transition-all text-xs opacity-85 hover:opacity-100 max-w-md w-full justify-between group shadow-2xs"
        >
          {activeNote ? (
            <div className="flex items-center gap-1.5 min-w-0 overflow-hidden text-left">
              {activeNote.isPinned && (
                <Pin size={11} className="text-accent fill-current shrink-0" style={{ color: 'var(--color-accent)' }} />
              )}
              {activeNote.isLocked && (
                <Lock size={12} className="text-amber-400 shrink-0" />
              )}
              <TagIconComp
                size={13}
                className="shrink-0 transition-colors"
                style={{ color: customTagColor || (primaryTag ? 'var(--color-accent)' : undefined) }}
              />
              <span className="opacity-60 shrink-0 font-medium text-[11.5px]">
                {primaryTag ? formatTagDisplay(primaryTag) : activeFilter ? activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1) : 'Notes'}
              </span>
              <span className="opacity-40 shrink-0">/</span>
              <span className="font-semibold truncate text-[12px] min-w-0" style={{ color: 'var(--text-sidebar-active)' }}>
                <AnnotatedText variant="wavy" color="text-accent" className="max-w-[200px] truncate inline-block">
                  {activeNote.title || 'Untitled'}
                </AnnotatedText>
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Search size={12} className="opacity-60" />
              <span className="truncate">Search notes & commands...</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 shrink-0 pl-2">
            <kbd className="text-[10px] px-1.5 py-0.2 rounded bg-black/10 dark:bg-white/10 font-mono opacity-60 group-hover:opacity-100 transition-opacity">
              Ctrl+K
            </kbd>
          </div>
        </button>
      </div>

      {/* Right: Theme pill & settings */}
      <div className="flex items-center gap-2" data-tauri-drag-region>
        <div
          onClick={() => setSettingsOpen(true)}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium cursor-pointer hover:opacity-80 transition-opacity"
          style={{
            backgroundColor: 'var(--color-tag-bg)',
            color: 'var(--color-tag-text)',
          }}
        >
          <Sparkles size={11} />
          <span>{currentTheme.name.split(' ')[0]}</span>
        </div>

        <button
          type="button"
          onClick={toggleInfoDrawer}
          title="Note Stats & Info (Ctrl+Shift+I)"
          className={`p-1.5 rounded-lg text-xs transition-all ${
            isInfoDrawerOpen
              ? 'bg-accent text-white'
              : 'opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
          }`}
          style={{
            backgroundColor: isInfoDrawerOpen ? 'var(--color-accent)' : undefined,
            color: isInfoDrawerOpen ? 'var(--color-accent-text)' : undefined,
          }}
        >
          <Info size={14} />
        </button>

        <button
          type="button"
          onClick={() => setCheatsheetOpen(true)}
          title="Markdown & Keyboard Cheatsheet (Ctrl+/)"
          className="p-1.5 rounded-lg opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-all text-xs"
        >
          <HelpCircle size={14} />
        </button>

        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          title="Settings (Ctrl+,)"
          className="p-1.5 rounded-lg opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-all text-xs"
        >
          <Settings size={14} />
        </button>
      </div>
    </div>
  );
};
