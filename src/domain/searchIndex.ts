import type { Note } from '../types/note';

interface IndexedNote {
  note: Note;
  terms: Map<string, number>;
  title: string;
  content: string;
  tags: string[];
}

function normalize(value: string): string {
  return value.toLowerCase();
}

function tokenize(value: string): string[] {
  return normalize(value)
    .split(/[^\p{L}\p{N}_/#+]+/u)
    .filter(Boolean);
}

function addTerm(terms: Map<string, number>, term: string, weight = 1): void {
  terms.set(term, (terms.get(term) ?? 0) + weight);
}

function matchesAllTerms(indexed: IndexedNote, terms: string[]): boolean {
  return terms.every((term) => indexed.terms.has(term));
}

function scoreDocument(indexed: IndexedNote, rawQuery: string, terms: string[]): number {
  const query = normalize(rawQuery.trim());
  let score = 0;

  const title = normalize(indexed.title);
  if (title === query) score += 1_000;
  if (title.startsWith(query)) score += 500;
  if (title.includes(query)) score += 250;

  if (indexed.tags.some((tag) => normalize(tag).includes(query))) score += 150;
  if (indexed.content.includes(query)) score += 100;

  for (const term of terms) {
    if (normalize(indexed.title).includes(term)) score += 25;
    if (indexed.tags.some((tag) => normalize(tag).includes(term))) score += 12;
    score += indexed.terms.get(term) ?? 0;
  }

  // Stable tie-breaking that favors recently changed notes.
  return score + indexed.note.updatedAt / 1e15;
}

export class NoteSearchIndex {
  private documents = new Map<string, IndexedNote>();
  private lastNotesReference: Note[] | null = null;

  sync(notes: Note[]): void {
    if (this.lastNotesReference === notes) return;

    const nextIds = new Set(notes.map((note) => note.id));
    for (const id of this.documents.keys()) {
      if (!nextIds.has(id)) this.documents.delete(id);
    }
    for (const note of notes) this.add(note);
    this.lastNotesReference = notes;
  }

  clear(): void {
    this.documents.clear();
    this.lastNotesReference = null;
  }

  add(note: Note): void {
    const terms = new Map<string, number>();
    for (const term of tokenize(note.title)) addTerm(terms, term, 3);
    for (const tag of note.tags) {
      addTerm(terms, normalize(tag), 2);
      for (const segment of tag.split('/')) addTerm(terms, normalize(segment), 1);
    }
    for (const term of tokenize(note.content)) addTerm(terms, term);

    this.documents.set(note.id, {
      note,
      terms,
      title: note.title,
      content: note.content,
      tags: note.tags,
    });
  }

  remove(id: string): void {
    this.documents.delete(id);
  }

  search(notes: Note[], query: string): Note[] {
    const trimmed = query.trim();
    if (!trimmed) return notes;

    const normalized = normalize(trimmed);
    const terms = tokenize(trimmed);
    const results: Array<{ note: Note; score: number }> = [];

    for (const note of notes) {
      const indexed = this.documents.get(note.id);
      if (!indexed) continue;

      // Tag queries retain their existing user-facing semantics.
      if (normalized.startsWith('#')) {
        const tagQuery = normalized.slice(1);
        if (indexed.tags.some((tag) => normalize(tag).includes(tagQuery))) {
          results.push({ note, score: 200 });
        }
        continue;
      }

      if (normalized === '@todo') {
        if (/-\s+\[ \]/i.test(indexed.content)) results.push({ note, score: 100 });
        continue;
      }

      if (normalized === '@pinned') {
        if (note.isPinned) results.push({ note, score: 100 });
        continue;
      }

      if (!terms.length || !matchesAllTerms(indexed, terms)) continue;
      results.push({ note, score: scoreDocument(indexed, trimmed, terms) });
    }

    return results
      .sort((a, b) => b.score - a.score || b.note.updatedAt - a.note.updatedAt)
      .map((result) => result.note);
  }
}

export const noteSearchIndex = new NoteSearchIndex();
