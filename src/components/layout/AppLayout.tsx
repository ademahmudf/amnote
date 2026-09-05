import React, { useEffect, useState } from 'react';
import { useNoteStore } from '../../store/useNoteStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useThemeStore, applyThemeCssVariables } from '../../store/useThemeStore';
import { vaultAdapter } from '../../db/vaultAdapter';
import { HeaderBar } from './HeaderBar';
import { Sidebar } from '../sidebar/Sidebar';
import { NoteList } from '../notelist/NoteList';
import { AmEditor } from '../../editor/AmEditor';
import { InfoDrawer } from '../inspector/InfoDrawer';
import { CommandPalette } from '../modals/CommandPalette';
import { SettingsModal } from '../modals/SettingsModal';
import { ExportModal } from '../modals/ExportModal';
import { PasswordModal } from '../modals/PasswordModal';
import { CheatsheetModal } from '../modals/CheatsheetModal';
import { ConflictDiffModal } from '../modals/ConflictDiffModal';
import { NotificationContainer } from '../ui/NotificationContainer';

export const AppLayout: React.FC = () => {
  const init = useNoteStore((state) => state.init);
  const syncIfVaultChanged = useNoteStore((state) => state.syncIfVaultChanged);
  const isLoading = useNoteStore((state) => state.isLoading);
  const isSidebarOpen = useNoteStore((state) => state.isSidebarOpen);
  const isNoteListOpen = useNoteStore((state) => state.isNoteListOpen);
  const isFocusMode = useNoteStore((state) => state.isFocusMode);
  const toggleSidebar = useNoteStore((state) => state.toggleSidebar);
  const toggleNoteList = useNoteStore((state) => state.toggleNoteList);
  const toggleFocusMode = useNoteStore((state) => state.toggleFocusMode);
  const toggleInfoDrawer = useNoteStore((state) => state.toggleInfoDrawer);
  const setCommandPaletteOpen = useNoteStore((state) => state.setCommandPaletteOpen);
  const setSettingsOpen = useNoteStore((state) => state.setSettingsOpen);
  const setCheatsheetOpen = useNoteStore((state) => state.setCheatsheetOpen);
  const createNote = useNoteStore((state) => state.createNote);
  const duplicateNote = useNoteStore((state) => state.duplicateNote);
  const activeNoteId = useNoteStore((state) => state.activeNoteId);
  const persistenceError = useNoteStore((state) => state.persistenceError);
  const clearPersistenceError = useNoteStore((state) => state.clearPersistenceError);
  const vaultConflicts = useNoteStore((state) => state.vaultConflicts);
  const resolveVaultConflict = useNoteStore((state) => state.resolveVaultConflict);
  const [activeConflictId, setActiveConflictId] = useState<string | null>(null);

  const { getThemeColors } = useThemeStore();

  // Initialize DB and theme
  useEffect(() => {
    init();
    applyThemeCssVariables(getThemeColors());
  }, [init, getThemeColors]);

  // Poll the lightweight vault fingerprint so external editors and sync tools
  // are reflected without requiring the user to press reload.
  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState !== 'hidden') {
        void syncIfVaultChanged();
      }
    }, 2500);

    return () => window.clearInterval(interval);
  }, [syncIfVaultChanged]);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let cancelled = false;

    vaultAdapter.onVaultChanged(() => {
      void syncIfVaultChanged();
    }).then((cleanup) => {
      if (cancelled) cleanup();
      else unsubscribe = cleanup;
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [syncIfVaultChanged]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void syncIfVaultChanged();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [syncIfVaultChanged]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      // Ctrl + K or Ctrl + Shift + F: Command Palette
      if ((isCtrlOrCmd && e.key.toLowerCase() === 'k') || (isCtrlOrCmd && e.shiftKey && e.key.toLowerCase() === 'f')) {
        e.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }

      // Ctrl + N: New Note
      if (isCtrlOrCmd && e.key.toLowerCase() === 'n' && !e.shiftKey) {
        e.preventDefault();
        createNote();
        return;
      }

      // Ctrl + 1: Toggle Sidebar
      if (isCtrlOrCmd && e.key === '1') {
        e.preventDefault();
        toggleSidebar();
        return;
      }

      // Ctrl + 2: Toggle Note List
      if (isCtrlOrCmd && e.key === '2') {
        e.preventDefault();
        toggleNoteList();
        return;
      }

      // Ctrl + 3 or F11: Focus Mode
      if ((isCtrlOrCmd && e.key === '3') || e.key === 'F11') {
        e.preventDefault();
        toggleFocusMode();
        return;
      }

      // Ctrl + Shift + I: Toggle Info Drawer
      if (isCtrlOrCmd && e.shiftKey && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        toggleInfoDrawer();
        return;
      }

      // Ctrl + Shift + T: Toggle Typewriter Mode
      if (isCtrlOrCmd && e.shiftKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        const { typewriterMode, setTypewriterMode } = useSettingsStore.getState();
        setTypewriterMode(!typewriterMode);
        return;
      }

      // Ctrl + D: Duplicate Active Note
      if (isCtrlOrCmd && e.key.toLowerCase() === 'd' && !e.shiftKey) {
        if (activeNoteId) {
          e.preventDefault();
          duplicateNote(activeNoteId);
        }
        return;
      }

      // Ctrl + ,: Settings
      if (isCtrlOrCmd && e.key === ',') {
        e.preventDefault();
        setSettingsOpen(true);
        return;
      }

      // Ctrl + / or ?: Cheatsheet
      if ((isCtrlOrCmd && e.key === '/') || (e.key === '?' && !e.ctrlKey && !e.metaKey && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA' && !document.activeElement?.classList.contains('ProseMirror'))) {
        e.preventDefault();
        setCheatsheetOpen(true);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    createNote,
    duplicateNote,
    activeNoteId,
    toggleSidebar,
    toggleNoteList,
    toggleFocusMode,
    toggleInfoDrawer,
    setCommandPaletteOpen,
    setSettingsOpen,
    setCheatsheetOpen,
  ]);

  if (isLoading) {
    return (
      <div
        className="w-screen h-screen flex flex-col items-center justify-center select-none"
        style={{
          backgroundColor: 'var(--bg-editor)',
          color: 'var(--text-editor)',
        }}
      >
        <div className="text-3xl mb-3 animate-bounce">ʕ•ᴥ•ʔ</div>
        <div className="text-sm font-semibold tracking-wide">Loading AmNote...</div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden font-sans">
      {/* Top Window Titlebar */}
      <HeaderBar />

      {persistenceError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 px-4 py-2 text-sm"
          style={{ backgroundColor: '#dc2626', color: '#ffffff' }}
        >
          <span className="truncate">{persistenceError}</span>
          <button type="button" onClick={clearPersistenceError} className="shrink-0 underline">
            Dismiss
          </button>
        </div>
      )}

      {vaultConflicts.map((conflict) => (
        <div
          key={conflict.noteId}
          role="alert"
          className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2 text-sm"
          style={{ backgroundColor: '#d97706', color: '#ffffff' }}
        >
          <span className="min-w-0 flex-1 truncate">
            <strong className="font-semibold">{conflict.title}</strong> changed in AmNote and on disk. Choose which version to keep.
          </span>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              className="rounded px-2 py-1 underline hover:opacity-90"
              onClick={() => setActiveConflictId(conflict.noteId)}
            >
              Review changes
            </button>
          </div>
        </div>
      ))}

      {/* Main 3-Pane Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Pane 1: Sidebar */}
        {isSidebarOpen && !isFocusMode && <Sidebar />}

        {/* Pane 2: Note List */}
        {isNoteListOpen && !isFocusMode && <NoteList />}

        {/* Pane 3: Main Markdown Editor Canvas */}
        <AmEditor />

        {/* Pane 4: Slide-over Inspector */}
        <InfoDrawer />
      </div>

      {/* Modals & Dialogs */}
      <CommandPalette />
      <SettingsModal />
      <ExportModal />
      <PasswordModal />
      <CheatsheetModal />
      <NotificationContainer />
      {(() => {
        const activeConflict = vaultConflicts.find(
          (conflict) => conflict.noteId === activeConflictId
        );
        if (!activeConflict) return null;

        return (
          <ConflictDiffModal
            conflict={activeConflict}
            onResolve={(resolution) => {
              setActiveConflictId(null);
              resolveVaultConflict(activeConflict.noteId, resolution);
            }}
            onClose={() => setActiveConflictId(null)}
          />
        );
      })()}
    </div>
  );
};
