import type { Note } from '../types/note';

export interface VaultConflict {
  noteId: string;
  title: string;
  localNote: Note;
  diskNote?: Note;
}

export interface VaultSyncMergeInput {
  localNotes: Note[];
  diskNotes: Note[];
  dirtyNoteIds: Record<string, true>;
}

export interface VaultSyncMergeResult {
  notes: Note[];
  conflicts: VaultConflict[];
}

/**
 * Merge disk notes into the in-memory vault without discarding unsaved work.
 * Dirty notes whose disk content has diverged become explicit conflicts.
 */
export function mergeVaultNotes({
  localNotes,
  diskNotes,
  dirtyNoteIds,
}: VaultSyncMergeInput): VaultSyncMergeResult {
  const localById = new Map(localNotes.map((note) => [note.id, note]));
  const seenDiskIds = new Set<string>();
  const notes: Note[] = [];
  const conflicts: VaultConflict[] = [];

  for (const diskNote of diskNotes) {
    seenDiskIds.add(diskNote.id);
    const localNote = localById.get(diskNote.id);

    if (!localNote) {
      notes.push(diskNote);
      continue;
    }

    if (!dirtyNoteIds[diskNote.id]) {
      notes.push(diskNote);
      continue;
    }

    if (localNote.content === diskNote.content) {
      // Content is identical; preserve in-memory metadata because it may be newer.
      notes.push(localNote);
      continue;
    }

    conflicts.push({
      noteId: diskNote.id,
      title: localNote.title,
      localNote,
      diskNote,
    });
    notes.push(localNote);
  }

  for (const localNote of localNotes) {
    if (seenDiskIds.has(localNote.id) || !dirtyNoteIds[localNote.id]) continue;

    conflicts.push({
      noteId: localNote.id,
      title: localNote.title,
      localNote,
    });
    notes.push(localNote);
  }

  notes.sort((a, b) => b.updatedAt - a.updatedAt);
  return { notes, conflicts };
}
