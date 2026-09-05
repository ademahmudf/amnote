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
  baseContentByNoteId?: Record<string, string>;
}

export interface VaultSyncMergeResult {
  notes: Note[];
  conflicts: VaultConflict[];
}

function normalize(text: string): string {
  return text.replace(/\r\n/g, '\n').trimEnd();
}

/**
 * Merge disk notes into the in-memory vault using 3-way conflict detection:
 * - baseContentByNoteId: The content when last loaded from or saved to disk.
 * - localNote.content: Current in-memory content (including unsaved edits).
 * - diskNote.content: Current content on disk (synced from Dropbox/external).
 *
 * A true conflict ONLY occurs when:
 * 1. The disk changed away from base (disk !== base), AND
 * 2. The local copy changed away from base (local !== base), AND
 * 3. Both changes are different (local !== disk).
 *
 * If disk === base, the disk has not changed externally. The user is just typing locally;
 * this is preserved seamlessly without creating false conflicts.
 */
export function mergeVaultNotes({
  localNotes,
  diskNotes,
  dirtyNoteIds,
  baseContentByNoteId,
}: VaultSyncMergeInput): VaultSyncMergeResult {
  const localById = new Map(localNotes.map((note) => [note.id, note]));
  const seenDiskIds = new Set<string>();
  const notes: Note[] = [];
  const conflicts: VaultConflict[] = [];

  for (const diskNote of diskNotes) {
    seenDiskIds.add(diskNote.id);
    const localNote = localById.get(diskNote.id);

    if (!localNote) {
      // New note from disk (external creation)
      notes.push(diskNote);
      continue;
    }

    if (!dirtyNoteIds[diskNote.id]) {
      // Clean locally; accept external disk updates
      notes.push(diskNote);
      continue;
    }

    const normLocal = normalize(localNote.content);
    const normDisk = normalize(diskNote.content);

    // Both sides match in content
    if (normLocal === normDisk) {
      notes.push(localNote);
      continue;
    }

    // 3-way check if base snapshot dictionary is supplied
    if (baseContentByNoteId !== undefined) {
      const rawBase = baseContentByNoteId[diskNote.id];
      if (rawBase !== undefined) {
        const normBase = normalize(rawBase);
        // If disk hasn't changed from the base snapshot, only local typing occurred!
        // Keep local changes seamlessly without conflict.
        if (normDisk === normBase) {
          notes.push(localNote);
          continue;
        }
      } else {
        // Brand new note created locally whose initial disk save landed
        notes.push(localNote);
        continue;
      }
    }

    // Both local and disk diverged from base, and they differ from each other.
    // True conflict!
    conflicts.push({
      noteId: diskNote.id,
      title: localNote.title,
      localNote,
      diskNote,
    });
    notes.push(localNote);
  }

  for (const localNote of localNotes) {
    if (seenDiskIds.has(localNote.id)) continue;

    // Note not on disk
    if (!dirtyNoteIds[localNote.id]) {
      // Clean note was deleted externally -> remove cleanly from active notes
      continue;
    }

    if (baseContentByNoteId !== undefined) {
      const rawBase = baseContentByNoteId[localNote.id];
      // Brand new note created locally that hasn't finished writing to disk yet -> preserve!
      if (rawBase === undefined) {
        notes.push(localNote);
        continue;
      }
    }

    // Was previously on disk (had baseContent) and user had unsaved edits when it disappeared on disk
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
