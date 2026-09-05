import { create } from 'zustand';
import {
  extractTagsFromContent,
} from '../domain/markdownMetadata';
import {
  mergeVaultNotes,
  type VaultConflict,
} from '../domain/vaultSync';
import {
  extractTitleFromContent,
  hashPassword,
  isSaveConflict,
  newNoteId,
  persistenceMessage,
} from '../domain/noteUtils';
import {
  getActiveNote as selectActiveNote,
  getBacklinks as selectBacklinks,
  getFilteredNotes as selectFilteredNotes,
  getHeadings as selectHeadings,
  getNoteStats as selectNoteStats,
  getSystemCounts as selectSystemCounts,
  getTagTree as selectTagTree,
} from '../domain/noteSelectors';
import {
  createDailyNoteContent,
  isValidISODate,
  todayISO,
} from '../domain/calendarDates';
import { vaultAdapter } from '../db/vaultAdapter';
import { useSettingsStore } from './useSettingsStore';
import { notify } from './useNotificationStore';
import type { Note, SortOption, SystemFilter, TagNodeItem } from '../types/note';
import type { BacklinkItem, HeadingItem, NoteStats } from '../types/note';

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
  diskContentByNoteId: Record<string, string>;
  
  // Layout toggles
  isSidebarOpen: boolean;
  isNoteListOpen: boolean;
  isFocusMode: boolean;
  isInfoDrawerOpen: boolean;
  isCommandPaletteOpen: boolean;
  isCalendarModalOpen: boolean;
  calendarSelectedDate: string;
  isSettingsOpen: boolean;
  isExportModalOpen: boolean;
  isCheatsheetOpen: boolean;
  isPasswordModalOpen: boolean;
  passwordModalNoteId: string | null;
  isEmptyTrashModalOpen: boolean;
  
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
  setCalendarModalOpen: (open: boolean, dateIso?: string) => void;
  setCalendarSelectedDate: (dateIso: string) => void;
  setSettingsOpen: (open: boolean) => void;
  setExportModalOpen: (open: boolean) => void;
  setCheatsheetOpen: (open: boolean) => void;
  setPasswordModalOpen: (open: boolean, noteId?: string | null) => void;
  setEmptyTrashModalOpen: (open: boolean) => void;
  
  createNote: (
    initialTag?: string | null,
    initialTitle?: string,
    initialBody?: string
  ) => Promise<string>;
  openDailyNote: (dateIso: string) => Promise<string | null>;
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

