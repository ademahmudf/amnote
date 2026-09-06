import type { Note, TagMetadataMap } from '../types/note';
import { mergeVaultNotes, type VaultConflict, type VaultSyncMergeResult } from './vaultSync';
import type { VaultAdapter } from './vaultPort';
import { seedVaultIfFresh } from './seedNotes';

export type VaultAdapterPort = VaultAdapter;

export interface SyncCoordinatorState {
  notes: Note[];
  dirtyNoteIds: Record<string, true>;
  diskContentByNoteId: Record<string, string>;
  vaultRevision: string | null;
  vaultConflicts: VaultConflict[];
  isSyncing: boolean;
}

export interface SyncCoordinatorListener {
  (state: SyncCoordinatorState): void;
}

export type RemoteTagsCallback = (tags: TagMetadataMap, isInitial: boolean) => Promise<void>;

export class VaultSyncCoordinator {
  private adapter: VaultAdapterPort;
  private state: SyncCoordinatorState;
  private listeners: Set<SyncCoordinatorListener> = new Set();
  private onRemoteTags?: RemoteTagsCallback;

  constructor(
    adapter: VaultAdapterPort,
    initialState?: Partial<SyncCoordinatorState>,
    onRemoteTags?: RemoteTagsCallback
  ) {
    this.adapter = adapter;
    this.onRemoteTags = onRemoteTags;
    this.state = {
      notes: initialState?.notes || [],
      dirtyNoteIds: initialState?.dirtyNoteIds || {},
      diskContentByNoteId: initialState?.diskContentByNoteId || {},
      vaultRevision: initialState?.vaultRevision || null,
      vaultConflicts: initialState?.vaultConflicts || [],
      isSyncing: false,
    };
  }

  public getAdapter(): VaultAdapter {
    return this.adapter;
  }

  public setAdapter(adapter: VaultAdapter): void {
    this.adapter = adapter;
  }

  public getState(): SyncCoordinatorState {
    return { ...this.state };
  }

  public subscribe(listener: SyncCoordinatorListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const snapshot = this.getState();
    this.listeners.forEach((listener) => listener(snapshot));
  }

  public markDirty(noteId: string): void {
    this.state.dirtyNoteIds = { ...this.state.dirtyNoteIds, [noteId]: true };
    this.notifyListeners();
  }

  public markClean(noteId: string, diskContent?: string): void {
    const dirty = { ...this.state.dirtyNoteIds };
    delete dirty[noteId];
    this.state.dirtyNoteIds = dirty;
    if (diskContent !== undefined) {
      this.state.diskContentByNoteId = {
        ...this.state.diskContentByNoteId,
        [noteId]: diskContent,
      };
    }
    this.state.vaultConflicts = this.state.vaultConflicts.filter((c) => c.noteId !== noteId);
    this.notifyListeners();
  }

  public setNotes(notes: Note[]): void {
    this.state.notes = notes;
    this.notifyListeners();
  }

  public updateLocalState(
    partial: Partial<Pick<SyncCoordinatorState, 'notes' | 'dirtyNoteIds' | 'diskContentByNoteId' | 'vaultRevision' | 'vaultConflicts'>>
  ): void {
    this.state = { ...this.state, ...partial };
    this.notifyListeners();
  }

  private async loadNotesAndTagsFromDisk(): Promise<{ allNotes: Note[]; remoteTags: TagMetadataMap }> {
    const [allNotes, remoteTags] = await Promise.all([
      this.adapter.loadAllNotes(),
      this.adapter.loadTagMetadata(),
    ]);
    allNotes.sort((a, b) => b.updatedAt - a.updatedAt);
    return { allNotes, remoteTags };
  }

  public async loadInitial(): Promise<{ notes: Note[]; revision: string | null }> {
    await seedVaultIfFresh(this.adapter);
    const { allNotes, remoteTags } = await this.loadNotesAndTagsFromDisk();
    if (this.onRemoteTags) {
      await this.onRemoteTags(remoteTags, true);
    }
    const revision = await this.adapter.getVaultRevision();
    this.state.notes = allNotes;
    this.state.diskContentByNoteId = Object.fromEntries(
      allNotes.map((note) => [note.id, note.content])
    );
    this.state.vaultRevision = revision;
    this.state.dirtyNoteIds = {};
    this.state.vaultConflicts = [];
    this.notifyListeners();
    return { notes: allNotes, revision };
  }

