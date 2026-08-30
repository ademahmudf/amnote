import type { Note } from '../types/note';

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
      try {
        const notes = await invokeTauri<Note[]>('load_notes_from_vault');
        if (notes && notes.length > 0) {
          return notes;
        }

        // Fresh vault on first start: seed default notes
        for (const seedNote of initialAmNoteSeed) {
          await invokeTauri<void>('save_note_to_vault', { note: seedNote });
        }
        return initialAmNoteSeed;
      } catch (err) {
        console.error('Failed to load notes from Tauri vault:', err);
      }
    }

    // In-memory / browser fallback for test suites
    return initialAmNoteSeed;
  },

  saveNote: async (note: Note): Promise<void> => {
    if (isTauriEnvironment()) {
      try {
        await invokeTauri<void>('save_note_to_vault', { note });
      } catch (err) {
        console.error('Failed to save note to Tauri vault:', err);
      }
    }
  },

  deleteNote: async (id: string, permanent = false): Promise<void> => {
    if (isTauriEnvironment()) {
      try {
        await invokeTauri<void>('delete_note_from_vault', { id, permanent });
      } catch (err) {
        console.error('Failed to delete note from Tauri vault:', err);
      }
    }
  },
};
