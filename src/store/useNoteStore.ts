import { create } from 'zustand';
import {
  extractTagsFromContent,
  extractWikiLinksFromContent,
} from '../domain/markdownMetadata';
import {
  mergeVaultNotes,
  type VaultConflict,
} from '../domain/vaultSync';
import { noteSearchIndex } from '../domain/searchIndex';
import { vaultAdapter } from '../db/vaultAdapter';
import type { BacklinkItem, HeadingItem, Note, NoteStats, SortOption, SystemFilter, TagNodeItem } from '../types/note';

interface NoteState {
  notes: Note[];
  activeNoteId: string | null;
  activeFilter: SystemFilter | null;
  selectedTag: string | null;
  searchQuery: string;
  sortOption: SortOption;
  vaultPath: string;
  vaultRevision: string | null;
  vaultConflicts: VaultConflict[];
  dirtyNoteIds: Record<string, true>;
  
  // Layout toggles
  isSidebarOpen: boolean;
  isNoteListOpen: boolean;
  isFocusMode: boolean;
  isInfoDrawerOpen: boolean;
  isCommandPaletteOpen: boolean;
  isSettingsOpen: boolean;
  isExportModalOpen: boolean;
  isCheatsheetOpen: boolean;
  isPasswordModalOpen: boolean;
  passwordModalNoteId: string | null;
  
  // Session unlock tracking
  unlockedNotes: Record<string, boolean>;
  
  // Computed & helper getters
  isLoading: boolean;
  persistenceError: string | null;
  isSyncingVault: boolean;
  editorReloadToken: number;
  
  // Actions
  init: () => Promise<void>;
  loadNotes: () => Promise<void>;
  reloadFromDisk: () => Promise<void>;
  syncIfVaultChanged: () => Promise<boolean>;
  resolveVaultConflict: (
    noteId: string,
    resolution: 'local' | 'disk' | 'both'
  ) => Promise<void>;
  openVaultInFileManager: () => Promise<void>;
  pickAndChangeVault: () => Promise<boolean>;
  setCustomVaultPath: (newPath: string) => Promise<void>;
  resetVaultToDefault: () => Promise<void>;
  setActiveNoteId: (id: string | null) => void;
  setActiveFilter: (filter: SystemFilter) => void;
  setSelectedTag: (tag: string | null) => void;
  setSearchQuery: (query: string) => void;
  setSortOption: (option: SortOption) => void;
  clearPersistenceError: () => void;
  
  toggleSidebar: () => void;
  toggleNoteList: () => void;
  toggleFocusMode: () => void;
  toggleInfoDrawer: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setExportModalOpen: (open: boolean) => void;
  setCheatsheetOpen: (open: boolean) => void;
  setPasswordModalOpen: (open: boolean, noteId?: string | null) => void;
  
  createNote: (initialTag?: string, initialTitle?: string) => Promise<string>;
  updateNote: (id: string, updates: Partial<Note>) => Promise<void>;
  updateNoteContent: (id: string, content: string, contentJson?: string, persistToDisk?: boolean) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
  toggleArchive: (id: string) => Promise<void>;
  trashNote: (id: string) => Promise<void>;
  restoreNote: (id: string) => Promise<void>;
  deletePermanently: (id: string) => Promise<void>;
  duplicateNote: (id: string) => Promise<string>;
  emptyTrash: () => Promise<void>;
  
  // Lock actions
  lockNote: (id: string, password?: string) => Promise<void>;
  unlockNote: (id: string, password?: string) => Promise<boolean>;
  relockNote: (id: string) => void;
  removeLock: (id: string) => Promise<void>;
  isNoteUnlocked: (id: string) => boolean;
  
  // Computed helpers
  getActiveNote: () => Note | undefined;
  getFilteredNotes: () => Note[];
  getTagTree: () => TagNodeItem[];
  getSystemCounts: () => Record<SystemFilter, number>;
  getBacklinks: (noteId: string) => BacklinkItem[];
  getNoteStats: (noteId: string) => NoteStats;
  getHeadings: (noteId: string) => HeadingItem[];
}

