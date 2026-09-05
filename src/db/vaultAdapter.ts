import type { Note, TagMetadataMap, VaultMetadataPayload } from '../types/note';

// Initial default seed notes for AmNote on fresh start
export const initialAmNoteSeed: Note[] = [
  {
    id: 'note-welcome-amnote',
    title: 'Welcome to AmNote',
    content: `# Welcome to AmNote

![AmNote|center|220px](/new-amnote-dark.png)

Welcome to **AmNote** — *Ideas, Thoughts, Noted*. Your fast, beautiful, and distraction-free native Markdown companion designed for **Omarchy Linux** and **macOS**.

All your notes are stored locally in **~/Documents/AmNotes** as human-readable \`.md\` files with standard YAML frontmatter!

### 🌟 Key Highlights
- **100% Native Desktop Storage**: All notes live in \`~/Documents/AmNotes/\` on your disk.
- **Image Cropping & Resizing**: Drag handles, aspect ratio presets, rotate & flip.
- **Custom Highlight Colors**: Choose preset pastel swatches or hex colors.
- **Nested Hierarchical Tags**: Organize with \`#guide/basics\` or \`#work/projects/2026\`.
- **Bidirectional Wiki-Links**: Link between notes using \`[[Welcome to AmNote]]\`.
- **Lock & Privacy**: Protect sensitive notes with optional PIN / Passwords.
- **Multiple Color Themes**: Omarchy Sync, Red Graphite, Nord, Dracula, Solarized, Ayu, Sepia.

### ⚡ Useful Shortcuts
- \`Ctrl+N\`: Create a new note
- \`Ctrl+Shift+F\`: Search notes
- \`Ctrl+P\` / \`Ctrl+K\`: Command Palette
- \`Ctrl+Shift+I\`: Note Inspector & Table of Contents
- \`/\`: Insert headings, tables, checklists, callouts, and images

#guide/welcome #amnote/getting-started`,
    tags: ['guide/welcome', 'amnote/getting-started'],
    isPinned: true,
    isArchived: false,
    isTrashed: false,
    isLocked: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'note-markdown-guide',
    title: 'Markdown Cheatsheet',
    content: `# Markdown Cheatsheet

AmNote supports rich GitHub Flavored Markdown with inline live rendering.

### Task Lists & Checklists
- [x] Complete AmNote native desktop vault setup
- [ ] Create my first personal note
- [ ] Try nested subtasks by pressing Tab

### Code Blocks & Highlighting
\`\`\`rust
fn main() {
    println!("Hello from AmNote on Omarchy Linux!");
}
\`\`\`

### Callout Boxes
> [!NOTE]
> Notes are automatically saved to disk as you type.

> [!TIP]
> You can sync your \`~/Documents/AmNotes\` folder across Linux and Mac using Syncthing, Nextcloud, or Git!

#guide/markdown #cheatsheet`,
    tags: ['guide/markdown', 'cheatsheet'],
    isPinned: false,
    isArchived: false,
    isTrashed: false,
    isLocked: false,
    createdAt: Date.now() - 3600000,
    updatedAt: Date.now() - 1800000,
  },
];

// Check if running inside Tauri desktop environment
export function isTauriEnvironment(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

// Native Tauri IPC caller helper
async function invokeTauri<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (isTauriEnvironment()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<T>(cmd, args);
  }
  throw new Error('Not running in Tauri environment');
}

