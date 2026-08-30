import React, { useState, useEffect } from 'react';
import {
  Sidebar as SidebarIcon,
  Columns2,
  Maximize2,
  Minimize2,
  Search,
  Settings,
  Sparkles,
  HelpCircle,
  X,
  Minus,
  Square,
} from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useNoteStore } from '../../store/useNoteStore';
import { useThemeStore } from '../../store/useThemeStore';

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

  const { getThemeColors } = useThemeStore();
  const currentTheme = getThemeColors();

  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      const platform = navigator.platform || '';
      const ua = navigator.userAgent || '';
      setIsMac(/Mac|iPhone|iPod|iPad/i.test(platform) || /Mac/i.test(ua));
    }
  }, []);

  const handleMinimize = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const appWindow = getCurrentWindow();
      await appWindow.minimize();
    } catch (err) {
      console.warn('Window minimize not available:', err);
    }
  };

  const handleToggleMaximize = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const appWindow = getCurrentWindow();
      await appWindow.toggleMaximize();
    } catch (err) {
      console.warn('Window toggleMaximize not available:', err);
    }
  };

  const handleClose = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const appWindow = getCurrentWindow();
      await appWindow.close();
    } catch (err) {
      console.warn('Window close not available:', err);
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

  return (
    <div
      data-tauri-drag-region
      onMouseDown={handleDragMouseDown}
      onDoubleClick={handleToggleMaximize}
      className="h-10 border-b flex items-center justify-between px-3 select-none shrink-0 relative cursor-default"
      style={{
        backgroundColor: 'var(--bg-sidebar)',
        color: 'var(--text-sidebar)',
        borderColor: 'var(--color-divider)',
      }}
    >
      {/* Left: Window Dots & Layout controls */}
      <div className="flex items-center gap-2" data-tauri-drag-region>
        {/* On macOS: Provide dedicated spacing for the native macOS traffic lights */}
        {isMac ? (
          <div className="w-16 shrink-0 pointer-events-none" data-tauri-drag-region />
        ) : (
          /* Non-macOS: Interactive traffic light buttons */
          <div className="flex items-center gap-1.5 mr-2 group/dots">
            <button
              type="button"
              onClick={handleClose}
              title="Close window"
              className="w-3 h-3 rounded-full bg-rose-500/90 hover:bg-rose-600 transition-transform active:scale-90 flex items-center justify-center cursor-pointer shadow-sm"
            >
              <X size={7} className="text-black/80 dark:text-white/80 opacity-0 group-hover/dots:opacity-100 transition-opacity" />
            </button>
            <button
              type="button"
              onClick={handleMinimize}
              title="Minimize window"
              className="w-3 h-3 rounded-full bg-amber-500/90 hover:bg-amber-600 transition-transform active:scale-90 flex items-center justify-center cursor-pointer shadow-sm"
            >
              <Minus size={7} className="text-black/80 dark:text-white/80 opacity-0 group-hover/dots:opacity-100 transition-opacity" />
            </button>
            <button
              type="button"
              onClick={handleToggleMaximize}
              title="Maximize / Restore window"
              className="w-3 h-3 rounded-full bg-emerald-500/90 hover:bg-emerald-600 transition-transform active:scale-90 flex items-center justify-center cursor-pointer shadow-sm"
            >
              <Square size={6} className="text-black/80 dark:text-white/80 opacity-0 group-hover/dots:opacity-100 transition-opacity" />
            </button>
          </div>
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

      {/* Center: App Title / Search launcher */}
      <div className="flex-1 flex justify-center px-4" data-tauri-drag-region>
        <button
          type="button"
          onClick={() => setCommandPaletteOpen(true)}
          className="flex items-center gap-2 px-3 py-1 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent hover:border-border/60 transition-all text-xs opacity-75 hover:opacity-100 max-w-sm w-full justify-between"
        >
          <div className="flex items-center gap-2">
            <Search size={12} className="opacity-60" />
            <span className="truncate">Search notes & commands...</span>
          </div>
          <kbd className="text-[10px] px-1.5 py-0.2 rounded bg-black/10 dark:bg-white/10 font-mono opacity-60 shrink-0">
            Ctrl+K
          </kbd>
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
