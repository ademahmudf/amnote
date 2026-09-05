/**
 * Single source of truth for every global keyboard shortcut bound in
 * `AppLayout`'s keydown handler. Keep this list in sync with that handler —
 * the CheatsheetModal "Keyboard Shortcuts" tab renders directly from it.
 *
 * Audit notes (AppLayout):
 * - `Ctrl+Shift+F` opens the Command Palette (first matching branch wins);
 *   it must NOT also be bound to anything else.
 * - Plain `Ctrl+I` (italic) is editor-level formatting; the global binding is
 *   `Ctrl+Shift+I` (info drawer), so the two do not conflict.
 */
export interface ShortcutEntry {
  id: string;
  keys: string;
  description: string;
}

export const GLOBAL_SHORTCUTS: ShortcutEntry[] = [
  { id: 'new-note', keys: 'Ctrl + N', description: 'Create new note' },
  { id: 'command-palette', keys: 'Ctrl + K / Ctrl + Shift + F', description: 'Open Command Palette & Quick Search' },
  { id: 'toggle-sidebar', keys: 'Ctrl + 1', description: 'Toggle Sidebar navigation' },
  { id: 'toggle-notelist', keys: 'Ctrl + 2', description: 'Toggle Note List panel' },
  { id: 'focus-mode', keys: 'Ctrl + 3 / F11', description: 'Toggle Zen / Focus Mode' },
  { id: 'info-drawer', keys: 'Ctrl + Shift + I', description: 'Toggle Note Inspector (TOC & Stats)' },
  { id: 'calendar', keys: 'Ctrl + Shift + C', description: 'Open Calendar' },
  { id: 'typewriter', keys: 'Ctrl + Shift + T', description: 'Toggle Typewriter Centering Mode' },
  { id: 'duplicate-note', keys: 'Ctrl + D', description: 'Duplicate active note' },
  { id: 'settings', keys: 'Ctrl + ,', description: 'Open Preferences & Settings' },
  { id: 'cheatsheet', keys: 'Ctrl + /', description: 'Open this Cheatsheet Guide' },
  { id: 'bold', keys: 'Ctrl + B', description: 'Format selection as Bold (editor)' },
  { id: 'italic', keys: 'Ctrl + I', description: 'Format selection as Italic (editor)' },
  { id: 'underline', keys: 'Ctrl + U', description: 'Format selection as Underline (editor)' },
  { id: 'close', keys: 'Esc', description: 'Close dialogs / menus' },
];
