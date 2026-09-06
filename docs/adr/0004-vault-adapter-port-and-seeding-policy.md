# 0004: Vault Adapter Port and Seeding Policy

## Context
Previously, `src/db/vaultAdapter.ts` (296 lines) was an ad-hoc singleton object with multiple structural problems:
1. Every method branched on `if (isTauriEnvironment()) ... else throw new Error(...)`, requiring unit tests to globally monkey-patch `vaultAdapter.saveNote` and preventing browser preview mode from operating safely.
2. 120 lines of static markdown guide notes (`initialAmNoteSeed`) and the `is_vault_initialized` check were inlined directly inside `vaultAdapter.loadAllNotes`, mixing low-level filesystem I/O with application onboarding business rules.
3. `VaultSyncCoordinator` declared its own independent 6-method `VaultAdapterPort`, resulting in divergent adapter contracts across the codebase.

## Decision
We deepen `vaultAdapter.ts` into a genuine Hexagonal / Ports-and-Adapters architecture:
1. **Canonical Port Contract (`src/domain/vaultPort.ts`)**: Define a single authoritative `VaultAdapter` interface covering initialization, note CRUD, tag metadata, attachments, backup snapshots, revision tracking, path management, and change subscriptions.
2. **Domain Seeding Policy (`src/domain/seedNotes.ts`)**: Extract `initialAmNoteSeed` and encapsulate the onboarding workflow into a pure domain helper `seedVaultIfFresh(adapter: VaultAdapter, seedNotes?: Note[]): Promise<boolean>`.
3. **Dual Concrete Adapters**:
   - **`TauriVaultAdapter` (`src/db/tauriVaultAdapter.ts`)**: Native IPC adapter executing backend commands and listening to filesystem events in the desktop runtime.
   - **`InMemoryVaultAdapter` (`src/db/inMemoryVaultAdapter.ts`)**: In-memory adapter holding notes, attachments, tag metadata, and virtual paths. Exposes `triggerVaultChanged()` to deterministically simulate external sync changes in tests.
4. **Adapter Factory & Backward Compatibility (`src/db/vaultAdapter.ts`)**: Provide `getDefaultVaultAdapter()` that auto-detects Tauri vs browser/test environments, and export `vaultAdapter` for zero-breakage backward compatibility.
5. **Dependency Injection**: Update `useNoteStore` to support `setVaultAdapter(adapter)` and replace global monkey-patching in `src/test/unit-tests.ts`.

## Consequences
- The low-level adapters are pure I/O conduits completely decoupled from onboarding business content.
- Unit tests can run against an isolated `InMemoryVaultAdapter` without mutating global module exports or requiring a running desktop runtime.
- Browser dev previews and headless CI environments work out of the box with zero runtime errors.
