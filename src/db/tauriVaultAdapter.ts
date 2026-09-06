import type { Note, TagMetadataMap, VaultMetadataPayload } from '../types/note';
import type { VaultAdapter } from '../domain/vaultPort';

async function invokeTauri<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(cmd, args);
}

/**
 * Native desktop adapter communicating with Tauri backend via IPC.
 */
export class TauriVaultAdapter implements VaultAdapter {
  public async isInitialized(): Promise<boolean> {
    return invokeTauri<boolean>('is_vault_initialized');
  }

  public async markInitialized(): Promise<void> {
    await invokeTauri<void>('mark_vault_initialized');
  }

  public async loadAllNotes(): Promise<Note[]> {
    const notes = await invokeTauri<Note[]>('load_notes_from_vault');
    return notes || [];
  }

  public async saveNote(note: Note, expectedContent?: string): Promise<string> {
    return invokeTauri<string>('save_note_to_vault', {
      note,
      expectedContent,
    });
  }

  public async deleteNote(id: string, permanent = false): Promise<string> {
    return invokeTauri<string>('delete_note_from_vault', { id, permanent });
  }

  public async loadTagMetadata(): Promise<TagMetadataMap> {
    try {
      const meta = await invokeTauri<VaultMetadataPayload>('load_tag_metadata');
      return meta?.tags || {};
    } catch (err) {
      console.warn('Failed to load tag metadata from vault:', err);
      return {};
    }
  }

  public async saveTagMetadata(tags: TagMetadataMap): Promise<void> {
    await invokeTauri<VaultMetadataPayload>('save_tag_metadata', { tags });
  }

  public async saveAttachment(noteId: string, fileName: string, dataUrl: string): Promise<string> {
    return invokeTauri<string>('save_attachment', {
      noteId,
      fileName,
      dataUrl,
    });
  }

  public async backupNoteVersion(note: Note, label: 'local' | 'disk' | string): Promise<string | void> {
    return invokeTauri<string>('backup_note_version', { note, label });
  }

  public async getVaultRevision(): Promise<string | null> {
    return invokeTauri<string>('get_vault_revision');
  }

  public async getVaultPath(): Promise<string> {
    try {
      return await invokeTauri<string>('get_vault_path');
    } catch (err) {
      console.warn('Failed to get vault path from Tauri:', err);
      return '~/Documents/AmNotes';
    }
  }

  public async pickVaultFolder(): Promise<string | null> {
    try {
      return await invokeTauri<string | null>('pick_vault_folder');
    } catch (err) {
      console.error('Failed to pick vault folder:', err);
      return null;
    }
  }

  public async setVaultPath(newPath: string): Promise<string> {
    return invokeTauri<string>('set_vault_path', { newPath });
  }

  public async resetVaultPath(): Promise<string> {
    return invokeTauri<string>('reset_vault_path');
  }

  public async openVaultInFileManager(): Promise<void> {
    try {
      await invokeTauri<void>('open_vault_in_file_manager');
    } catch (err) {
      console.error('Failed to open vault folder:', err);
    }
  }

  public async onVaultChanged(callback: () => void): Promise<() => void> {
    const { listen } = await import('@tauri-apps/api/event');
    return listen('vault-changed', callback);
  }
}
