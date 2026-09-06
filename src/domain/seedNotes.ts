import type { Note } from '../types/note';
import type { VaultAdapter } from './vaultPort';

/**
 * Initial default seed notes for AmNote on fresh vault creation.
 */
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
  {
    id: 'note-search-guide',
    title: 'Searching, Daily Notes & Links',
    content: `# Searching, Daily Notes & Links

Find anything fast with the search bar at the top of the note list. These filters also work as quick-filter chips under the search box.

### 🔎 Search syntax
- \`@todo\` — notes with unchecked tasks
- \`@due\` — notes with any task due date
- \`@due:2026-09-10\` — tasks due on a specific date
- \`@overdue\` — unchecked tasks past their due date
- \`@date:2026-09-10\` — the daily note plus notes mentioning that date
- \`@today\` — notes created or modified today
- \`@pinned\` / \`@locked\` — pinned or password-protected notes
- \`#tag\` — filter by tag, e.g. \`#guide/search\`

Try it: type \`@todo\` in the search box right now.

### 📅 Daily notes & due dates
- Give any task a due date by appending \`@due(YYYY-MM-DD)\`, e.g. try it live:
- [ ] Review this guide @due(2026-09-10)
- Open a daily note from the calendar — its title is the date (\`2026-09-10\`), with links to the previous and next day at the top.
- Search \`@date:2026-09-10\` to jump back to that day's note and mentions.

### 🔗 Wiki-links
- Link notes with \`[[Welcome to AmNote]]\` or \`[[Markdown Cheatsheet]]\`.
- Type \`[[\` anywhere to get autocomplete suggestions, or create the note in one click.
- Open the Note Inspector (\`Ctrl+Shift+I\`) to see backlinks and the note outline.

### ⚡ Top shortcuts
- \`Ctrl+N\`: new note · \`Ctrl+K\`: command palette & quick search
- \`Ctrl+/\`: cheatsheet · \`Ctrl+Shift+T\`: typewriter mode · \`Ctrl+Shift+I\`: inspector

#guide/search #amnote/getting-started`,
    tags: ['guide/search', 'amnote/getting-started'],
    isPinned: false,
    isArchived: false,
    isTrashed: false,
    isLocked: false,
    createdAt: Date.now() - 1800000,
    updatedAt: Date.now() - 900000,
  },
];

/**
 * Vault Seeding Policy:
 * Checks if the vault is freshly created/uninitialized. If uninitialized,
 * populates the initial guide notes and marks the vault as initialized.
 * Returns true if seeding occurred, or false if the vault was already initialized.
 */
export async function seedVaultIfFresh(
  adapter: VaultAdapter,
  seedNotes: Note[] = initialAmNoteSeed
): Promise<boolean> {
  const isInitialized = await adapter.isInitialized();
  if (isInitialized) {
    return false;
  }

  for (const seedNote of seedNotes) {
    await adapter.saveNote(seedNote);
  }
  await adapter.markInitialized();
  return true;
}