  public async reloadFromDisk(): Promise<{ notes: Note[]; revision: string | null }> {
    const { allNotes, remoteTags } = await this.loadNotesAndTagsFromDisk();
    if (this.onRemoteTags) {
      await this.onRemoteTags(remoteTags, false);
    }
    const merged = mergeVaultNotes({
      localNotes: this.state.notes,
      diskNotes: allNotes,
      dirtyNoteIds: this.state.dirtyNoteIds,
      baseContentByNoteId: this.state.diskContentByNoteId,
    });

    const revision = await this.adapter.getVaultRevision();
    this.state.notes = merged.notes;
    this.state.vaultConflicts = merged.conflicts;
    this.state.diskContentByNoteId = Object.fromEntries(
      allNotes.map((note) => [note.id, note.content])
    );
    this.state.vaultRevision = revision;
    this.notifyListeners();
    return { notes: merged.notes, revision };
  }

  public async syncIfChanged(): Promise<{ changed: boolean; newConflicts: VaultConflict[] }> {
    if (this.state.isSyncing) return { changed: false, newConflicts: [] };

    this.state.isSyncing = true;
    this.notifyListeners();

    try {
      const revision = await this.adapter.getVaultRevision();
      if (this.state.vaultRevision === revision) {
        return { changed: false, newConflicts: [] };
      }

      const { allNotes, remoteTags } = await this.loadNotesAndTagsFromDisk();

      if (this.onRemoteTags) {
        await this.onRemoteTags(remoteTags, false);
      }

      const merged: VaultSyncMergeResult = mergeVaultNotes({
        localNotes: this.state.notes,
        diskNotes: allNotes,
        dirtyNoteIds: this.state.dirtyNoteIds,
        baseContentByNoteId: this.state.diskContentByNoteId,
      });

      const existingConflictIds = new Set(this.state.vaultConflicts.map((c) => c.noteId));
      const newConflicts = merged.conflicts.filter((c) => !existingConflictIds.has(c.noteId));

      this.state.notes = merged.notes;
      this.state.vaultConflicts = merged.conflicts;
      this.state.diskContentByNoteId = Object.fromEntries(
        allNotes.map((note) => [note.id, note.content])
      );
      this.state.vaultRevision = revision;
      this.notifyListeners();

      return { changed: true, newConflicts };
    } finally {
      this.state.isSyncing = false;
      this.notifyListeners();
    }
  }

  public async resolveConflict(
    noteId: string,
    resolution: 'local' | 'disk' | 'both',
    generateCopyId: () => string
  ): Promise<{ notes: Note[]; reloadNeeded: boolean }> {
    const conflict = this.state.vaultConflicts.find((c) => c.noteId === noteId);
    if (!conflict) return { notes: this.state.notes, reloadNeeded: false };

    const { localNote, diskNote } = conflict;

    await this.adapter.backupNoteVersion(localNote, 'local');
    if (diskNote) {
      await this.adapter.backupNoteVersion(diskNote, 'disk');
    }

    if (resolution === 'local') {
      const newRevision = await this.adapter.saveNote(localNote);
      this.markClean(noteId, localNote.content);
      this.state.notes = this.state.notes.map((n) => (n.id === noteId ? localNote : n));
      if (newRevision) this.state.vaultRevision = newRevision;
      this.notifyListeners();
      return { notes: this.state.notes, reloadNeeded: false };
    }

    if (resolution === 'disk' && diskNote) {
      this.markClean(noteId, diskNote.content);
      this.state.notes = this.state.notes.map((n) => (n.id === noteId ? diskNote : n));
      this.notifyListeners();
      return { notes: this.state.notes, reloadNeeded: true };
    }

    if (resolution === 'both' && diskNote) {
      const localCopy: Note = {
        ...localNote,
        id: generateCopyId(),
        title: `${localNote.title} (local copy)`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await this.adapter.saveNote(localCopy);
      const newRevision = await this.adapter.getVaultRevision();
      this.markClean(noteId, diskNote.content);
      this.state.diskContentByNoteId[localCopy.id] = localCopy.content;
      this.state.notes = [
        diskNote,
        localCopy,
        ...this.state.notes.filter((n) => n.id !== noteId),
      ];
      if (newRevision) this.state.vaultRevision = newRevision;
      this.notifyListeners();
      return { notes: this.state.notes, reloadNeeded: true };
    }

    return { notes: this.state.notes, reloadNeeded: false };
  }
}