export const vaultAdapter = {
  saveAttachment: async (noteId: string, fileName: string, dataUrl: string): Promise<string> => {
    if (isTauriEnvironment()) {
      return invokeTauri<string>('save_attachment', {
        noteId,
        fileName,
        dataUrl,
      });
    }

    // Browser previews can still render the in-memory data URL.
    return dataUrl;
  },

  onVaultChanged: async (callback: () => void): Promise<() => void> => {
    if (isTauriEnvironment()) {
      const { listen } = await import('@tauri-apps/api/event');
      return listen('vault-changed', callback);
    }

    return () => {};
  },

  backupNoteVersion: async (note: Note, label: 'local' | 'disk'): Promise<string> => {
    if (isTauriEnvironment()) {
      return invokeTauri<string>('backup_note_version', { note, label });
    }

    throw new Error('Conflict backups require the AmNote desktop runtime.');
  },

  getVaultRevision: async (): Promise<string> => {
    if (isTauriEnvironment()) {
      return invokeTauri<string>('get_vault_revision');
    }

    throw new Error('Vault revision checks require the AmNote desktop runtime.');
  },

  getVaultPath: async (): Promise<string> => {
    if (isTauriEnvironment()) {
      try {
        return await invokeTauri<string>('get_vault_path');
      } catch (err) {
        console.warn('Failed to get vault path from Tauri:', err);
      }
    }
    return '~/Documents/AmNotes';
  },

  pickVaultFolder: async (): Promise<string | null> => {
    if (isTauriEnvironment()) {
      try {
        return await invokeTauri<string | null>('pick_vault_folder');
      } catch (err) {
        console.error('Failed to pick vault folder:', err);
      }
    }
    return null;
  },

  setVaultPath: async (newPath: string): Promise<string> => {
    if (isTauriEnvironment()) {
      try {
        return await invokeTauri<string>('set_vault_path', { newPath });
      } catch (err) {
        console.error('Failed to set vault path:', err);
        throw err;
      }
    }
    return newPath;
  },

  resetVaultPath: async (): Promise<string> => {
    if (isTauriEnvironment()) {
      try {
        return await invokeTauri<string>('reset_vault_path');
      } catch (err) {
        console.error('Failed to reset vault path:', err);
        throw err;
      }
    }
    return '~/Documents/AmNotes';
  },

  openVaultInFileManager: async (): Promise<void> => {
    if (isTauriEnvironment()) {
      try {
        await invokeTauri<void>('open_vault_in_file_manager');
      } catch (err) {
        console.error('Failed to open vault folder:', err);
      }
    }
  },

  loadAllNotes: async (): Promise<Note[]> => {
    if (isTauriEnvironment()) {
      const notes = await invokeTauri<Note[]>('load_notes_from_vault');
      if (notes && notes.length > 0) {
        return notes;
      }

      // A vault with no notes is valid. The marker prevents re-seeding after
      // a user intentionally deletes every note.
      const isFreshVault = await invokeTauri<boolean>('is_vault_initialized');
      if (!isFreshVault) {
        for (const seedNote of initialAmNoteSeed) {
          await invokeTauri<void>('save_note_to_vault', { note: seedNote });
        }
        await invokeTauri<void>('mark_vault_initialized');
      }
      return notes;
    }

    // Browser preview has no authoritative vault; do not pretend saves succeeded.
    throw new Error('Vault persistence requires the AmNote desktop runtime.');
  },

  saveNote: async (note: Note, expectedContent?: string): Promise<string> => {
    if (isTauriEnvironment()) {
      return invokeTauri<string>('save_note_to_vault', {
        note,
        expectedContent,
      });
    }

    throw new Error(`Failed to save "${note.title}": Vault persistence requires the AmNote desktop runtime.`);
  },

  deleteNote: async (id: string, permanent = false): Promise<string> => {
    if (isTauriEnvironment()) {
      return invokeTauri<string>('delete_note_from_vault', { id, permanent });
    }

    throw new Error('Failed to delete note: Vault persistence requires the AmNote desktop runtime.');
  },

  loadTagMetadata: async (): Promise<TagMetadataMap> => {
    if (isTauriEnvironment()) {
      try {
        const meta = await invokeTauri<VaultMetadataPayload>('load_tag_metadata');
        return meta?.tags || {};
      } catch (err) {
        console.warn('Failed to load tag metadata from vault:', err);
        return {};
      }
    }
    return {};
  },

  saveTagMetadata: async (tags: TagMetadataMap): Promise<void> => {
    if (isTauriEnvironment()) {
      try {
        await invokeTauri<VaultMetadataPayload>('save_tag_metadata', { tags });
      } catch (err) {
        console.error('Failed to save tag metadata to vault:', err);
        throw err;
      }
    }
  },
};
