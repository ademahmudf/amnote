# 0003: Decompose Rich Text Editor Canvas

## Context
`AmEditor.tsx` grew into a 1,024-line orchestrator that directly inlined multiple foreign visual sub-systems:
- A 93-line fullscreen image Lightbox modal with zoom, pan, copy, and download controls.
- A 71-line password lock overlay screen with input refs, error shaking, and lock settings openers.
- A 96-line bottom status bar displaying word metrics, reading time, word goal progress, focus mode cycler, typewriter mode button, and lock status.
- A shallow hook `useEditorMenuState.ts` exporting 14 discrete getters and setters with zero behavior, while ~150 lines of cursor coordinate math and ProseMirror text inspection (`/` slash menu, `[[` wiki link autocomplete, bubble menu) were smeared across `useEditor` event handlers.

## Decision
We decompose `AmEditor.tsx` into clean, single-responsibility sub-components and a deepened suggestion coordinator:
1. **`EditorLightbox`** (`src/editor/components/EditorLightbox.tsx`): Dedicated fullscreen image preview modal with zoom/reset, clipboard copy, disk save, and keyboard/backdrop dismissal.
2. **`EditorLockScreen`** (`src/editor/components/EditorLockScreen.tsx`): Dedicated password unlock presentation screen with password validation, error display, and lock settings modal trigger.
3. **`EditorStatusBar`** (`src/editor/components/EditorStatusBar.tsx`): Dedicated bottom status bar displaying note metrics (word/character counts, estimated reading time), word goal completion indicator, focus mode cycler, typewriter mode toggle, and lock status.
4. **`EditorSuggestions`** (`src/editor/components/EditorSuggestions.tsx`): Deepened floating suggestion overlay encapsulating slash command menus, wiki link autocomplete, floating bubble toolbar, and editor date picker positioning without exposing raw setter soup to `AmEditor`.

## Consequences
- `AmEditor.tsx` reduces from ~1,024 lines to ~400 lines, focused solely on TipTap canvas lifecycle and content persistence.
- Modals, lock forms, and status bar elements can be rendered and tested in isolation without mounting the entire TipTap editor state.
- Floating menu triggers and viewport coordinate calculations are localized in the suggestion sub-system.
