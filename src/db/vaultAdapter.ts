import type { Note } from '../types/note';

// Initial default seed notes for AmNote on fresh start
export const initialAmNoteSeed: Note[] = [
  {
    id: 'note-welcome-amnote',
    title: 'Welcome to AmNote',
    content: `# Welcome to AmNote 🐻

Welcome to **AmNote**, your fast, beautiful, and distraction-free Markdown note taking companion designed for **Omarchy Linux** and **macOS**.

All your notes are stored locally in **~/Documents/AmNotes** as human-readable \`.md\` files with standard YAML frontmatter!

### 🌟 Key Highlights
- **100% Native Desktop Storage**: All notes live in \`~/Documents/AmNotes/\` on your disk.
- **Nested Hierarchical Tags**: Organize with \`#guide/basics\` or \`#work/projects/2026\`.
- **Bidirectional Wiki-Links**: Link between notes using \`[[Welcome to AmNote]]\`.
- **Bear-Style Squircles**: Smooth checklists with micro-interactions.
- **Lock & Privacy**: Protect sensitive notes with optional PIN / Passwords.
- **Multiple Color Themes**: Bear Dark, One Piece, Dracula, Nord, Solarized, and Omarchy OS theme detection.

### ⚡ Useful Shortcuts
- \`Ctrl+N\`: Create a new note
- \`Ctrl+Shift+F\`: Search notes
- \`Ctrl+P\` / \`Ctrl+K\`: Command Palette
- \`Ctrl+Shift+I\`: Note Inspector & Table of Contents
- \`/\`: Insert headings, tables, checklists, callouts, and code blocks

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
