# 0002: Decompose Note Store along Domain and UI Seams

## Context
`useNoteStore` evolved into a 72-property god store combining canonical note entity CRUD, disk synchronization, dirty note tracking, 3-way merge conflict handling, backup retention, 12 modal/layout toggles, and password encryption. Toggling a modal or drawer forced re-evaluations for note consumers, while filesystem synchronization logic could not be tested without mounting the Zustand store.

## Decision
We decompose `useNoteStore` into three focused boundaries:
1. **`VaultSyncCoordinator`**: A headless domain service (`src/domain/vaultSyncCoordinator.ts`) managing dirty note tracking, debounced disk persistence, 3-way merge conflict detection, and disk change polling. It is entirely decoupled from React and UI components.
2. **`useUIStore`**: A focused Zustand store (`src/store/useUIStore.ts`) holding ephemeral layout booleans, drawer states, and modal visibility flags (`isSidebarOpen`, `isNoteListOpen`, `isInfoDrawerOpen`, `isCommandPaletteOpen`, `isCalendarModalOpen`, `isSettingsOpen`, `isExportModalOpen`, etc.).
3. **`useNoteStore`**: Retains canonical note entities, active note selection, search and filter queries, and session unlock state, delegating sync and conflict resolution to the headless coordinator.

## Consequences
- Ephemeral modal and sidebar toggles no longer cause React re-renders or invalidations in note lists or the editor canvas.
- Vault sync, conflict detection, and dirty tracking can be unit tested headlessly in Node.js without React mocks or store wrappers.
- Note components only subscribe to the state they actually consume.