async function hashPassword(pwd: string): Promise<string> {
  if (!pwd) return '';
  try {
    const msgUint8 = new TextEncoder().encode(pwd);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return btoa(pwd);
  }
}

function persistenceMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error) return error;
  return fallback;
}

function isSaveConflict(error: unknown): boolean {
  return error instanceof Error && error.message.startsWith('CONFLICT:');
}

function newNoteId(): string {
  return `note-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
}

// Helper to extract a clean title from markdown
function extractTitleFromContent(content: string): string {
  const lines = content.trim().split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const titleMatch = trimmed.match(/^#+\s*(.*)$/);
    if (titleMatch && titleMatch[1].trim()) {
      return titleMatch[1].trim();
    }
    return trimmed;
  }
  return 'Untitled Note';
}

export const useNoteStore = create<NoteState>((set, get) => ({
  notes: [],
  activeNoteId: null,
  activeFilter: 'notes',
  selectedTag: null,
  searchQuery: '',
  sortOption: 'updated-desc',
  vaultPath: '~/Documents/AmNotes',
  vaultRevision: null,
  vaultConflicts: [],
  
  isSidebarOpen: true,
  isNoteListOpen: true,
  isFocusMode: false,
  isInfoDrawerOpen: false,
  isCommandPaletteOpen: false,
  isSettingsOpen: false,
  isExportModalOpen: false,
  isCheatsheetOpen: false,
  isPasswordModalOpen: false,
  passwordModalNoteId: null,
  
  unlockedNotes: {},
  dirtyNoteIds: {},
  isLoading: true,
  persistenceError: null,
  isSyncingVault: false,
  editorReloadToken: 0,

  init: async () => {
    try {
      const vaultPath = await vaultAdapter.getVaultPath();
      const allNotes = await vaultAdapter.loadAllNotes();
      allNotes.sort((a, b) => b.updatedAt - a.updatedAt);

      set({
        vaultPath,
        notes: allNotes,
        activeNoteId: allNotes.length > 0 ? allNotes[0].id : null,
        isLoading: false,
        persistenceError: null,
        vaultRevision: await vaultAdapter.getVaultRevision(),
        dirtyNoteIds: {},
        vaultConflicts: [],
      });
    } catch (err) {
      console.error('Failed to initialize vault:', err);
      set({
        isLoading: false,
        persistenceError: persistenceMessage(err, 'Unable to open the notes vault.'),
      });
    }
  },

  loadNotes: async () => {
    const allNotes = await vaultAdapter.loadAllNotes();
    allNotes.sort((a, b) => b.updatedAt - a.updatedAt);
    const merged = mergeVaultNotes({
      localNotes: get().notes,
      diskNotes: allNotes,
      dirtyNoteIds: get().dirtyNoteIds,
    });

    set({
      notes: merged.notes,
      vaultConflicts: merged.conflicts,
      activeNoteId: allNotes.length > 0 && !get().activeNoteId ? allNotes[0].id : get().activeNoteId,
    });
  },

  reloadFromDisk: async () => {
    const allNotes = await vaultAdapter.loadAllNotes();
    allNotes.sort((a, b) => b.updatedAt - a.updatedAt);
    const merged = mergeVaultNotes({
      localNotes: get().notes,
      diskNotes: allNotes,
      dirtyNoteIds: get().dirtyNoteIds,
    });

    set({
      notes: merged.notes,
      vaultConflicts: merged.conflicts,
      vaultRevision: await vaultAdapter.getVaultRevision(),
    });
  },

  syncIfVaultChanged: async () => {
    if (get().isSyncingVault) return false;

    set({ isSyncingVault: true });
    try {
      const revision = await vaultAdapter.getVaultRevision();
      if (get().vaultRevision === revision) {
        return false;
      }

      const allNotes = await vaultAdapter.loadAllNotes();
      allNotes.sort((a, b) => b.updatedAt - a.updatedAt);
      const merged = mergeVaultNotes({
        localNotes: get().notes,
        diskNotes: allNotes,
        dirtyNoteIds: Object.fromEntries(
          Object.keys(get().dirtyNoteIds).map((id) => [id, true as const])
        ),
      });
      const activeNoteExists = merged.notes.some((note) => note.id === get().activeNoteId);

      set({
        notes: merged.notes,
        vaultConflicts: merged.conflicts,
        vaultRevision: revision,
        activeNoteId: activeNoteExists
          ? get().activeNoteId
          : allNotes.length > 0
            ? allNotes[0].id
            : null,
      });
      return true;
    } catch (err) {
      console.error('Failed to sync vault:', err);
      set({ persistenceError: persistenceMessage(err, 'Unable to synchronize vault changes.') });
      return false;
    } finally {
      set({ isSyncingVault: false });
    }
  },

  resolveVaultConflict: async (noteId, resolution) => {
    const conflict = get().vaultConflicts.find((item) => item.noteId === noteId);
    if (!conflict) return;

    // A conflict resolution intentionally discards one representation, so both
    // sides are preserved before any destructive action.
    try {
      await vaultAdapter.backupNoteVersion(conflict.localNote, 'local');
      if (conflict.diskNote) {
        await vaultAdapter.backupNoteVersion(conflict.diskNote, 'disk');
      }
    } catch (err) {
      console.error('Failed to back up conflicting note versions:', err);
      set({
        persistenceError: persistenceMessage(err, 'Unable to back up the conflicting versions.'),
      });
      return;
    }

    const clearConflict = (state: NoteState) => ({
      dirtyNoteIds: Object.fromEntries(
        Object.entries(state.dirtyNoteIds).filter(([dirtyId]) => dirtyId !== noteId)
      ),
      vaultConflicts: state.vaultConflicts.filter((item) => item.noteId !== noteId),
    });

    if (resolution === 'local') {
      try {
        await vaultAdapter.saveNote(
          conflict.localNote,
          conflict.diskNote?.content
        );
      } catch (err) {
        console.error('Failed to resolve vault conflict with local version:', err);
        set({
          persistenceError: persistenceMessage(err, 'Unable to keep the local version.'),
        });
        return;
      }

      const vaultRevision = await vaultAdapter.getVaultRevision();
      set((state) => ({
        notes: state.notes.map((note) =>
          note.id === noteId ? conflict.localNote : note
        ),
        ...clearConflict(get()),
        vaultRevision,
      }));
      return;
    }

    if (resolution === 'disk') {
      if (!conflict.diskNote) return;

      set((state) => ({
        notes: state.notes.flatMap((note) =>
          note.id === noteId ? [conflict.diskNote as Note] : [note]
        ),
        ...clearConflict(get()),
        editorReloadToken: state.editorReloadToken + 1,
      }));
      return;
    }

    if (!conflict.diskNote) {
      await get().resolveVaultConflict(noteId, 'local');
      return;
    }

    const localCopy: Note = {
      ...conflict.localNote,
      id: newNoteId(),
      title: `${conflict.localNote.title} (local copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    try {
      await vaultAdapter.saveNote(localCopy, conflict.localNote.content);
    } catch (err) {
      console.error('Failed to save local conflict copy:', err);
      set({
        persistenceError: persistenceMessage(err, 'Unable to keep both versions.'),
      });
      return;
    }

    const vaultRevision = await vaultAdapter.getVaultRevision();

    set((state) => ({
      notes: [
        conflict.diskNote as Note,
        localCopy,
        ...state.notes.filter((note) => note.id !== noteId),
      ],
      ...clearConflict(get()),
      editorReloadToken: state.editorReloadToken + 1,
      vaultRevision,
    }));
  },

  openVaultInFileManager: async () => {
    await vaultAdapter.openVaultInFileManager();
  },

  pickAndChangeVault: async () => {
    const selected = await vaultAdapter.pickVaultFolder();
    if (selected) {
      await get().setCustomVaultPath(selected);
      return true;
    }
    return false;
  },

  setCustomVaultPath: async (newPath: string) => {
    set({ isLoading: true });
    try {
      const activePath = await vaultAdapter.setVaultPath(newPath);
      const allNotes = await vaultAdapter.loadAllNotes();
      allNotes.sort((a, b) => b.updatedAt - a.updatedAt);
      set({
        vaultPath: activePath,
        notes: allNotes,
        activeNoteId: allNotes.length > 0 ? allNotes[0].id : null,
        isLoading: false,
      });
    } catch (err) {
      console.error('Failed to change vault path:', err);
      set({
        isLoading: false,
        persistenceError: persistenceMessage(err, 'Unable to change the notes vault.'),
      });
    }
  },

  resetVaultToDefault: async () => {
    set({ isLoading: true });
    try {
      const defaultPath = await vaultAdapter.resetVaultPath();
      const allNotes = await vaultAdapter.loadAllNotes();
      allNotes.sort((a, b) => b.updatedAt - a.updatedAt);
      set({
        vaultPath: defaultPath,
        notes: allNotes,
        activeNoteId: allNotes.length > 0 ? allNotes[0].id : null,
        isLoading: false,
      });
    } catch (err) {
      console.error('Failed to reset vault path:', err);
      set({
        isLoading: false,
        persistenceError: persistenceMessage(err, 'Unable to reset the notes vault.'),
      });
    }
  },

  setActiveNoteId: (id) => set({ activeNoteId: id }),
  
  setActiveFilter: (filter) => {
    set({ activeFilter: filter, selectedTag: null });
    const filtered = get().getFilteredNotes();
    if (filtered.length > 0) {
      set({ activeNoteId: filtered[0].id });
    }
  },
  
  setSelectedTag: (tag) => {
    set({ selectedTag: tag, activeFilter: null });
    const filtered = get().getFilteredNotes();
    if (filtered.length > 0) {
      set({ activeNoteId: filtered[0].id });
    }
  },
  
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSortOption: (option) => set({ sortOption: option }),
  clearPersistenceError: () => set({ persistenceError: null }),

  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  toggleNoteList: () => set((state) => ({ isNoteListOpen: !state.isNoteListOpen })),
  toggleFocusMode: () =>
    set((state) => ({
      isFocusMode: !state.isFocusMode,
      isSidebarOpen: state.isFocusMode,
      isNoteListOpen: state.isFocusMode,
    })),
  toggleInfoDrawer: () => set((state) => ({ isInfoDrawerOpen: !state.isInfoDrawerOpen })),
  setCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open }),
  setSettingsOpen: (open) => set({ isSettingsOpen: open }),
  setExportModalOpen: (open) => set({ isExportModalOpen: open }),
  setCheatsheetOpen: (open) => set({ isCheatsheetOpen: open }),
  setPasswordModalOpen: (open, noteId = null) =>
    set({ isPasswordModalOpen: open, passwordModalNoteId: noteId }),

  createNote: async (initialTag?: string, initialTitle?: string) => {
    const defaultTag = initialTag || get().selectedTag || '';
    const title = initialTitle || 'New Note';
    const initialContent = defaultTag
      ? `# ${title}\n\n#${defaultTag}\n\n`
      : `# ${title}\n\n`;

    const newNote: Note = {
      id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title,
      content: initialContent,
      tags: defaultTag ? [defaultTag] : [],
      isPinned: false,
      isArchived: false,
      isTrashed: false,
      isLocked: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    try {
      await vaultAdapter.saveNote(newNote);
    } catch (err) {
      console.error('Failed to create note:', err);
      set({ persistenceError: persistenceMessage(err, 'Unable to create the note on disk.') });
      return '';
    }

    set((state) => ({
      notes: [newNote, ...state.notes],
      activeNoteId: newNote.id,
    }));

    return newNote.id;
  },

  updateNote: async (id, updates) => {
    const current = get().notes.find((n) => n.id === id);
    if (!current) return;

    if (get().vaultConflicts.some((conflict) => conflict.noteId === id)) {
      return;
    }

    const merged = { ...current, ...updates, updatedAt: updates.updatedAt || Date.now() };
    try {
      await vaultAdapter.saveNote(merged, current.content);
    } catch (err) {
      console.error('Failed to update note:', err);
      set({ persistenceError: persistenceMessage(err, 'Unable to save your change.') });
      if (isSaveConflict(err)) {
        void get().syncIfVaultChanged();
      }
      return;
    }
    
    set((state) => ({
      notes: state.notes.map((n) => (n.id === id ? merged : n)),
      dirtyNoteIds: Object.fromEntries(
        Object.entries(state.dirtyNoteIds).filter(([dirtyId]) => dirtyId !== id)
      ),
    }));
  },

  updateNoteContent: async (id, content, contentJson, persistToDisk = true) => {
    const title = extractTitleFromContent(content);
    const tags = extractTagsFromContent(content);
    
    const current = get().notes.find((n) => n.id === id);
    if (!current) return;

    const updatedNote: Note = {
      ...current,
      content,
      contentJson,
      title,
      tags,
      updatedAt: Date.now(),
    };

    // Instant Zustand store update -> re-renders NoteList & NoteCard immediately
    set((state) => ({
      notes: state.notes.map((n) => (n.id === id ? updatedNote : n)),
      dirtyNoteIds: persistToDisk
        ? state.dirtyNoteIds
        : { ...state.dirtyNoteIds, [id]: true },
      vaultConflicts: state.vaultConflicts.map((conflict) =>
        conflict.noteId === id
          ? { ...conflict, title: updatedNote.title, localNote: updatedNote }
          : conflict
      ),
    }));

    if (persistToDisk) {
      try {
        await vaultAdapter.saveNote(updatedNote, current.content);
      } catch (err) {
        console.error('Failed to persist note content:', err);
        set({ persistenceError: persistenceMessage(err, 'Unable to save your change.') });
        set((state) => ({ dirtyNoteIds: { ...state.dirtyNoteIds, [id]: true } }));
        if (isSaveConflict(err)) {
          void get().syncIfVaultChanged();
        }
        return;
      }

      set((state) => ({
        dirtyNoteIds: Object.fromEntries(
          Object.entries(state.dirtyNoteIds).filter(([dirtyId]) => dirtyId !== id)
        ),
      }));
    }
  },

  togglePin: async (id) => {
    const note = get().notes.find((n) => n.id === id);
    if (!note) return;
    await get().updateNote(id, { isPinned: !note.isPinned });
  },

  toggleArchive: async (id) => {
    const note = get().notes.find((n) => n.id === id);
    if (!note) return;
    await get().updateNote(id, { isArchived: !note.isArchived });
  },

  trashNote: async (id) => {
    await get().updateNote(id, { isTrashed: true, trashedAt: Date.now() });
    const filtered = get().getFilteredNotes();
    if (filtered.length > 0) {
      set({ activeNoteId: filtered[0].id });
    } else {
      set({ activeNoteId: null });
    }
  },

  restoreNote: async (id) => {
    await get().updateNote(id, { isTrashed: false, trashedAt: undefined });
  },

  deletePermanently: async (id) => {
    try {
      await vaultAdapter.deleteNote(id, true);
    } catch (err) {
      console.error('Failed to delete note permanently:', err);
      set({ persistenceError: persistenceMessage(err, 'Unable to delete the note permanently.') });
      return;
    }

    set((state) => {
      const remaining = state.notes.filter((n) => n.id !== id);
      const filtered = remaining.filter((n) => n.isTrashed);
      return {
        notes: remaining,
        activeNoteId: filtered.length > 0 ? filtered[0].id : null,
      };
    });
  },

  duplicateNote: async (id) => {
    const original = get().notes.find((n) => n.id === id);
    if (!original) return '';

    const newNote: Note = {
      ...original,
      id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: `${original.title} (Copy)`,
      content: original.content.replace(/^#\s+(.*)/m, `# $1 (Copy)`),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    try {
      await vaultAdapter.saveNote(newNote);
    } catch (err) {
      console.error('Failed to duplicate note:', err);
      set({ persistenceError: persistenceMessage(err, 'Unable to duplicate the note.') });
      return '';
    }

    set((state) => ({
      notes: [newNote, ...state.notes],
      activeNoteId: newNote.id,
    }));

    return newNote.id;
  },

  emptyTrash: async () => {
    const trashedNotes = get().notes.filter((n) => n.isTrashed);
    for (const note of trashedNotes) {
      try {
        await vaultAdapter.deleteNote(note.id, true);
      } catch (err) {
        console.error('Failed to empty trash:', err);
        set({ persistenceError: persistenceMessage(err, 'Unable to empty the trash.') });
        return;
      }
    }
    set((state) => ({
      notes: state.notes.filter((n) => !n.isTrashed),
      activeNoteId: null,
    }));
  },

  // Lock Actions
  lockNote: async (id, password) => {
    const lockHash = password ? await hashPassword(password) : undefined;
    await get().updateNote(id, { isLocked: true, lockHash });
    set((state) => ({
      unlockedNotes: { ...state.unlockedNotes, [id]: false },
    }));
  },

  unlockNote: async (id, password = '') => {
    const note = get().notes.find((n) => n.id === id);
    if (!note) return false;

    if (note.lockHash) {
      const inputHash = await hashPassword(password);
      if (inputHash !== note.lockHash) {
        return false;
      }
    }

    set((state) => ({
      unlockedNotes: { ...state.unlockedNotes, [id]: true },
    }));
    return true;
  },

  relockNote: (id) => {
    set((state) => ({
      unlockedNotes: { ...state.unlockedNotes, [id]: false },
    }));
  },

  removeLock: async (id) => {
    await get().updateNote(id, { isLocked: false, lockHash: undefined });
    set((state) => ({
      unlockedNotes: { ...state.unlockedNotes, [id]: true },
    }));
  },

  isNoteUnlocked: (id) => {
    const note = get().notes.find((n) => n.id === id);
    if (!note || !note.isLocked) return true;
    return !!get().unlockedNotes[id];
  },

  // Computed Helpers
  getActiveNote: () => {
    const { notes, activeNoteId } = get();
    return notes.find((n) => n.id === activeNoteId);
  },

  getFilteredNotes: () => {
    const { notes, activeFilter, selectedTag, searchQuery, sortOption } = get();
    noteSearchIndex.sync(notes);

    let result = [...notes];

    // Apply System Filter
    if (activeFilter) {
      switch (activeFilter) {
        case 'notes':
          result = result.filter((n) => !n.isArchived && !n.isTrashed);
          break;
        case 'today': {
          const startOfDay = new Date().setHours(0, 0, 0, 0);
          result = result.filter(
            (n) => !n.isTrashed && n.updatedAt >= startOfDay
          );
          break;
        }
        case 'todo': {
          result = result.filter(
            (n) => !n.isTrashed && /-\s+\[ \]/i.test(n.content)
          );
          break;
        }
        case 'untagged':
          result = result.filter((n) => !n.isTrashed && n.tags.length === 0);
          break;
        case 'locked':
          result = result.filter((n) => !n.isTrashed && n.isLocked);
          break;
        case 'archive':
          result = result.filter((n) => !n.isTrashed && n.isArchived);
          break;
        case 'trash':
          result = result.filter((n) => n.isTrashed);
          break;
      }
    } else if (selectedTag) {
      result = result.filter(
        (n) =>
          !n.isTrashed &&
          n.tags.some(
            (t) => t === selectedTag || t.startsWith(`${selectedTag}/`)
          )
      );
    }

    // Apply Search Query
    if (searchQuery.trim()) {
      result = noteSearchIndex.search(result, searchQuery);
    }

    // Apply Sorting (Pinned always on top for normal views)
    result.sort((a, b) => {
      if (activeFilter !== 'trash') {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
      }

      switch (sortOption) {
        case 'updated-desc':
          return b.updatedAt - a.updatedAt;
        case 'updated-asc':
          return a.updatedAt - b.updatedAt;
        case 'created-desc':
          return b.createdAt - a.createdAt;
        case 'created-asc':
          return a.createdAt - b.createdAt;
        case 'title-asc':
          return a.title.localeCompare(b.title);
        case 'title-desc':
          return b.title.localeCompare(a.title);
        default:
          return b.updatedAt - a.updatedAt;
      }
    });

    return result;
  },

  getTagTree: () => {
    const { notes } = get();
    const rootTree: Record<string, TagNodeItem> = {};

    const activeNotes = notes.filter((n) => !n.isTrashed);

    activeNotes.forEach((note) => {
      note.tags.forEach((tagPath) => {
        const segments = tagPath.split('/').filter(Boolean);
        let currentLevel = rootTree;
        let cumulativePath = '';

        segments.forEach((segment, idx) => {
          cumulativePath = cumulativePath ? `${cumulativePath}/${segment}` : segment;

          if (!currentLevel[segment]) {
            currentLevel[segment] = {
              name: cumulativePath,
              segment,
              count: 0,
              children: {},
            };
          }

          if (idx === segments.length - 1) {
            currentLevel[segment].count += 1;
          }

          currentLevel = currentLevel[segment].children;
        });
      });
    });

    function toArray(tree: Record<string, TagNodeItem>): TagNodeItem[] {
      return Object.values(tree)
        .map((node) => ({
          ...node,
          children: node.children,
        }))
        .sort((a, b) => a.segment.localeCompare(b.segment));
    }

    return toArray(rootTree);
  },

  getSystemCounts: () => {
    const { notes } = get();
    const startOfDay = new Date().setHours(0, 0, 0, 0);

    return {
      notes: notes.filter((n) => !n.isArchived && !n.isTrashed).length,
      today: notes.filter((n) => !n.isTrashed && n.updatedAt >= startOfDay).length,
      todo: notes.filter((n) => !n.isTrashed && /-\s+\[ \]/i.test(n.content)).length,
      untagged: notes.filter((n) => !n.isTrashed && n.tags.length === 0).length,
      locked: notes.filter((n) => !n.isTrashed && n.isLocked).length,
      archive: notes.filter((n) => !n.isTrashed && n.isArchived).length,
      trash: notes.filter((n) => n.isTrashed).length,
    };
  },

  getBacklinks: (noteId: string) => {
    const { notes } = get();
    const targetNote = notes.find((n) => n.id === noteId);
    if (!targetNote) return [];

    const backlinks: BacklinkItem[] = [];

    notes.forEach((otherNote) => {
      if (otherNote.id === noteId || otherNote.isTrashed) return;

      const wikiLinks = extractWikiLinksFromContent(otherNote.content);
      const isLinked = wikiLinks.some(
        (target) => target.toLowerCase().trim() === targetNote.title.toLowerCase().trim()
      );

      if (isLinked) {
        backlinks.push({
          noteId: otherNote.id,
          title: otherNote.title,
          updatedAt: otherNote.updatedAt,
        });
      }
    });

    return backlinks;
  },

  getNoteStats: (noteId: string) => {
    const { notes } = get();
    const note = notes.find((n) => n.id === noteId);
    if (!note) {
      return {
        words: 0,
        characters: 0,
        charactersNoSpaces: 0,
        paragraphs: 0,
        readTimeMinutes: 0,
      };
    }

    const text = note.content.trim();
    const words = text.match(/\S+/g)?.length || 0;
    const characters = text.length;
    const charactersNoSpaces = text.replace(/\s+/g, '').length;
    const paragraphs = text.split(/\n\n+/).filter(Boolean).length;
    const readTimeMinutes = Math.max(1, Math.ceil(words / 200));

    return {
      words,
      characters,
      charactersNoSpaces,
      paragraphs,
      readTimeMinutes,
    };
  },

  getHeadings: (noteId: string) => {
    const { notes } = get();
    const note = notes.find((n) => n.id === noteId);
    if (!note) return [];

    const headings: HeadingItem[] = [];
    const lines = note.content.split('\n');

    lines.forEach((line, idx) => {
      const match = line.trim().match(/^(#{1,6})\s+(.*)$/);
      if (match) {
        headings.push({
          id: `heading-${idx}`,
          level: match[1].length,
          text: match[2].trim(),
        });
      }
    });

    return headings;
  },
}));
