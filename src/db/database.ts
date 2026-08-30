import Dexie, { type Table } from 'dexie';
import type { Note } from '../types/note';

export class BearNoteDatabase extends Dexie {
  notes!: Table<Note, string>;

  constructor() {
    super('BearNoteAppDB');
    this.version(1).stores({
      notes: 'id, title, isPinned, isArchived, isTrashed, isLocked, createdAt, updatedAt, *tags',
    });
  }
}

export const db = new BearNoteDatabase();

// Helper to extract nested tags from markdown content: #tag or #nested/tag/deep or #[[spaced tag]]#
export function extractTagsFromContent(content: string): string[] {
  const tagsSet = new Set<string>();
  
  // 1. Spaced tags: #[[tag name]]# or #tag name#
  const bracketTagRegex = /#\[\[([^\]]+)\]\]#/g;
  let match: RegExpExecArray | null;
  while ((match = bracketTagRegex.exec(content)) !== null) {
    const clean = match[1].trim().toLowerCase().replace(/\s+/g, '-');
    if (clean) tagsSet.add(clean);
  }

  // 2. Standard nested tags: #tag or #category/subcategory/item
  // Must be preceded by space or start of line, not immediately followed by # or numeric-only
  const standardTagRegex = /(?:^|\s)#([a-zA-Z0-9_\-\/]+)(?=\s|$|[.,!?;:])/g;
  while ((match = standardTagRegex.exec(content)) !== null) {
    const tag = match[1].trim().toLowerCase();
    if (tag && !/^\d+$/.test(tag) && !tag.startsWith('/')) {
      tagsSet.add(tag);
    }
  }

  return Array.from(tagsSet);
}

// Helper to extract wiki-links: [[Note Title]]
export function extractWikiLinksFromContent(content: string): string[] {
  const linksSet = new Set<string>();
  const linkRegex = /\[\[([^\]]+)\]\]/g;
  let match: RegExpExecArray | null;
  while ((match = linkRegex.exec(content)) !== null) {
    const title = match[1].trim();
    if (title) linksSet.add(title);
  }
  return Array.from(linksSet);
}

