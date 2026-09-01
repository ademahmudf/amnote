export interface Note {
  id: string;
  title: string;
  content: string; // Markdown content
  contentJson?: string; // Serialized TipTap/ProseMirror JSON
  tags: string[]; // List of tag paths, e.g. ["work/release", "ideas"]
  isPinned: boolean;
  isArchived: boolean;
  isTrashed: boolean;
  isLocked?: boolean;
  lockHash?: string;
  createdAt: number; // Unix timestamp in ms
  updatedAt: number; // Unix timestamp in ms
  trashedAt?: number;
}

export type SystemFilter =
  | 'notes'
  | 'today'
  | 'todo'
  | 'untagged'
  | 'locked'
  | 'archive'
  | 'trash';

export type SortOption =
  | 'updated-desc'
  | 'updated-asc'
  | 'created-desc'
  | 'created-asc'
  | 'title-asc'
  | 'title-desc';

export interface TagNodeItem {
  name: string; // Full tag path, e.g. "work/design"
  segment: string; // Leaf segment name, e.g. "design"
  count: number;
  icon?: string;
  color?: string;
  children: Record<string, TagNodeItem>;
}

export interface NoteStats {
  words: number;
  characters: number;
  charactersNoSpaces: number;
  paragraphs: number;
  readTimeMinutes: number;
}

export interface HeadingItem {
  id: string;
  level: number;
  text: string;
}

export interface BacklinkItem {
  noteId: string;
  title: string;
  updatedAt: number;
}

export type ThemeId =
  | 'red-graphite'
  | 'red-graphite-light'
  | 'charcoal'
  | 'dieci'
  | 'solarized-dark'
  | 'solarized-light'
  | 'dracula'
  | 'nord'
  | 'sepia'
  | 'ayu-light'
  | 'ayu-mirage'
  | 'omarchy-sync'
  | 'catppuccin-mocha'
  | 'catppuccin-latte'
  | 'tokyo-night'
  | 'rose-pine'
  | 'rose-pine-dawn'
  | 'gruvbox-dark'
  | 'gruvbox-light'
  | 'everforest-dark'
  | 'everforest-light'
  | 'github-dark'
  | 'github-light'
  | 'synthwave-84';

export interface ThemeColors {
  id: ThemeId;
  name: string;
  isDark: boolean;
  sidebarBg: string;
  sidebarText: string;
  sidebarTextActive: string;
  sidebarHover: string;
  sidebarActiveBg: string;
  sidebarActiveBorder: string;
  noteListBg: string;
  noteListText: string;
  noteListCardBg: string;
  noteListCardHover: string;
  noteListCardActive: string;
  noteListCardBorder: string;
  editorBg: string;
  editorText: string;
  editorTextMuted: string;
  accent: string;
  accentHover: string;
  accentText: string;
  border: string;
  divider: string;
  codeBg: string;
  tagBg: string;
  tagText: string;
  calloutNoteBg: string;
  calloutTipBg: string;
  calloutWarnBg: string;
}
