import type { Note, TagMetadataMap } from '../types/note';

/**
 * Authoritative port interface defining all operations against a local or virtual AmNote vault.
 */
export interface VaultAdapter {
  isInitialized(): Promise<boolean>;
  markInitialized(): Promise<void>;
  loadAllNotes(): Promise<Note[]>;
  saveNote(note: Note, expectedContent?: string): Promise<string>;
  deleteNote(id: string, permanent?: boolean): Promise<string>;
  loadTagMetadata(): Promise<TagMetadataMap>;
  saveTagMetadata(tags: TagMetadataMap): Promise<void>;
  saveAttachment(noteId: string, fileName: string, dataUrl: string): Promise<string>;
  backupNoteVersion(note: Note, label: 'local' | 'disk' | string): Promise<string | void>;
  getVaultRevision(): Promise<string | null>;
  getVaultPath(): Promise<string>;
  pickVaultFolder(): Promise<string | null>;
  setVaultPath(newPath: string): Promise<string>;
  resetVaultPath(): Promise<string>;
  openVaultInFileManager(): Promise<void>;
  onVaultChanged(callback: () => void): Promise<() => void>;
}