// Initial seed notes for a rich Bear experience on Omarchy
export const SEED_NOTES: Note[] = [
  {
    id: 'note-welcome',
    title: 'Welcome to Bear for Omarchy Linux',
    content: `# Welcome to Bear for Omarchy Linux

An elegant, privacy-first, blazing-fast Markdown note-taking app crafted natively for **Omarchy Linux** (Arch + Hyprland + Wayland).

## 🌟 The 3-Pane Bear Experience
- **Left Pane (Sidebar)**: Toggle with \`Ctrl+1\`. View system filters (*Notes, Today, Todo, Trash*) and your hierarchical **#tag/subtag** tree.
- **Middle Pane (Note List)**: Toggle with \`Ctrl+2\`. Instant search, sort by modified/created/title, pinned notes.
- **Right Pane (Editor Canvas)**: Toggle with \`Ctrl+3\` or enter **Focus / Zen Mode** with \`F11\`.

## 🏷 Nested Tags & Organization
Type tags anywhere in your text! Tags automatically index into a nested hierarchy:
- #welcome
- #guide/basics
- #guide/shortcuts
- #omarchy/hyprland

## 📝 Hybrid Live Markdown
Bear combines raw markdown speed with rich typography. Click anywhere to edit, format with the floating toolbar, or type \`/\` for quick slash commands:
- [x] Live interactive task checkboxes
- [x] Syntax-highlighted code blocks
- [x] Tables and callouts
- [ ] Try linking notes with [[Markdown Cheatsheet]]

Enjoy writing in peace!`,
    tags: ['welcome', 'guide/basics', 'guide/shortcuts', 'omarchy/hyprland'],
    isPinned: true,
    isArchived: false,
    isTrashed: false,
    isLocked: false,
    createdAt: Date.now() - 3600000 * 24 * 3,
    updatedAt: Date.now() - 3600000 * 2,
  },
  {
    id: 'note-cheatsheet',
    title: 'Markdown Cheatsheet & Formatting',
    content: `# Markdown Cheatsheet & Formatting

Bear supports standard and extended Markdown syntax with live visual rendering.

## Typography & Inline Styling
- **Bold text** with \`**bold**\`
- *Italic text* with \`*italic*\`
- ~~Strikethrough~~ with \`~~strikethrough~~\`
- ==Highlighted text== with \`==highlight==\`
- \`Inline code\` with backticks
- [Omarchy Linux Website](https://omarchy.org/) with links

## Interactive Task Lists
- [x] Explore Bear 3-pane layout
- [x] Switch between dark & light themes
- [ ] Customize font family and line spacing
- [ ] Export note as Markdown or HTML

## Code Blocks with Syntax Highlighting
\`\`\`rust
// Fast Rust SQLite Backend
fn search_notes(query: &str) -> Result<Vec<Note>, rusqlite::Error> {
    let conn = Connection::open("notes.db")?;
    let mut stmt = conn.prepare("SELECT rowid, title FROM notes_fts WHERE notes_fts MATCH ?")?;
    println!("Searching for: {}", query);
    Ok(vec![])
}
\`\`\`

## Markdown Tables
| Feature | Bear 2 | Omarchy Bear | Status |
| :--- | :--- | :--- | :--- |
| Live Markdown | Yes | Yes | ✅ Full Support |
| Nested Tags | Yes | Yes | ✅ Unlimited Depth |
| Omarchy Theme Sync | No | Yes | 🚀 Exclusive |
| FTS5 Full-Text Search | Yes | Yes | ⚡ Sub-millisecond |

## Callouts & Blockquotes
> [!NOTE]
> All notes are stored locally on your machine with full privacy and zero tracking.

> [!TIP]
> Press \`Ctrl+K\` anytime to open the global Command Palette!

#guide/markdown #cheatsheet #reference`,
    tags: ['guide/markdown', 'cheatsheet', 'reference'],
    isPinned: true,
    isArchived: false,
    isTrashed: false,
    isLocked: false,
    createdAt: Date.now() - 3600000 * 24 * 2,
    updatedAt: Date.now() - 3600000 * 5,
  },
  {
    id: 'note-omarchy-integration',
    title: 'Omarchy Desktop & Hyprland Integration',
    content: `# Omarchy Desktop & Hyprland Integration

This app is tailored to integrate harmoniously with your **Omarchy Arch Linux** workflow.

## 🎨 Real-Time Theme Syncing
The app can automatically detect and mirror your active Omarchy desktop theme:
- **One Piece** (Default Omarchy Theme)
- **Catppuccin** & **Catppuccin Latte**
- **Tokyo Night**
- **Nord**
- **Gruvbox**
- **Everforest** & **Rose Pine**

You can also choose signature Bear themes like **Red Graphite**, **Solarized**, **Charcoal**, or **Sepia** in the theme selector at the bottom left!

## 🪟 Hyprland Scratchpad & Window Rules
To make this note app accessible instantly anywhere across your Hyprland workspaces as a scratchpad, add this rule to \`~/.config/hypr/looknfeel.lua\` or \`bindings.lua\`:

\`\`\`lua
-- Scratchpad note capture popup
o.bind("SUPER SHIFT", "N", function()
  hl.exec("omarchy-note-app --scratchpad")
end)
\`\`\`

## ⌨️ Essential Keyboard Shortcuts
- \`Ctrl + N\` : New Note
- \`Ctrl + K\` / \`Ctrl + Shift + F\` : Command Palette
- \`Ctrl + 1\` : Toggle Tag Sidebar
- \`Ctrl + 2\` : Toggle Note List
- \`Ctrl + 3\` / \`F11\` : Focus / Zen Mode
- \`Ctrl + Shift + I\` : Toggle Document Info & Table of Contents
- \`Ctrl + D\` : Duplicate Active Note

#omarchy/hyprland #omarchy/themes #tips`,
    tags: ['omarchy/hyprland', 'omarchy/themes', 'tips'],
    isPinned: false,
    isArchived: false,
    isTrashed: false,
    isLocked: false,
    createdAt: Date.now() - 3600000 * 24 * 1,
    updatedAt: Date.now() - 3600000 * 12,
  },
  {
    id: 'note-project-roadmap',
    title: 'Project Roadmap & Sprint Goals',
    content: `# Project Roadmap & Sprint Goals

Milestones and action items for the upcoming product release.

## 🎯 Sprint Objectives
- [x] Design 3-pane responsive layout with resizable splitters
- [x] Build nested tag parser supporting #work/sprint/q3
- [x] Implement dynamic Table of Contents outline
- [ ] Connect SQLite FTS5 backend
- [ ] Add PDF and HTML document exporter

## 📅 Milestones
1. **Alpha Launch**: Core editor with tag management and search
2. **Beta Launch**: Wiki-link graph indexing and backlinks
3. **v1.0 Release**: Native Tauri package for Arch Linux / Omarchy

Related references: [[Welcome to Bear for Omarchy Linux]] and [[Markdown Cheatsheet & Formatting]].

#work/roadmap #work/sprint/q3 #projects`,
    tags: ['work/roadmap', 'work/sprint/q3', 'projects'],
    isPinned: false,
    isArchived: false,
    isTrashed: false,
    isLocked: false,
    createdAt: Date.now() - 3600000 * 18,
    updatedAt: Date.now() - 3600000 * 1,
  },
  {
    id: 'note-ideas',
    title: 'Product Ideas & Inspiring Features',
    content: `# Product Ideas & Inspiring Features

Brainstorming creative additions for next-level productivity:

- **Audio memos**: Record quick voice notes with automatic transcription
- **Graph View**: Visual network of interconnected notes and tags
- **Encrypted Vaults**: Password-protected private notes with AES-256
- **Web Clipper**: Save browser articles directly into formatted markdown notes

#ideas/features #ideas/future #brainstorm`,
    tags: ['ideas/features', 'ideas/future', 'brainstorm'],
    isPinned: false,
    isArchived: false,
    isTrashed: false,
    isLocked: false,
    createdAt: Date.now() - 3600000 * 30,
    updatedAt: Date.now() - 3600000 * 8,
  },
];

// Initialize database with seed notes if empty
export async function initializeDatabase(): Promise<void> {
  const count = await db.notes.count();
  if (count === 0) {
    await db.notes.bulkAdd(SEED_NOTES);
  }
}
