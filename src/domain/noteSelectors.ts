import { extractWikiLinksFromContent } from './markdownMetadata';
import { noteSearchIndex } from './searchIndex';
import type {
  BacklinkItem,
  HeadingItem,
  Note,
  NoteStats,
  SortOption,
  SystemFilter,
  TagNodeItem,
} from '../types/note';

export interface NoteFilterOptions {
  activeFilter: SystemFilter | null;
  selectedTag: string | null;
  searchQuery: string;
  sortOption: SortOption;
}

const EMPTY_STATS: NoteStats = {
  words: 0,
  characters: 0,
  charactersNoSpaces: 0,
  paragraphs: 0,
  readTimeMinutes: 0,
};

export function getActiveNote(notes: Note[], noteId: string | null): Note | undefined {
  return notes.find((note) => note.id === noteId);
}

function applySystemFilter(notes: Note[], activeFilter: SystemFilter): Note[] {
  switch (activeFilter) {
    case 'notes':
      return notes.filter((note) => !note.isArchived && !note.isTrashed);
    case 'today': {
      const startOfDay = new Date().setHours(0, 0, 0, 0);
      return notes.filter((note) => !note.isTrashed && note.updatedAt >= startOfDay);
    }
    case 'todo':
      return notes.filter((note) => !note.isTrashed && /-\s+\[ \]/i.test(note.content));
    case 'untagged':
      return notes.filter((note) => !note.isTrashed && note.tags.length === 0);
    case 'locked':
      return notes.filter((note) => !note.isTrashed && note.isLocked);
    case 'archive':
      return notes.filter((note) => !note.isTrashed && note.isArchived);
    case 'trash':
      return notes.filter((note) => note.isTrashed);
    default:
      return notes;
  }
}

function sortNotes(notes: Note[], sortOption: SortOption, activeFilter: SystemFilter | null): Note[] {
  return notes.sort((a, b) => {
    if (activeFilter !== 'trash') {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
    }

    switch (sortOption) {
      case 'updated-desc':
        return b.updatedAt - a.updatedAt;
      case 'updated-asc':
        return a.updatedAt - b.updatedAt;
      case 'created-desc':
        return b.createdAt - a.createdAt;
      case 'created-asc':
        return a.createdAt - b.createdAt;
      case 'title-asc':
        return a.title.localeCompare(b.title);
      case 'title-desc':
        return b.title.localeCompare(a.title);
      default:
        return b.updatedAt - a.updatedAt;
    }
  });
}

export function getFilteredNotes(
  notes: Note[],
  { activeFilter, selectedTag, searchQuery, sortOption }: NoteFilterOptions
): Note[] {
  noteSearchIndex.sync(notes);
  let result = [...notes];

  if (activeFilter) {
    result = applySystemFilter(result, activeFilter);
  } else if (selectedTag) {
    result = result.filter(
      (note) =>
        !note.isTrashed &&
        note.tags.some((tag) => tag === selectedTag || tag.startsWith(`${selectedTag}/`))
    );
  }

  if (searchQuery.trim()) {
    result = noteSearchIndex.search(result, searchQuery);
  }

  return sortNotes(result, sortOption, activeFilter);
}

export function getTagTree(notes: Note[]): TagNodeItem[] {
  const rootTree: Record<string, TagNodeItem> = {};

  for (const note of notes) {
    if (note.isTrashed) continue;

    for (const tagPath of note.tags) {
      const segments = tagPath.split('/').filter(Boolean);
      let currentLevel = rootTree;
      let cumulativePath = '';

      segments.forEach((segment, index) => {
        cumulativePath = cumulativePath ? `${cumulativePath}/${segment}` : segment;
        if (!currentLevel[segment]) {
          currentLevel[segment] = {
            name: cumulativePath,
            segment,
            count: 0,
            children: {},
          };
        }
        if (index === segments.length - 1) currentLevel[segment].count += 1;
        currentLevel = currentLevel[segment].children;
      });
    }
  }

  function toArray(tree: Record<string, TagNodeItem>): TagNodeItem[] {
    return Object.values(tree)
      .map((node) => ({ ...node, children: node.children }))
      .sort((a, b) => a.segment.localeCompare(b.segment));
  }

  return toArray(rootTree);
}

export function getSystemCounts(notes: Note[]): Record<SystemFilter, number> {
  const startOfDay = new Date().setHours(0, 0, 0, 0);
  return {
    notes: notes.filter((note) => !note.isArchived && !note.isTrashed).length,
    today: notes.filter((note) => !note.isTrashed && note.updatedAt >= startOfDay).length,
    todo: notes.filter((note) => !note.isTrashed && /-\s+\[ \]/i.test(note.content)).length,
    untagged: notes.filter((note) => !note.isTrashed && note.tags.length === 0).length,
    locked: notes.filter((note) => !note.isTrashed && note.isLocked).length,
    archive: notes.filter((note) => !note.isTrashed && note.isArchived).length,
    trash: notes.filter((note) => note.isTrashed).length,
  };
}

export function getBacklinks(notes: Note[], noteId: string): BacklinkItem[] {
  const targetNote = notes.find((note) => note.id === noteId);
  if (!targetNote) return [];

  return notes
    .filter((otherNote) => otherNote.id !== noteId && !otherNote.isTrashed)
    .filter((otherNote) =>
      extractWikiLinksFromContent(otherNote.content).some(
        (target) => target.toLowerCase().trim() === targetNote.title.toLowerCase().trim()
      )
    )
    .map((otherNote) => ({
      noteId: otherNote.id,
      title: otherNote.title,
      updatedAt: otherNote.updatedAt,
    }));
}

export function getNoteStats(notes: Note[], noteId: string): NoteStats {
  const note = notes.find((item) => item.id === noteId);
  if (!note) return EMPTY_STATS;

  const text = note.content.trim();
  const words = text.match(/\S+/g)?.length || 0;
  return {
    words,
    characters: text.length,
    charactersNoSpaces: text.replace(/\s+/g, '').length,
    paragraphs: text.split(/\n\n+/).filter(Boolean).length,
    readTimeMinutes: Math.max(1, Math.ceil(words / 200)),
  };
}

export function getHeadings(notes: Note[], noteId: string): HeadingItem[] {
  const note = notes.find((item) => item.id === noteId);
  if (!note) return [];

  const headings: HeadingItem[] = [];
  note.content.split('\n').forEach((line, index) => {
    const match = line.trim().match(/^(#{1,6})\s+(.*)$/);
    if (match) {
      headings.push({
        id: `heading-${index}`,
        level: match[1].length,
        text: match[2].trim(),
      });
    }
  });
  return headings;
}
