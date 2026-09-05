import React, { useEffect, useRef, useState } from 'react';
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
import { CalendarModal } from '../modals/CalendarModal';
import { SettingsModal } from '../modals/SettingsModal';
import { ExportModal } from '../modals/ExportModal';
import { PasswordModal } from '../modals/PasswordModal';
import { EmptyTrashModal } from '../modals/EmptyTrashModal';
import { CheatsheetModal } from '../modals/CheatsheetModal';
import { ConflictDiffModal } from '../modals/ConflictDiffModal';
import { NotificationContainer } from '../ui/NotificationContainer';
import { RoughFilters } from '../ui/AnnotatedText';

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    setMatches(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

const PaneOverlay: React.FC<{ label: string; onClose: () => void; children: React.ReactNode }> = ({
  label,
  onClose,
  children,
}) => (
  <div
    role="dialog"
    aria-modal="true"
    aria-label={label}
    onKeyDown={(e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    }}
    className="absolute inset-0 z-40"
  >
    <button
      type="button"
      aria-label={`Close ${label}`}
      onClick={onClose}
      className="absolute inset-0 bg-black/50 cursor-default"
    />
    <div className="absolute left-0 top-0 bottom-0 shadow-2xl">{children}</div>
  </div>
);

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
  const setCalendarModalOpen = useNoteStore((state) => state.setCalendarModalOpen);
  const setSettingsOpen = useNoteStore((state) => state.setSettingsOpen);
  const setCheatsheetOpen = useNoteStore((state) => state.setCheatsheetOpen);
  const createNote = useNoteStore((state) => state.createNote);
  const duplicateNote = useNoteStore((state) => state.duplicateNote);
  const activeNoteId = useNoteStore((state) => state.activeNoteId);
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

  // Responsive panes: below 1024px the sidebar auto-collapses (one-shot, the
  // user can reopen it via Ctrl+1); below 768px open panes render as overlays.
  const isNarrowSidebar = useMediaQuery('(max-width: 1023px)');
  const isOverlayLayout = useMediaQuery('(max-width: 767px)');

  const prevNarrowRef = useRef(isNarrowSidebar);
  useEffect(() => {
    const wasNarrow = prevNarrowRef.current;
    prevNarrowRef.current = isNarrowSidebar;
    if (!wasNarrow && isNarrowSidebar && !isFocusMode) {
      const { isSidebarOpen: open } = useNoteStore.getState();
      if (open) useNoteStore.getState().toggleSidebar();
    }
  }, [isNarrowSidebar, isFocusMode]);

  // Move keyboard focus into a newly opened pane so shortcuts, Escape, and
  // arrow-key navigation keep working from where the user is.
  const prevPanesRef = useRef({ sidebar: isSidebarOpen, list: isNoteListOpen });
  useEffect(() => {
    const prev = prevPanesRef.current;
    prevPanesRef.current = { sidebar: isSidebarOpen, list: isNoteListOpen };
    if (isFocusMode) return;
    const target =
      !prev.sidebar && isSidebarOpen
        ? 'sidebar'
        : !prev.list && isNoteListOpen
          ? 'notelist'
          : null;
    if (target) {
      requestAnimationFrame(() => {
        document.querySelector<HTMLElement>(`[data-pane="${target}"]`)?.focus({ preventScroll: true });
      });
    }
  }, [isSidebarOpen, isNoteListOpen, isFocusMode]);

  // Global Keyboard Shortcuts (canonical reference: src/utils/shortcuts.ts).
  // NOTE: Ctrl+Shift+F belongs to the Command Palette branch below — do not
  // rebind it further down; the first matching branch wins and later ones
  // become unreachable.
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

      // Ctrl + Shift + C: Calendar
      if (isCtrlOrCmd && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        setCalendarModalOpen(true);
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
    setCalendarModalOpen,
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

      {/* Main 3-Pane Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Pane 1: Sidebar */}
        {isSidebarOpen && !isFocusMode && !isOverlayLayout && <Sidebar />}

        {/* Pane 2: Note List */}
        {isNoteListOpen && !isFocusMode && !isOverlayLayout && <NoteList />}

        {/* Narrow windows: open panes render as dismissible overlays */}
        {isSidebarOpen && !isFocusMode && isOverlayLayout && (
          <PaneOverlay label="Sidebar" onClose={toggleSidebar}>
            <Sidebar />
          </PaneOverlay>
        )}
        {isNoteListOpen && !isFocusMode && isOverlayLayout && (
          <PaneOverlay label="Notes" onClose={toggleNoteList}>
            <NoteList />
          </PaneOverlay>
        )}

        {/* Pane 3: Main Markdown Editor Canvas */}
        <AmEditor />

        {/* Pane 4: Slide-over Inspector */}
        <InfoDrawer />
      </div>

      {/* Modals & Dialogs */}
      <CommandPalette />
      <CalendarModal />
      <SettingsModal />
      <ExportModal />
      <PasswordModal />
      <EmptyTrashModal />
      <CheatsheetModal />
      <NotificationContainer onReviewConflict={setActiveConflictId} />
      <RoughFilters />
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