// Note metadata helpers live in domain/noteUtils.ts.

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
  isCalendarModalOpen: false,
  calendarSelectedDate: todayISO(),
  isSettingsOpen: false,
  isExportModalOpen: false,
  isCheatsheetOpen: false,
  isPasswordModalOpen: false,
  passwordModalNoteId: null,
  isEmptyTrashModalOpen: false,
  
  unlockedNotes: {},
  dirtyNoteIds: {},
  diskContentByNoteId: {},
  isLoading: true,
  persistenceError: null,
  isSyncingVault: false,
  editorReloadToken: 0,

  init: async () => {
    try {
      const vaultPath = await vaultAdapter.getVaultPath();
      const [allNotes, remoteTags] = await Promise.all([
        vaultAdapter.loadAllNotes(),
        vaultAdapter.loadTagMetadata(),
      ]);
      allNotes.sort((a, b) => b.updatedAt - a.updatedAt);
      await useSettingsStore.getState().initTagSync(remoteTags);

      set({
        vaultPath,
        notes: allNotes,
        activeNoteId: allNotes.length > 0 ? allNotes[0].id : null,
        isLoading: false,
        persistenceError: null,
        vaultRevision: await vaultAdapter.getVaultRevision(),
        dirtyNoteIds: {},
        vaultConflicts: [],
        diskContentByNoteId: Object.fromEntries(allNotes.map((note) => [note.id, note.content])),
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
      baseContentByNoteId: get().diskContentByNoteId,
    });

    set({
      notes: merged.notes,
      vaultConflicts: merged.conflicts,
      diskContentByNoteId: Object.fromEntries(allNotes.map((note) => [note.id, note.content])),
      activeNoteId: allNotes.length > 0 && !get().activeNoteId ? allNotes[0].id : get().activeNoteId,
    });
  },

  reloadFromDisk: async () => {
    const [allNotes, remoteTags] = await Promise.all([
      vaultAdapter.loadAllNotes(),
      vaultAdapter.loadTagMetadata(),
    ]);
    allNotes.sort((a, b) => b.updatedAt - a.updatedAt);
    await useSettingsStore.getState().applyRemoteTagMetadata(remoteTags);
    const merged = mergeVaultNotes({
      localNotes: get().notes,
      diskNotes: allNotes,
      dirtyNoteIds: get().dirtyNoteIds,
      baseContentByNoteId: get().diskContentByNoteId,
    });

    set({
      notes: merged.notes,
      vaultConflicts: merged.conflicts,
      diskContentByNoteId: Object.fromEntries(allNotes.map((note) => [note.id, note.content])),
      vaultRevision: await vaultAdapter.getVaultRevision(),
    });

    notify({
      title: 'Vault Reloaded',
      sender: 'Disk',
      message: 'Refreshed notes and tags from disk.',
      type: 'info',
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

      const [allNotes, remoteTags] = await Promise.all([
        vaultAdapter.loadAllNotes(),
        vaultAdapter.loadTagMetadata(),
      ]);
      allNotes.sort((a, b) => b.updatedAt - a.updatedAt);
      await useSettingsStore.getState().applyRemoteTagMetadata(remoteTags);

      const merged = mergeVaultNotes({
        localNotes: get().notes,
        diskNotes: allNotes,
        dirtyNoteIds: Object.fromEntries(
          Object.keys(get().dirtyNoteIds).map((id) => [id, true as const])
        ),
        baseContentByNoteId: get().diskContentByNoteId,
      });
      const activeNoteExists = merged.notes.some((note) => note.id === get().activeNoteId);
      const hadPriorRevision = get().vaultRevision !== null;

      const existingConflictIds = new Set(get().vaultConflicts.map((c) => c.noteId));
      const newConflicts = merged.conflicts.filter((c) => !existingConflictIds.has(c.noteId));

      set({
        notes: merged.notes,
        vaultConflicts: merged.conflicts,
        diskContentByNoteId: Object.fromEntries(allNotes.map((note) => [note.id, note.content])),
        vaultRevision: revision,
        activeNoteId: activeNoteExists
          ? get().activeNoteId
          : allNotes.length > 0
            ? allNotes[0].id
            : null,
      });

      if (hadPriorRevision && newConflicts.length > 0) {
        notify({
          title: 'Sync Conflict',
          sender: 'Vault',
          message: `${newConflicts.length} note${newConflicts.length > 1 ? 's have' : ' has'} conflicting disk changes.`,
          type: 'warning',
        });
      }

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
    const { localNote } = conflict;
    const diskNote = conflict.diskNote;

    // A conflict resolution intentionally discards one representation, so both
    // sides are preserved before any destructive action.
    try {
      await vaultAdapter.backupNoteVersion(conflict.localNote, 'local');
      if (diskNote) {
      await vaultAdapter.backupNoteVersion(diskNote, 'disk');
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
          localNote,
          diskNote?.content
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
          note.id === noteId ? localNote : note
        ),
        ...clearConflict(get()),
        diskContentByNoteId: {
          ...state.diskContentByNoteId,
          [noteId]: localNote.content,
        },
        vaultRevision,
      }));

      notify({
        title: 'Conflict Resolved',
        sender: localNote.title || 'Untitled',
        message: 'Kept local version.',
        type: 'success',
      });
      return;
    }

    if (resolution === 'disk') {
      if (!diskNote) return;

      set((state) => ({
        notes: state.notes.flatMap((note) =>
          note.id === noteId ? [diskNote] : [note]
        ),
        ...clearConflict(get()),
        diskContentByNoteId: {
          ...state.diskContentByNoteId,
          [noteId]: diskNote.content,
        },
        editorReloadToken: state.editorReloadToken + 1,
      }));

      notify({
        title: 'Conflict Resolved',
        sender: localNote.title || 'Untitled',
        message: 'Kept disk version.',
        type: 'success',
      });
      return;
    }

    if (!diskNote) {
      await get().resolveVaultConflict(noteId, 'local');
      return;
    }

    const localCopy: Note = {
      ...localNote,
      id: newNoteId(),
      title: `${localNote.title} (local copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    try {
      await vaultAdapter.saveNote(localCopy);
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
        diskNote,
        localCopy,
        ...state.notes.filter((note) => note.id !== noteId),
      ],
      ...clearConflict(get()),
      diskContentByNoteId: {
        ...state.diskContentByNoteId,
        [noteId]: diskNote.content,
        [localCopy.id]: localCopy.content,
      },
      editorReloadToken: state.editorReloadToken + 1,
      vaultRevision,
    }));

    notify({
      title: 'Conflict Resolved',
      sender: localNote.title || 'Untitled',
      message: 'Preserved both versions with a local copy.',
      type: 'success',
    });
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
      const [allNotes, remoteTags] = await Promise.all([
        vaultAdapter.loadAllNotes(),
        vaultAdapter.loadTagMetadata(),
      ]);
      allNotes.sort((a, b) => b.updatedAt - a.updatedAt);
      await useSettingsStore.getState().initTagSync(remoteTags);
      set({
        vaultPath: activePath,
        notes: allNotes,
        activeNoteId: allNotes.length > 0 ? allNotes[0].id : null,
        isLoading: false,
        vaultRevision: await vaultAdapter.getVaultRevision(),
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
      const [allNotes, remoteTags] = await Promise.all([
        vaultAdapter.loadAllNotes(),
        vaultAdapter.loadTagMetadata(),
      ]);
      allNotes.sort((a, b) => b.updatedAt - a.updatedAt);
      await useSettingsStore.getState().initTagSync(remoteTags);
      set({
        vaultPath: defaultPath,
        notes: allNotes,
        activeNoteId: allNotes.length > 0 ? allNotes[0].id : null,
        isLoading: false,
        vaultRevision: await vaultAdapter.getVaultRevision(),
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
    set({ activeFilter: filter, selectedTag: null, activeNoteId: null });
  },
  
  setSelectedTag: (tag) => {
    set({ selectedTag: tag, activeFilter: null, activeNoteId: null });
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
  setCalendarModalOpen: (open, dateIso) =>
    set((state) => ({
      isCalendarModalOpen: open,
      calendarSelectedDate: dateIso && isValidISODate(dateIso) ? dateIso : state.calendarSelectedDate,
    })),
  setCalendarSelectedDate: (dateIso) => {
    if (isValidISODate(dateIso)) set({ calendarSelectedDate: dateIso });
  },
  setSettingsOpen: (open) => set({ isSettingsOpen: open }),
  setExportModalOpen: (open) => set({ isExportModalOpen: open }),
  setCheatsheetOpen: (open) => set({ isCheatsheetOpen: open }),
  setPasswordModalOpen: (open, noteId = null) =>
    set({ isPasswordModalOpen: open, passwordModalNoteId: noteId }),
  setEmptyTrashModalOpen: (open) => set({ isEmptyTrashModalOpen: open }),

  createNote: async (initialTag?: string | null, initialTitle?: string, initialBody?: string) => {
    const defaultTag = initialTag === undefined ? get().selectedTag || '' : initialTag;
    const title = initialTitle || 'New Note';
    const initialContent =
      initialBody !== undefined
        ? initialBody
        : defaultTag
        ? `# ${title}\n\n#${defaultTag}\n\n`
        : `# ${title}\n\n`;

    const newNote: Note = {
      id: newNoteId(),
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

    let newRevision: string | null = null;
    try {
      newRevision = await vaultAdapter.saveNote(newNote);
    } catch (err) {
      console.error('Failed to create note:', err);
      set({ persistenceError: persistenceMessage(err, 'Unable to create the note on disk.') });
      return '';
    }

    set((state) => ({
      notes: [newNote, ...state.notes],
      activeNoteId: newNote.id,
      diskContentByNoteId: { ...state.diskContentByNoteId, [newNote.id]: newNote.content },
      vaultRevision: newRevision || state.vaultRevision,
    }));

    return newNote.id;
  },

  openDailyNote: async (dateIso) => {
    if (!isValidISODate(dateIso)) return null;

    const existingNote = get()
      .notes.filter((note) => !note.isTrashed && !note.isArchived && note.title.trim() === dateIso)
      .sort((a, b) => b.updatedAt - a.updatedAt)[0];

    set({ isCalendarModalOpen: false });

    if (existingNote) {
      set({ activeNoteId: existingNote.id });
      return existingNote.id;
    }

    const createdNoteId = await get().createNote('', dateIso, createDailyNoteContent(dateIso));
    return createdNoteId || null;
  },

  updateNote: async (id, updates) => {
    const current = get().notes.find((n) => n.id === id);
    if (!current) return;

    const merged = { ...current, ...updates, updatedAt: updates.updatedAt || Date.now() };
    let newRevision: string | null = null;
    try {
      newRevision = await vaultAdapter.saveNote(merged, get().diskContentByNoteId[id]);
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
      diskContentByNoteId: { ...state.diskContentByNoteId, [id]: merged.content },
      dirtyNoteIds: Object.fromEntries(
        Object.entries(state.dirtyNoteIds).filter(([dirtyId]) => dirtyId !== id)
      ),
      vaultConflicts: state.vaultConflicts.filter((c) => c.noteId !== id),
      vaultRevision: newRevision || state.vaultRevision,
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
      let newRevision: string | null = null;
      try {
        newRevision = await vaultAdapter.saveNote(updatedNote, get().diskContentByNoteId[id]);
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
        notes: state.notes.map((n) => (n.id === id ? updatedNote : n)),
        diskContentByNoteId: { ...state.diskContentByNoteId, [id]: updatedNote.content },
        dirtyNoteIds: Object.fromEntries(
          Object.entries(state.dirtyNoteIds).filter(([dirtyId]) => dirtyId !== id)
        ),
        vaultConflicts: state.vaultConflicts.filter((c) => c.noteId !== id),
        vaultRevision: newRevision || state.vaultRevision,
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
    set((state) => ({
      dirtyNoteIds: Object.fromEntries(
        Object.entries(state.dirtyNoteIds).filter(([dirtyId]) => dirtyId !== id)
      ),
      vaultConflicts: state.vaultConflicts.filter((c) => c.noteId !== id),
    }));
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
    let newRevision: string | null = null;
    try {
      newRevision = await vaultAdapter.deleteNote(id, true);
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
        diskContentByNoteId: Object.fromEntries(
          Object.entries(state.diskContentByNoteId).filter(([savedId]) => savedId !== id)
        ),
        dirtyNoteIds: Object.fromEntries(
          Object.entries(state.dirtyNoteIds).filter(([dirtyId]) => dirtyId !== id)
        ),
        vaultConflicts: state.vaultConflicts.filter((c) => c.noteId !== id),
        vaultRevision: newRevision || state.vaultRevision,
      };
    });
  },

  duplicateNote: async (id) => {
    const original = get().notes.find((n) => n.id === id);
    if (!original) return '';

    const newNote: Note = {
      ...original,
      id: newNoteId(),
      title: `${original.title} (Copy)`,
      content: original.content.replace(/^#\s+(.*)/m, `# $1 (Copy)`),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    let newRevision: string | null = null;
    try {
      newRevision = await vaultAdapter.saveNote(newNote);
    } catch (err) {
      console.error('Failed to duplicate note:', err);
      set({ persistenceError: persistenceMessage(err, 'Unable to duplicate the note.') });
      return '';
    }

    set((state) => ({
      notes: [newNote, ...state.notes],
      activeNoteId: newNote.id,
      diskContentByNoteId: { ...state.diskContentByNoteId, [newNote.id]: newNote.content },
      vaultRevision: newRevision || state.vaultRevision,
    }));

    return newNote.id;
  },

  emptyTrash: async () => {
    const trashedNotes = get().notes.filter((n) => n.isTrashed);
    if (trashedNotes.length === 0) return;

    let latestRevision = get().vaultRevision;
    for (const note of trashedNotes) {
      try {
        latestRevision = await vaultAdapter.deleteNote(note.id, true);
      } catch (err) {
        console.error('Failed to empty trash:', err);
        set({ persistenceError: persistenceMessage(err, 'Unable to empty the trash.') });
        return;
      }
    }
    const trashedIds = new Set(trashedNotes.map((n) => n.id));
    set((state) => ({
      notes: state.notes.filter((n) => !n.isTrashed),
      activeNoteId: state.activeNoteId && trashedIds.has(state.activeNoteId) ? null : state.activeNoteId,
      dirtyNoteIds: Object.fromEntries(
        Object.entries(state.dirtyNoteIds).filter(([dirtyId]) => !trashedIds.has(dirtyId))
      ),
      vaultConflicts: state.vaultConflicts.filter((c) => !trashedIds.has(c.noteId)),
      diskContentByNoteId: Object.fromEntries(
        Object.entries(state.diskContentByNoteId).filter(([id]) => !trashedIds.has(id))
      ),
      vaultRevision: latestRevision,
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
    return selectActiveNote(notes, activeNoteId);
  },

  getFilteredNotes: () => {
    const { notes, activeFilter, selectedTag, searchQuery, sortOption } = get();
    return selectFilteredNotes(notes, {
      activeFilter,
      selectedTag,
      searchQuery,
      sortOption,
    });
  },

  getTagTree: () => {
    const { notes } = get();
    return selectTagTree(notes);
  },

  getSystemCounts: () => {
    const { notes } = get();
    return selectSystemCounts(notes);
  },

  getBacklinks: (noteId: string) => {
    const { notes } = get();
    return selectBacklinks(notes, noteId);
  },

  getNoteStats: (noteId: string) => {
    const { notes } = get();
    return selectNoteStats(notes, noteId);
  },

  getHeadings: (noteId: string) => {
    const { notes } = get();
    return selectHeadings(notes, noteId);
  },
}));
