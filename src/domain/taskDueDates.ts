import type { Note } from '../types/note';
import { isValidISODate, todayISO } from './calendarDates';

export interface TaskDueItem {
  noteId: string;
  noteTitle: string;
  text: string;
  dueDate: string;
  checked: boolean;
  lineIndex: number;
}

export interface TaskDueQueryResult {
  notes: Note[];
  tasks: TaskDueItem[];
}

const TASK_ITEM_PATTERN = /^([ \t]*)(?:[-*+]|\d+[.)])\s+\[([ xX])\]\s+(.*)$/;
const DUE_TOKEN_PATTERN = /(\s+)?@due\((\d{4}-\d{2}-\d{2})\)/i;

export function formatDueDate(iso: string): string {
  if (!isValidISODate(iso)) return iso;
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: Number.isFinite(year) && year !== new Date().getFullYear() ? 'numeric' : undefined,
  });
}

function parseTaskLine(line: string): { text: string; checked: boolean } | null {
  const match = line.match(TASK_ITEM_PATTERN);
  if (!match) return null;
  return { text: match[3], checked: match[2].toLowerCase() === 'x' };
}

export function getTaskTextWithoutDue(text: string): string {
  return text
    .replace(/(\s+)?@due\(\d{4}-\d{2}-\d{2}\)/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function parseTaskDueItems(note: Note): TaskDueItem[] {
  const items: TaskDueItem[] = [];

  note.content.split(/\r?\n/).forEach((line, lineIndex) => {
    const task = parseTaskLine(line);
    if (!task) return;

    const match = task.text.match(DUE_TOKEN_PATTERN);
    const dueDate = match?.[2];
    if (!dueDate || !isValidISODate(dueDate)) return;

    items.push({
      noteId: note.id,
      noteTitle: note.title,
      text: getTaskTextWithoutDue(task.text),
      dueDate,
      checked: task.checked,
      lineIndex,
    });
  });

  return items;
}

export function getDueTasks(notes: Note[]): TaskDueItem[] {
  return notes
    .filter((note) => !note.isTrashed && !note.isArchived)
    .flatMap(parseTaskDueItems)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.lineIndex - b.lineIndex);
}

export function getTasksDueOn(notes: Note[], iso: string): TaskDueItem[] {
  if (!isValidISODate(iso)) return [];
  return getDueTasks(notes).filter((task) => task.dueDate === iso);
}

export function isTaskOverdue(task: TaskDueItem, today: string = todayISO()): boolean {
  return !task.checked && task.dueDate < today;
}

export function getOverdueTasks(notes: Note[], today: string = todayISO()): TaskDueItem[] {
  return getDueTasks(notes).filter((task) => isTaskOverdue(task, today));
}

export function findNotesWithDueTasks(notes: Note[]): Note[] {
  const taskNoteIds = new Set(getDueTasks(notes).map((task) => task.noteId));
  return notes.filter((note) => taskNoteIds.has(note.id));
}

export function setTaskDueToken(taskText: string, dueDate: string | null): string {
  if (dueDate === null) {
    return getTaskTextWithoutDue(taskText);
  }

  const stripped = getTaskTextWithoutDue(taskText);
  return stripped ? `${stripped} @due(${dueDate})` : `@due(${dueDate})`;
}
