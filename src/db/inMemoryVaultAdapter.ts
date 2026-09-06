import type { Note, TagMetadataMap } from '../types/note';
import type { VaultAdapter } from '../domain/vaultPort';

/**
 * In-memory implementation of VaultAdapter for headless unit tests,
 * CI environments, and browser preview without desktop runtime.
 */
export class InMemoryVaultAdapter implements VaultAdapter {
  private notes: Map<string, Note> = new Map();
  private attachments: Map<string, Map<string, string>> = new Map();
  private tagMetadata: TagMetadataMap = {};
  private backups: Array<{ noteId: string; label: string; note: Note }> = [];
  private listeners: Set<() => void> = new Set();
  private vaultPath = '/virtual/AmNotes';
  private revisionCounter = 1;
  private initialized: boolean;

  constructor(initialNotes: Note[] = [], initialized = initialNotes.length > 0) {
    this.initialized = initialized;
    for (const note of initialNotes) {
      this.notes.set(note.id, { ...note });
    }
  }

  public async isInitialized(): Promise<boolean> {
    return this.initialized;
  }

  public async markInitialized(): Promise<void> {
    this.initialized = true;
  }

  public async loadAllNotes(): Promise<Note[]> {
    return Array.from(this.notes.values()).map((n) => ({ ...n }));
  }

  public async saveNote(note: Note, _expectedContent?: string): Promise<string> {
    this.notes.set(note.id, { ...note });
    this.revisionCounter++;
    return `rev-${this.revisionCounter}`;
  }

  public async deleteNote(id: string, permanent = false): Promise<string> {
    if (permanent) {
      this.notes.delete(id);
    } else {
      const existing = this.notes.get(id);
      if (existing) {
        this.notes.set(id, { ...existing, isTrashed: true });
      }
    }
    this.revisionCounter++;
    return `rev-${this.revisionCounter}`;
  }

  public async loadTagMetadata(): Promise<TagMetadataMap> {
    return { ...this.tagMetadata };
  }

  public async saveTagMetadata(tags: TagMetadataMap): Promise<void> {
    this.tagMetadata = { ...tags };
  }

  public async saveAttachment(noteId: string, fileName: string, dataUrl: string): Promise<string> {
    if (!this.attachments.has(noteId)) {
      this.attachments.set(noteId, new Map());
    }
    this.attachments.get(noteId)!.set(fileName, dataUrl);
    return `amnote-asset://localhost/${noteId}/${fileName}`;
  }

  public async backupNoteVersion(note: Note, label: string): Promise<string | void> {
    this.backups.push({ noteId: note.id, label, note: { ...note } });
    return `backup-${this.backups.length}`;
  }

  public async getVaultRevision(): Promise<string | null> {
    return `rev-${this.revisionCounter}`;
  }

  public async getVaultPath(): Promise<string> {
    return this.vaultPath;
  }

  public async pickVaultFolder(): Promise<string | null> {
    return `${this.vaultPath}/PickedFolder`;
  }

  public async setVaultPath(newPath: string): Promise<string> {
    this.vaultPath = newPath;
    return this.vaultPath;
  }

  public async resetVaultPath(): Promise<string> {
    this.vaultPath = '/virtual/AmNotes';
    return this.vaultPath;
  }

  public async openVaultInFileManager(): Promise<void> {
    // No-op in memory
  }

  public async onVaultChanged(callback: () => void): Promise<() => void> {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Deterministically triggers vault-changed notifications for registered listeners.
   * Useful for simulating external background sync events in unit tests.
   */
  public triggerVaultChanged(): void {
    for (const callback of this.listeners) {
      callback();
    }
  }

  /**
   * Test helper to inspect stored backups.
   */
  public getBackups(): Array<{ noteId: string; label: string; note: Note }> {
    return [...this.backups];
  }

  /**
   * Test helper to inspect stored attachments.
   */
  public getAttachment(noteId: string, fileName: string): string | undefined {
    return this.attachments.get(noteId)?.get(fileName);
  }
}
